import axios from "axios";
import { config } from "../config.js";
import { log } from "../utils/logger.js";

const BASE = `https://api.telegram.org/bot${config.telegram.botToken}`;

export async function sendMessage(text: string): Promise<void> {
  try {
    await axios.post(
      `${BASE}/sendMessage`,
      {
        chat_id: config.telegram.chatId,
        text,
        parse_mode: "Markdown",
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
  sources: string[] = []
) {
  const sourcesText = sources.length > 0
    ? `\n\n*Fontes originais:*\n${sources.map(s => `• ${s}`).join('\n')}`
    : '';

  const msg = `*Novo Artigo — Evo Agent*\n\n*${title}*\n\n${summary}${sourcesText}\n\n[Ler artigo completo](${url})`;
  await sendMessage(msg);
}
