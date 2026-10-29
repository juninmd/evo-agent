import axios, { type AxiosError } from "axios";
import Parser from "rss-parser";
import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { HTTP_LIMITS } from "../utils/http-limits.js";
import { log } from "../utils/logger.js";
import { summarizeSourceContent } from "./feed-items.js";

const parser = new Parser();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RedditComment {
  body: string;
  score: number;
  depth: number;
}

interface RedditCommentNode {
  kind?: string;
  data?: {
    body?: string;
    score?: number;
    author?: string;
    replies?: string | RedditListing;
  };
}

interface RedditListing {
  data?: {
    children?: RedditCommentNode[];
  };
}

interface RedditPostCandidate {
  subreddit: string;
  title: string;
  url: string;
  summary: string;
}

const REDDIT_COMMUNITY_SUBREDDITS = [
  // IA/LLM Core
  "LocalLLaMA",
  "MachineLearning",
  "OpenAI",
  "ClaudeAI",
  "ClaudeCode",
  "ChatGPTCoding",
  "LLMDevs",
  "AI_Agents",
  "AgenticAI",
  "LangChain",
  "ollama",
  "artificial",
  "singularity",
  "ChatGPT",
  "ArtificialIntelligence",
  "deeplearning",
  "MLQuestions",
  "StableDiffusion",
  "comfyui",
  "SoraAi",
  // Development tools com IA
  "Cursor",
  "CursorIDE",
  "WindsurfAI",
  "GithubCopilot",
  "codex",
  "vscode",
  "vibecoding",
  "kilocode",
  "opencode",
  "MCP",
  // Linguagens de programação (foco em IA/agents)
  "Python",
  "TypeScript",
  "node",
  "golang",
  "rust",
  // IA/ML específicos
  "neuralnetworks",
  "LanguageModels",
  "Tensorflow",
  "learnmachinelearning",
  "reinforcementlearning",
  "datascience",
  // Development & Tools
  "learnprogramming",
  "coding",
];

/**
 * Communities the editions must cover every day. They are crawled by "top of the
 * week" on top of the usual "new" feed so the best recent posts are collected,
 * not only whatever happened to be posted last.
 */
const REDDIT_FOCUS_SUBREDDITS = new Set([
  "ClaudeCode",
  "codex",
  "vscode",
  "GithubCopilot",
]);

export const REDDIT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REDDIT_POSTS_PER_SUBREDDIT = 12;
const REDDIT_FOCUS_POSTS_PER_SUBREDDIT = 20;
/**
 * Comments cost one request per post, which is what exhausts the rate limit.
 * Only the top slice of each feed is enriched; the remaining posts still reach
 * the edition as post signals, for free.
 */
const REDDIT_COMMENT_POSTS_PER_SUBREDDIT = 4;
const REDDIT_FOCUS_COMMENT_POSTS_PER_SUBREDDIT = 8;
const REDDIT_SORTS: ("top" | "new")[] = ["top", "new"];
const REDDIT_COMMENTS_PER_POST = 30;
const REDDIT_MIN_COMMENT_SCORE = 3;
const REDDIT_MIN_COMMENT_LENGTH = 80;
/** Reddit throttles by IP, so the focus feeds wait it out instead of giving up. */
const REDDIT_FOCUS_RETRY_DELAYS_MS = [30_000, 60_000, 120_000];
const REDDIT_RATE_LIMIT_DEFAULT_RETRY_MS = 3000;
const REDDIT_RATE_LIMIT_MAX_RETRY_MS = 60000;
/**
 * O 429 anonimo do Reddit nao traz `retry-after`; traz `x-ratelimit-remaining: 0`
 * e `x-ratelimit-reset` em segundos (medido: 7-15s). O retry cego de 3s batia
 * antes da janela reabrir e a fonte era perdida pelo resto do ciclo, inclusive
 * as comunidades que o gate editorial exige.
 */
const REDDIT_RATE_LIMIT_RETRIES = 2;
/** Spacing every call keeps the crawl under the anonymous per-IP budget. */
const REDDIT_MIN_REQUEST_INTERVAL_MS = 1100;
/** A throttled community is skipped after this pause instead of killing the run. */
const REDDIT_SUBREDDIT_COOLDOWN_MS = 20_000;
const REDDIT_MAX_CONSECUTIVE_RATE_LIMITS = 3;
/**
 * Reddit answers 403 to the post `.json` endpoint from datacenter IPs, so every
 * comment fetch burns the shared per-IP budget for nothing and pushes the RSS
 * feeds into 429. Comments stay behind a flag until the endpoint works again.
 */
const REDDIT_COMMENTS_ENABLED = process.env.REDDIT_COMMENTS_ENABLED === "true";
/** Hourly crawls never let the per-IP budget recover between sweeps. */
const REDDIT_SIGNALS_MIN_INTERVAL_HOURS = 6;
const REDDIT_SIGNALS_LAST_RUN_KEY = "reddit_signals_last_run";
/** Where the previous capped sweep stopped in the non-focus tail. */
const REDDIT_SIGNALS_CURSOR_KEY = "reddit_signals_cursor";
/** The sweep must end well inside the 1h crawl job; a pass at 1.1s per request does not. */
const REDDIT_SWEEP_BUDGET_MS = 20 * 60_000;

export function redditSweepOutOfTime(startedAt: number, now = Date.now()) {
  return now - startedAt >= REDDIT_SWEEP_BUDGET_MS;
}
/**
 * A manual/ad-hoc crawl run minutes after the hourly cron re-hits Reddit with
 * a cold per-process rate limiter, burning the still-throttled per-IP budget
 * for articles that were just fetched and trips the circuit breaker for
 * hours. Gate each Reddit feed source independently of the RSS-parser flow
 * used by non-Reddit sources.
 */
export const REDDIT_FEED_MIN_INTERVAL_MINUTES = 20;

export class RedditRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(`Reddit rate limit persisted after retry (${retryAfterMs}ms)`);
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isUsefulComment(comment: RedditComment): boolean {
  const body = comment.body.toLowerCase();
  return (
    comment.score >= REDDIT_MIN_COMMENT_SCORE &&
    comment.body.length >= REDDIT_MIN_COMMENT_LENGTH &&
    body !== "[deleted]" &&
    body !== "[removed]" &&
    !body.startsWith("i am a bot")
  );
}

function isUsefulRedditPost(title: string): boolean {
  const normalized = title.toLowerCase();
  const lowSignalPatterns = [
    "drop your projects",
    "share what you're working on",
    "share what you are working on",
    "shout out",
    "shoutout",
    "instagram",
  ];
  return !lowSignalPatterns.some((pattern) => normalized.includes(pattern));
}

function flattenComments(
  listing: RedditListing | undefined,
  depth = 0,
): RedditComment[] {
  const children = listing?.data?.children ?? [];
  const comments: RedditComment[] = [];

  for (const child of children) {
    if (child.kind !== "t1" || !child.data?.body) continue;

    comments.push({
      body: normalizeText(child.data.body),
      score: child.data.score ?? 0,
      depth,
    });

    if (typeof child.data.replies === "object") {
      comments.push(...flattenComments(child.data.replies, depth + 1));
    }
  }

  return comments;
}

function redditJsonUrl(postUrl: string): string {
  const cleanUrl = postUrl.split("?")[0].replace(/\/$/, "");
  return `${cleanUrl}.json?limit=50&depth=3&sort=top`;
}

function signalUrl(postUrl: string): string {
  return `${postUrl.split("#")[0]}#community-signals`;
}

function buildCommunitySignalSummary(
  post: RedditPostCandidate,
  comments: RedditComment[],
): string {
  const topComments = comments
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((comment) => {
      const body =
        comment.body.length > 220
          ? `${comment.body.slice(0, 217).trim()}...`
          : comment.body;
      return `score ${comment.score}: ${body}`;
    });

  const positiveCount = comments.filter((comment) => comment.score > 0).length;
  return normalizeText(
    [
      `Sinais da comunidade em r/${post.subreddit} sobre "${post.title}".`,
      `Comentarios uteis analisados: ${comments.length}.`,
      `Comentarios com score positivo: ${positiveCount}.`,
      `Top comments: ${topComments.join(" | ")}`,
    ].join(" "),
  ).slice(0, 2600);
}

function buildRedditPostSignalSummary(post: RedditPostCandidate): string {
  return normalizeText(
    [
      `Post da comunidade em r/${post.subreddit} sobre "${post.title}".`,
      "Relato do autor, sem os comentarios da discussao.",
      post.summary,
    ].join(" "),
  ).slice(0, 1200);
}

function retryAfterMs(value: unknown): number | null {
  // Cabecalho HTTP chega como string, mas alguns clientes ja entregam numero.
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value * 1000 : null;
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

/**
 * `retry-after` tem precedencia; na ausencia dele vale o `x-ratelimit-reset`, que
 * e o unico cabecalho que o Reddit manda no 429 anonimo.
 */
export function redditRateLimitDelayMs(
  value: unknown,
  resetSeconds?: unknown,
): number {
  return Math.min(
    retryAfterMs(value) ??
      retryAfterMs(resetSeconds) ??
      REDDIT_RATE_LIMIT_DEFAULT_RETRY_MS,
    REDDIT_RATE_LIMIT_MAX_RETRY_MS,
  );
}

/**
 * Com o orcamento anonimo esgotado, `x-ratelimit-reset` diz quantos segundos
 * faltam para reabrir. Devolve null quando ainda ha orcamento, para o ritmo
 * normal do crawler continuar valendo.
 */
export function redditBudgetDelayMs(
  headers: Record<string, unknown> | undefined,
): number | null {
  const remaining = Number(headers?.["x-ratelimit-remaining"]);
  if (!Number.isFinite(remaining) || remaining > 0) return null;
  const reset = retryAfterMs(headers?.["x-ratelimit-reset"]);
  return reset === null
    ? null
    : Math.min(reset, REDDIT_RATE_LIMIT_MAX_RETRY_MS);
}

function isRedditRateLimit(err: unknown): err is AxiosError {
  return axios.isAxiosError(err) && err.response?.status === 429;
}

export function isRedditSource(source: {
  url: string;
  tags: string[];
}): boolean {
  return source.url.includes("reddit.com") || source.tags.includes("reddit");
}

let redditNextRequestAt = 0;

/**
 * Serializes Reddit calls to one every REDDIT_MIN_REQUEST_INTERVAL_MS. The slot
 * is reserved before awaiting, so callers queue up instead of all firing after
 * the same wait.
 */
async function redditPace(now = Date.now()): Promise<void> {
  const waitMs = redditNextRequestAt - now;
  redditNextRequestAt =
    Math.max(now, redditNextRequestAt) + REDDIT_MIN_REQUEST_INTERVAL_MS;
  if (waitMs > 0) await sleep(waitMs);
}

export async function redditGet<T = unknown>(
  url: string,
  config: Parameters<typeof axios.get>[1],
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await redditPace();
    try {
      const response = await axios.get<T>(url, {
        ...HTTP_LIMITS,
        ...config,
      });
      noteRedditBudget(response.headers);
      return response.data;
    } catch (err) {
      if (!isRedditRateLimit(err)) throw err;
      const headers = err.response?.headers as
        | Record<string, unknown>
        | undefined;
      const retryAfter = headers?.["retry-after"];
      const resetSeconds = headers?.["x-ratelimit-reset"];
      if (attempt >= REDDIT_RATE_LIMIT_RETRIES) {
        throw new RedditRateLimitError(
          redditRateLimitDelayMs(retryAfter, resetSeconds),
        );
      }
      const delayMs = jitterDelay(
        redditRateLimitDelayMs(retryAfter, resetSeconds),
      );
      // Reserva a janela inteira: sem isto as fontes seguintes repetiriam a
      // mesma colisao, uma atras da outra.
      noteRedditBudget(headers);
      log.warn(
        `Reddit rate limited; retry ${attempt + 1}/${REDDIT_RATE_LIMIT_RETRIES} in ${delayMs}ms`,
      );
      await sleep(delayMs);
    }
  }
}

/**
 * Quando o Reddit diz que o orcamento anonimo acabou, empurra o proximo pedido
 * para depois da janela. Sem isto o ritmo de 1,1s segue batendo em 429: medido,
 * o reset fica entre 7 e 15s.
 */
function noteRedditBudget(headers: Record<string, unknown> | undefined): void {
  const delay = redditBudgetDelayMs(headers);
  if (delay === null) return;
  redditNextRequestAt = Math.max(redditNextRequestAt, Date.now() + delay);
}

/** ±20% jitter so parallel sources don't retry in lockstep. */
function jitterDelay(ms: number): number {
  return Math.round(ms * (0.8 + Math.random() * 0.4));
}

async function getRedditPostCandidates(
  subreddit: string,
  sort: "new" | "top" = "new",
): Promise<RedditPostCandidate[]> {
  const limit = REDDIT_FOCUS_SUBREDDITS.has(subreddit)
    ? REDDIT_FOCUS_POSTS_PER_SUBREDDIT
    : REDDIT_POSTS_PER_SUBREDDIT;
  const data = await redditGet<string>(
    `https://www.reddit.com/r/${subreddit}/${sort}/.rss${sort === "top" ? "?t=week" : ""}`,
    {
      headers: {
        Accept: "application/atom+xml, application/xml",
        "User-Agent": REDDIT_USER_AGENT,
      },
      timeout: 8000,
    },
  );
  const feed = await parser.parseString(data);

  return feed.items.slice(0, limit).flatMap((item) => {
    if (!item.title || !item.link) return [];
    if (!isUsefulRedditPost(item.title)) return [];
    const summary = summarizeSourceContent(
      item.contentSnippet ?? item.content ?? "",
      1000,
    );
    return [{ subreddit, title: item.title, url: item.link, summary }];
  });
}

async function getRedditComments(postUrl: string): Promise<RedditComment[]> {
  const data = await redditGet<unknown[]>(redditJsonUrl(postUrl), {
    headers: { "User-Agent": REDDIT_USER_AGENT },
    timeout: 8000,
  });
  const listing = data?.[1] as RedditListing | undefined;
  return flattenComments(listing)
    .filter(isUsefulComment)
    .sort((a, b) => b.score - a.score)
    .slice(0, REDDIT_COMMENTS_PER_POST);
}

/** Shared by every focus feed of a run: a blocked IP must not sleep through the job deadline. */
const REDDIT_FOCUS_WAIT_BUDGET_MS = 240_000;
let focusWaitedMs = 0;

export function focusRetryDelayMs(
  attempt: number,
  waitedMs = 0,
): number | null {
  const delay = REDDIT_FOCUS_RETRY_DELAYS_MS[attempt];
  if (delay === undefined) return null;
  return waitedMs + delay <= REDDIT_FOCUS_WAIT_BUDGET_MS ? delay : null;
}

async function getFocusPostCandidates(
  subreddit: string,
  sort: "new" | "top",
): Promise<RedditPostCandidate[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getRedditPostCandidates(subreddit, sort);
    } catch (err) {
      const delay =
        err instanceof RedditRateLimitError
          ? focusRetryDelayMs(attempt, focusWaitedMs)
          : null;
      if (delay === null) throw err;
      const jittered = jitterDelay(delay);
      focusWaitedMs += jittered;
      log.warn(
        `Reddit rate limited on focus r/${subreddit}; waiting ${jittered}ms before retry ${attempt + 1}`,
      );
      await sleep(jittered);
    }
  }
}

/** Focus first, always; `offset` rotates the rest so a capped sweep moves along. */
export function orderedCommunitySubreddits(offset = 0): string[] {
  const rest = REDDIT_COMMUNITY_SUBREDDITS.filter(
    (subreddit) => !REDDIT_FOCUS_SUBREDDITS.has(subreddit),
  );
  const start = rest.length === 0 ? 0 : offset % rest.length;
  return [
    ...REDDIT_COMMUNITY_SUBREDDITS.filter((subreddit) =>
      REDDIT_FOCUS_SUBREDDITS.has(subreddit),
    ),
    ...rest.slice(start),
    ...rest.slice(0, start),
  ];
}

export interface SubredditPlan {
  subreddit: string;
  focus: boolean;
  /** Posts kept per community, across every sort. */
  postLimit: number;
  /** How many of those posts get their comment thread fetched. */
  commentLimit: number;
}

export function subredditPlan(subreddit: string): SubredditPlan {
  const focus = REDDIT_FOCUS_SUBREDDITS.has(subreddit);
  return {
    subreddit,
    focus,
    postLimit: focus
      ? REDDIT_FOCUS_POSTS_PER_SUBREDDIT
      : REDDIT_POSTS_PER_SUBREDDIT,
    commentLimit: focus
      ? REDDIT_FOCUS_COMMENT_POSTS_PER_SUBREDDIT
      : REDDIT_COMMENT_POSTS_PER_SUBREDDIT,
  };
}

function saveCommunitySignal(
  post: RedditPostCandidate,
  url: string,
  comments: RedditComment[],
): void {
  const topScore = comments[0]?.score ?? 0;
  db.saveArticle({
    title: `Discussao: ${post.title}`,
    source: `Reddit Community Signals (${post.subreddit})`,
    url,
    summary: buildCommunitySignalSummary(post, comments),
    tags: JSON.stringify([
      "reddit",
      "community-signals",
      post.subreddit.toLowerCase(),
    ]),
    engagement_score:
      topScore +
      comments.reduce((sum, comment) => sum + Math.max(comment.score, 0), 0),
  });
}

/** Saves a post without its discussion. Returns false when it carries no text. */
function savePostSignal(post: RedditPostCandidate, url: string): boolean {
  if (post.summary.length < REDDIT_MIN_COMMENT_LENGTH) return false;
  db.saveArticle({
    title: `Reddit: ${post.title}`,
    source: `Reddit Post Signals (${post.subreddit})`,
    url,
    summary: buildRedditPostSignalSummary(post),
    tags: JSON.stringify([
      "reddit",
      "post-signals",
      post.subreddit.toLowerCase(),
    ]),
    engagement_score: 0,
  });
  return true;
}

async function collectPostCandidates(
  plan: SubredditPlan,
): Promise<{ posts: RedditPostCandidate[]; throttled: boolean }> {
  const byUrl = new Map<string, RedditPostCandidate>();
  let throttled = false;

  // "top" first: with the comment budget capped, the enriched slots should go to
  // the best posts of the week, not to whatever was posted in the last minutes.
  for (const sort of REDDIT_SORTS) {
    try {
      const candidates = plan.focus
        ? await getFocusPostCandidates(plan.subreddit, sort)
        : await getRedditPostCandidates(plan.subreddit, sort);
      for (const post of candidates) {
        if (!byUrl.has(post.url)) byUrl.set(post.url, post);
      }
    } catch (err) {
      if (err instanceof RedditRateLimitError) {
        throttled = true;
        break;
      }
      log.warn(
        `Reddit ${sort} feed failed for r/${plan.subreddit}: ${(err as Error).message}`,
      );
    }
  }

  return { posts: [...byUrl.values()].slice(0, plan.postLimit), throttled };
}

export function redditSignalsDue(
  lastRun: string | null,
  now = new Date(),
): boolean {
  if (!lastRun) return true;
  const elapsedMs = now.getTime() - Date.parse(lastRun);
  if (!Number.isFinite(elapsedMs)) return true;
  return elapsedMs >= REDDIT_SIGNALS_MIN_INTERVAL_HOURS * 3600_000;
}

export function redditFeedAttemptKey(sourceName: string): string {
  return `reddit.feed.last_attempt.${sourceName}`;
}

export function redditFeedDue(
  lastAttempt: string | null,
  now = new Date(),
): boolean {
  if (!lastAttempt) return true;
  const elapsedMs = now.getTime() - Date.parse(lastAttempt);
  if (!Number.isFinite(elapsedMs)) return true;
  return elapsedMs >= REDDIT_FEED_MIN_INTERVAL_MINUTES * 60_000;
}

export async function crawlRedditCommunitySignals(): Promise<number> {
  if (!redditSignalsDue(db.getState(REDDIT_SIGNALS_LAST_RUN_KEY))) {
    log.info(
      `Reddit community signals skipped: last run under ${REDDIT_SIGNALS_MIN_INTERVAL_HOURS}h ago`,
    );
    return 0;
  }

  let newCount = 0;
  let consecutiveRateLimits = 0;
  focusWaitedMs = 0;
  const sweepStartedAt = Date.now();
  const cursor = Number(db.getState(REDDIT_SIGNALS_CURSOR_KEY)) || 0;
  let tailVisited = 0;

  // Reddit throttles by IP, so the focus communities are collected before
  // anything else instead of after 40 other subreddits.
  for (const subreddit of orderedCommunitySubreddits(cursor)) {
    if (redditSweepOutOfTime(sweepStartedAt)) {
      log.warn(
        "Reddit sweep hit its time budget; the rest resumes on the next sweep",
      );
      break;
    }
    const plan = subredditPlan(subreddit);
    if (!plan.focus) tailVisited++;
    const collected = await collectPostCandidates(plan);
    let throttled = collected.throttled;
    if (throttled) {
      log.warn(`Reddit feed rate limit persisted for r/${subreddit}`);
    }
    let enriched = 0;

    for (const post of collected.posts) {
      const url = signalUrl(post.url);
      if (db.urlExists(url)) continue;

      // Past the comment budget the post is still worth publishing; it just goes
      // in without the discussion instead of costing another request.
      if (
        throttled ||
        !REDDIT_COMMENTS_ENABLED ||
        enriched >= plan.commentLimit
      ) {
        if (savePostSignal(post, url)) newCount++;
        continue;
      }

      try {
        const comments = await getRedditComments(post.url);
        enriched++;
        if (comments.length === 0) {
          if (savePostSignal(post, url)) newCount++;
          continue;
        }
        saveCommunitySignal(post, url, comments);
        newCount++;
      } catch (err) {
        if (err instanceof RedditRateLimitError) {
          log.warn(`Reddit comments rate limit persisted for r/${subreddit}`);
          throttled = true;
        } else {
          log.info(
            `Reddit comments skipped for r/${subreddit}: ${(err as Error).message}`,
          );
        }
        if (savePostSignal(post, url)) newCount++;
      }
    }

    // One throttled community used to end the whole crawl, leaving the remaining
    // 40 subreddits uncollected. Now it costs a cooldown, and only a run of
    // throttled communities means the IP is actually blocked.
    if (!throttled) {
      consecutiveRateLimits = 0;
      continue;
    }
    consecutiveRateLimits++;
    if (consecutiveRateLimits >= REDDIT_MAX_CONSECUTIVE_RATE_LIMITS) {
      log.warn(
        `Reddit throttled ${consecutiveRateLimits} communities in a row; stopping Reddit crawl`,
      );
      break;
    }
    await sleep(REDDIT_SUBREDDIT_COOLDOWN_MS);
  }

  // Only mark the sweep as done after it actually ran; a crash mid-crawl must
  // not lock the signals out for another REDDIT_SIGNALS_MIN_INTERVAL_HOURS.
  db.setState(REDDIT_SIGNALS_LAST_RUN_KEY, new Date().toISOString());
  db.setState(REDDIT_SIGNALS_CURSOR_KEY, String(cursor + tailVisited));

  log.info(`Crawled Reddit community signals, ${newCount} new digests`);
  return newCount;
}
