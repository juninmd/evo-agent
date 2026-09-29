import axios from "axios";
import { config } from "../config.js";
import type { ModelSignal } from "../crawler/model-launches.js";
import { escapeHtml } from "../utils/escape.js";
import { log } from "../utils/logger.js";

const BASE = `https://api.telegram.org/bot${config.telegram.botToken}`;
const MAX_SOURCE_HOSTS = 6;

export interface TelegramDeliveryResult {
  delivered: boolean;
  error?: string;
}

/** The button target, plus the page previewed as the card's header. */
export interface TelegramCardLink {
  url: string;
  label: string;
  previewUrl?: string;
}

export interface ArticleCardInput {
  kind: "article" | "report";
  title: string;
  summary: string;
  sources: string[];
}

function telegramError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : String(err);
  }

  const status = err.response?.status;
  const description =
    typeof err.response?.data === "object" &&
    err.response.data !== null &&
    "description" in err.response.data &&
    typeof err.response.data.description === "string"
      ? err.response.data.description
      : err.message;

  return status
    ? `Telegram API ${status}: ${description}`
    : `Telegram network error: ${err.message}`;
}

export async function sendMessage(
  text: string,
  link?: TelegramCardLink,
): Promise<TelegramDeliveryResult> {
  try {
    await axios.post(
      `${BASE}/sendMessage`,
      {
        chat_id: config.telegram.chatId,
        text,
        parse_mode: "HTML",
        // Pinning the url matters: by default Telegram previews the first link
        // in the text, which is a source, not our own site.
        ...(link && {
          link_preview_options: {
            url: link.previewUrl ?? link.url,
            prefer_large_media: true,
            show_above_text: true,
          },
          reply_markup: {
            inline_keyboard: [[{ text: link.label, url: link.url }]],
          },
        }),
      },
      { timeout: 10000 },
    );
    log.info("Telegram message sent");
    return { delivered: true };
  } catch (err) {
    const error = telegramError(err);
    log.error(`Telegram failed: ${error}`);
    return { delivered: false, error };
  }
}

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * Pages serves a new article only after its build finishes, and Telegram caches
 * whatever it fetched first; the site root always answers with the brand card.
 */
export function siteRootOf(articleUrl: string): string {
  try {
    const { origin, pathname } = new URL(articleUrl);
    const repo = pathname.split("/").find(Boolean);
    return repo ? `${origin}/${repo}/` : `${origin}/`;
  } catch {
    return articleUrl;
  }
}

/** One link per host, so ten Reddit threads read as one signal, not a wall. */
function sourcesLine(sources: string[]): string {
  if (sources.length === 0) return "";
  const byHost = new Map<string, string>();
  for (const source of sources) {
    const host = hostOf(source);
    const key = host ?? source;
    if (!byHost.has(key)) {
      byHost.set(
        key,
        host
          ? `<a href="${escapeHtml(source)}">${escapeHtml(host)}</a>`
          : escapeHtml(source.slice(0, 60)),
      );
    }
  }
  const shown = [...byHost.values()].slice(0, MAX_SOURCE_HOSTS);
  const hidden = byHost.size - shown.length;
  const more = hidden > 0 ? ` · +${hidden}` : "";
  return `\n\n🔗 <b>Fontes</b> · ${sources.length}\n${shown.join(" · ")}${more}`;
}

export function buildArticleCard(input: ArticleCardInput): string {
  const badge =
    input.kind === "report" ? "📊 <b>Relatório</b>" : "🗞️ <b>Nova edição</b>";
  const summary = input.summary.trim()
    ? `\n\n<blockquote expandable>${escapeHtml(input.summary.trim())}</blockquote>`
    : "";
  return `${badge} · Evo Agent\n\n<b>${escapeHtml(input.title)}</b>${summary}${sourcesLine(input.sources)}`;
}

export async function notifyNewArticle(
  title: string,
  url: string,
  summary: string,
  sources: string[] = [],
): Promise<TelegramDeliveryResult> {
  const card = buildArticleCard({ kind: "article", title, summary, sources });
  return sendMessage(card, {
    url,
    label: "📖 Ler edição completa",
    previewUrl: siteRootOf(url),
  });
}

export async function notifyWeeklyReport(
  title: string,
  url: string,
  summary: string,
): Promise<TelegramDeliveryResult> {
  const card = buildArticleCard({
    kind: "report",
    title,
    summary,
    sources: [],
  });
  return sendMessage(card, {
    url,
    label: "📖 Ler relatório completo",
    previewUrl: siteRootOf(url),
  });
}

export async function notifyModelLaunch(
  launch: ModelSignal,
): Promise<TelegramDeliveryResult> {
  const launchedAt = launch.launchedAt
    ? `\n\n📅 Lançado em ${new Date(launch.launchedAt * 1000).toLocaleDateString("pt-BR", { timeZone: config.timezone })}`
    : "";
  const msg = `🚀 <b>Novo modelo</b> · Evo Agent\n\n<b>${escapeHtml(launch.title)}</b>\n\n<blockquote>${escapeHtml(launch.summary)}</blockquote>${launchedAt}`;
  return sendMessage(msg, { url: launch.url, label: "🔎 Ver modelo" });
}
