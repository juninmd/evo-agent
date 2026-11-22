import { createHash } from "node:crypto";
import axios from "axios";
import { config } from "../config.js";
import { feedbackStore, type Vote } from "../knowledge/feedback-store.js";
import { log } from "../utils/logger.js";

export const FEEDBACK_OFFSET_KEY = "telegram_updates_offset";
const VOTES: Record<string, Vote> = { u: "up", d: "down", k: "known" };
const CALLBACK = /^fb:([0-9a-f]{10}):([udk])$/;
const ACK: Record<Vote, string> = {
  up: "Valeu! Mais disso.",
  down: "Anotado: menos disso.",
  known: "Anotado: você já sabia.",
};

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

/** Stable 10-hex key: fits Telegram's 64-byte callback_data with room. */
export function itemKey(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 10);
}

/** One row per numbered item: 👍 / 👎 / já sabia. */
export function feedbackRows(keys: string[]): InlineButton[][] {
  return keys.map((key, index) => [
    { text: `${index + 1} 👍`, callback_data: `fb:${key}:u` },
    { text: `${index + 1} 👎`, callback_data: `fb:${key}:d` },
    { text: `${index + 1} já sabia`, callback_data: `fb:${key}:k` },
  ]);
}

export function parseCallback(
  data: string | undefined,
): { key: string; vote: Vote } | null {
  const match = (data ?? "").match(CALLBACK);
  return match ? { key: match[1], vote: VOTES[match[2]] } : null;
}

/** TELEGRAM_CHAT_ID may be numeric or "@channel": match either form. */
export function isConfiguredChat(
  chat: { id?: number | string; username?: string } | undefined,
  chatId: string,
): boolean {
  if (!chat) return false;
  if (chatId.startsWith("@")) {
    return `@${chat.username ?? ""}`.toLowerCase() === chatId.toLowerCase();
  }
  return String(chat.id ?? "") === chatId;
}

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    data?: string;
    from?: { id?: number };
    message?: { chat?: { id?: number | string; username?: string } };
  };
}

export interface FeedbackDeps {
  getState: (key: string) => string | null;
  setState: (key: string, value: string) => void;
  getUpdates: (offset: number) => Promise<TelegramUpdate[]>;
  answer: (callbackId: string, text: string) => Promise<void>;
  chatId: string;
}

const api = (method: string) =>
  `https://api.telegram.org/bot${config.telegram.botToken}/${method}`;

export function defaultFeedbackDeps(store: {
  getState: (key: string) => string | null;
  setState: (key: string, value: string) => void;
}): FeedbackDeps {
  return {
    ...store,
    chatId: config.telegram.chatId,
    getUpdates: async (offset) => {
      const { data } = await axios.post<{ result?: TelegramUpdate[] }>(
        api("getUpdates"),
        { offset, timeout: 0, allowed_updates: ["callback_query"] },
        { timeout: 15_000 },
      );
      return Array.isArray(data?.result) ? data.result : [];
    },
    answer: async (callbackId, text) => {
      await axios.post(
        api("answerCallbackQuery"),
        { callback_query_id: callbackId, text },
        { timeout: 10_000 },
      );
    },
  };
}

/**
 * Pulled by the hourly CRAWL: no webhook, no listening port. Only buttons
 * pressed in the configured chat count; anything else is acknowledged and dropped.
 */
export async function pollFeedback(
  deps: FeedbackDeps,
): Promise<{ recorded: number; ignored: number }> {
  const offset = Number(deps.getState(FEEDBACK_OFFSET_KEY) ?? "0") || 0;
  const updates = await deps.getUpdates(offset);
  const result = { recorded: 0, ignored: 0 };
  let next = offset;
  for (const update of updates) {
    next = Math.max(next, update.update_id + 1);
    const query = update.callback_query;
    const parsed = parseCallback(query?.data);
    const voter = query?.from?.id;
    if (
      !query ||
      !parsed ||
      voter === undefined ||
      !isConfiguredChat(query.message?.chat, deps.chatId) ||
      !feedbackStore.item(parsed.key)
    ) {
      result.ignored++;
      continue;
    }
    feedbackStore.vote(String(voter), parsed.key, parsed.vote);
    result.recorded++;
    await deps
      .answer(query.id, ACK[parsed.vote])
      // An expired callback (older than ~15 min) still counts as a vote.
      .catch((err) => log.debug(`answerCallbackQuery: ${err.message}`));
  }
  if (next !== offset) deps.setState(FEEDBACK_OFFSET_KEY, String(next));
  return result;
}
