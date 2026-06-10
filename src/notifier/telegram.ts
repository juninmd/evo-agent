import axios from "axios";
import { config } from "../config.js";
import { escapeHtml } from "../utils/escape.js";
import { log } from "../utils/logger.js";

const BASE = `https://api.telegram.org/bot${config.telegram.botToken}`;

export async function sendMessage(text: string): Promise<void> {
  try {
    await axios.post(
      `${BASE}/sendMessage`,
      {
        chat_id: config.telegram.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      },
      { timeout: 10000 },
    );
    log.info("Telegram message sent");
  } catch (err) {
    log.error(`Telegram failed: ${(err as Error).message}`);
  }
}

export async function notifyNewArticle(
  title: string,
  url: string,
  summary: string,
  sources: string[] = [],
) {
  const sourcesText =
    sources.length > 0
      ? `\n\n<b>Fontes originais:</b>\n${sources.map((s) => `• ${escapeHtml(s)}`).join("\n")}`
      : "";

  const msg = `<b>Novo Artigo — Evo Agent</b>\n\n<b>${escapeHtml(title)}</b>\n\n${escapeHtml(summary)}${sourcesText}\n\n<a href="${escapeHtml(url)}">Ler artigo completo</a>`;
  await sendMessage(msg);
}

export async function notifyWeeklyReport(
  title: string,
  url: string,
  summary: string,
) {
  const msg = `<b>Relatório Semanal — Evo Agent</b>\n\n<b>${escapeHtml(title)}</b>\n\n${escapeHtml(summary)}\n\n<a href="${escapeHtml(url)}">Ler relatório completo</a>`;
  await sendMessage(msg);
}
