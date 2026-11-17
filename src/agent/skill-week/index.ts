import { config } from "../../config.js";
import { AGENT_SKILLS_SOURCE } from "../../crawler/agent-skills.js";
import type { Article } from "../../knowledge/store.js";
import { db } from "../../knowledge/store.js";
import { ask } from "../../utils/ai.js";
import { localDayIso } from "../../utils/date.js";
import { log } from "../../utils/logger.js";
import { renderIntelligenceSection } from "../intelligence.js";
import { renderReading } from "../techlead.js";
import type { GeneratedArticle } from "../types.js";
import { cardLines } from "./lines.js";
import { renderDiscards, renderEdition, renderSkillRepos } from "./render.js";
import { type ScoredItem, scoreArticles } from "./scoring.js";
import { assignTiers } from "./tiers.js";
import { type Ask, writeTutorial } from "./tutorial.js";

export const SKILL_WEEK_WINDOW_DAYS = 7;
/** A topic taught inside this window is not "new to the reader". */
export const NOVELTY_WINDOW_DAYS = 60;

export interface SkillWeekDeps {
  load: () => Article[];
  recentTopics: () => string[];
  ask: Ask;
  placar: (now: Date) => Promise<string>;
  model?: string;
}

const defaultDeps: SkillWeekDeps = {
  load: () => db.getArticlesSince(SKILL_WEEK_WINDOW_DAYS, 3000),
  recentTopics: () => {
    const cutoff = localDayIso(
      new Date(Date.now() - NOVELTY_WINDOW_DAYS * 86_400_000),
    );
    return db
      .getPublishedRecent(300, "report")
      .filter((page) => page.period === "skillweek" && page.date >= cutoff)
      .map((page) => `${page.title} ${page.summary}`);
  },
  ask,
  // Optional enrichment: a ranking outage must not cost the lesson.
  placar: (now) =>
    renderIntelligenceSection(now).catch((err) => {
      log.warn(`Skill week placar skipped: ${(err as Error).message}`);
      return "";
    }),
  model: config.litellm.skillWeekModel || undefined,
};

export function skillWeekTitle(day: string, lesson: string | null): string {
  const [year, month, dayOfMonth] = day.split("-");
  const topic = lesson?.match(/^## (.+)$/m)?.[1]?.trim();
  return topic
    ? `Skill da semana: ${topic}`
    : `Laboratório da semana — ${dayOfMonth}/${month}/${year}`;
}

function cited(items: ScoredItem[]): ScoredItem[] {
  return items.filter(
    (item, index) =>
      items.findIndex((other) => other.article.url === item.article.url) ===
      index,
  );
}

export async function generateSkillWeek(
  now = new Date(),
  deps: SkillWeekDeps = defaultDeps,
): Promise<GeneratedArticle> {
  const articles = deps.load();
  const { items, discarded } = scoreArticles(articles, {
    recentTopics: deps.recentTopics(),
  });
  const tiers = assignTiers(items, articles);

  let lesson: string | null = null;
  if (tiers.learn) {
    try {
      lesson = await writeTutorial(deps.ask, tiers.learn, deps.model);
    } catch (err) {
      log.warn(`Skill week lesson failed: ${(err as Error).message}`);
    }
    if (!lesson) {
      // The source is still worth trying; it just did not survive the gate.
      log.warn(`Lesson rejected by the gate: ${tiers.learn.article.url}`);
      tiers.try.unshift(tiers.learn);
      tiers.learn = null;
    }
  }
  const published = cited([
    ...(tiers.learn ? [tiers.learn] : []),
    ...tiers.try,
    ...tiers.know,
  ]);
  if (published.length === 0) {
    throw new Error(
      `No vetted item in the last ${SKILL_WEEK_WINDOW_DAYS} days (${discarded.length} discarded)`,
    );
  }

  const lines = await cardLines(deps.ask, [...tiers.try, ...tiers.know]);
  const intelligence = (await deps.placar(now)).replace(/^## /m, "### ");
  const repos = renderSkillRepos(
    articles.filter((article) => article.source === AGENT_SKILLS_SOURCE),
  );
  const placar = [repos, intelligence].filter(Boolean).join("\n\n");
  const content = renderReading(
    renderEdition({
      tiers,
      lesson,
      lines,
      placar,
      discards: renderDiscards(discarded, articles.length),
    }),
  );

  const day = localDayIso(now);
  const title = skillWeekTitle(day, lesson);
  return {
    title,
    slug: `skillweek-${day}`,
    content,
    summary: lesson
      ? `Aula prática da semana e mais ${published.length - 1} itens verificados para experimentar.`
      : `${published.length} itens verificados para experimentar nesta semana.`,
    tags: ["skills", "agentes", "harness", "laboratorio", "pratica"],
    date: day,
    sources: published.map((item) => item.article.url),
    evidence: published.map((item) => ({
      sourceUrl: item.article.url,
      sourceTitle: item.article.title,
      excerpt: item.article.summary.slice(0, 400),
    })),
    editorialMetrics: {
      considered: articles.length,
      selected: published.length,
      rejected: discarded.length,
      buckets: {
        learn: tiers.learn ? 1 : 0,
        try: tiers.try.length,
        know: tiers.know.length,
        thermometer: tiers.thermometer.length,
      },
      primarySources: published.filter((item) => item.layer === "teach").length,
    },
    reportPeriod: "skillweek",
  };
}
