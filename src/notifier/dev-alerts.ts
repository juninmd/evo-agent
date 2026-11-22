import type { Article } from "../knowledge/store.js";
import { addDays } from "../utils/date.js";
import { log } from "../utils/logger.js";
import type { ModelAlertStore } from "./model-alerts.js";
import type { TelegramDeliveryResult } from "./telegram.js";

export const CLAUDE_ALERTS_KEY = "claude_alerts_seen";
export const REMOVAL_ALERTS_KEY = "removal_alerts_seen";
const SEEN_CAP = 500;
const REMOVAL_WARN_DAYS = 7;
const REMOVAL_TAG = /"removal:(\d{4}-\d{2}-\d{2})"/;
const NOTE_DAY = /#(\d{4}-\d{2}-\d{2})-[0-9a-f]{10}$/;

export interface DevAlertDeps {
  store: ModelAlertStore;
  notes: () => Article[];
  send: (
    kind: "claude" | "breaking",
    title: string,
    summary: string,
    url: string,
  ) => Promise<TelegramDeliveryResult>;
  today: string;
}

function readSeen(store: ModelAlertStore, key: string): string[] | null {
  const raw = store.getState(key);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // A corrupt row re-baselines instead of replaying every note.
  }
  return null;
}

async function alertOnce(
  deps: DevAlertDeps,
  key: string,
  candidates: Array<{
    id: string;
    send: () => Promise<TelegramDeliveryResult>;
  }>,
  baseline: boolean,
): Promise<{ alerted: number; failed: number }> {
  const stored = readSeen(deps.store, key);
  const seen = stored ?? [];
  const result = { alerted: 0, failed: 0 };
  if (stored === null && baseline) {
    // First run records the backlog: alerting months of notes would flood the chat.
    deps.store.setState(key, JSON.stringify(candidates.map((c) => c.id)));
    return result;
  }
  const known = new Set(seen);
  for (const candidate of candidates) {
    if (known.has(candidate.id)) continue;
    const delivery = await candidate.send();
    if (!delivery.delivered) {
      result.failed++;
      continue;
    }
    seen.push(candidate.id);
    deps.store.setState(key, JSON.stringify(seen.slice(-SEEN_CAP)));
    result.alerted++;
  }
  return result;
}

/** New Claude release notes (published in the last 2 days) and removals a week out. */
export async function runDevAlerts(
  deps: DevAlertDeps,
): Promise<{ alerted: number; failed: number }> {
  const notes = deps.notes();
  const fresh = notes.filter((note) => {
    const day = note.url.match(NOTE_DAY)?.[1];
    return day !== undefined && day >= addDays(deps.today, -2);
  });
  const claude = await alertOnce(
    deps,
    CLAUDE_ALERTS_KEY,
    fresh.map((note) => ({
      id: note.url,
      send: () => deps.send("claude", note.title, note.summary, note.url),
    })),
    true,
  );
  const warnBy = addDays(deps.today, REMOVAL_WARN_DAYS);
  const removals = notes
    .map((note) => ({ note, date: note.tags.match(REMOVAL_TAG)?.[1] }))
    .filter(
      (row): row is { note: Article; date: string } =>
        !!row.date && row.date >= deps.today && row.date <= warnBy,
    );
  const breaking = await alertOnce(
    deps,
    REMOVAL_ALERTS_KEY,
    removals.map(({ note, date }) => ({
      id: `${note.url}@${date}`,
      send: () =>
        deps.send(
          "breaking",
          `${date.split("-").reverse().join("/")}: ${note.title}`,
          note.summary,
          note.url,
        ),
    })),
    // Few and urgent: a removal days away is alerted even on the first run.
    false,
  );
  const result = {
    alerted: claude.alerted + breaking.alerted,
    failed: claude.failed + breaking.failed,
  };
  log.info(`Dev alerts: alerted=${result.alerted}, failed=${result.failed}`);
  return result;
}
