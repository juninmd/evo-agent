import axios from "axios";
import { config } from "../config.js";
import { escapeHtml } from "../utils/escape.js";
import { log } from "../utils/logger.js";

const BASE = `https://api.telegram.org/bot${config.telegram.botToken}`;

export interface TelegramDeliveryResult {
  delivered: boolean;
  error?: string;
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
): Promise<TelegramDeliveryResult> {
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
    return { delivered: true };
  } catch (err) {
    const error = telegramError(err);
    log.error(`Telegram failed: ${error}`);
    return { delivered: false, error };
  }
}

export async function notifyNewArticle(
  title: string,
  url: string,
  summary: string,
  sources: string[] = [],
): Promise<TelegramDeliveryResult> {
  const sourcesText =
    sources.length > 0
      ? `\n\n<b>Fontes originais:</b>\n${sources.map((s) => `• ${escapeHtml(s)}`).join("\n")}`
      : "";

  const msg = `<b>Novo Artigo — Evo Agent</b>\n\n<b>${escapeHtml(title)}</b>\n\n${escapeHtml(summary)}${sourcesText}\n\n<a href="${escapeHtml(url)}">Ler artigo completo</a>`;
  return sendMessage(msg);
}

export async function notifyWeeklyReport(
  title: string,
  url: string,
  summary: string,
): Promise<TelegramDeliveryResult> {
  const msg = `<b>Relatório Semanal — Evo Agent</b>\n\n<b>${escapeHtml(title)}</b>\n\n${escapeHtml(summary)}\n\n<a href="${escapeHtml(url)}">Ler relatório completo</a>`;
  return sendMessage(msg);
}
