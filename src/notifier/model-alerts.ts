import {
  type CatalogModel,
  type ModelSignal,
  newModelLaunches,
} from "../crawler/model-launches.js";
import { log } from "../utils/logger.js";
import type { TelegramDeliveryResult } from "./telegram.js";

export const MODEL_ALERTS_STATE_KEY = "model_alerts_seen";
const SEEN_CAP = 500;
const MAX_ALERTS_PER_RUN = 50;

export interface ModelAlertStore {
  getState(key: string): string | null;
  setState(key: string, value: string): void;
}

export interface ModelAlertDeps {
  store: ModelAlertStore;
  fetchCatalog: () => Promise<CatalogModel[]>;
  send: (launch: ModelSignal) => Promise<TelegramDeliveryResult>;
  now?: Date;
}

export interface ModelAlertResult {
  baseline: boolean;
  alerted: number;
  failed: number;
}

function readSeen(store: ModelAlertStore): string[] | null {
  const raw = store.getState(MODEL_ALERTS_STATE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Falls through: a corrupt row is re-baselined instead of replaying every launch.
  }
  log.warn(`Invalid ${MODEL_ALERTS_STATE_KEY} state, re-baselining`);
  return null;
}

function writeSeen(store: ModelAlertStore, seen: string[]) {
  store.setState(MODEL_ALERTS_STATE_KEY, JSON.stringify(seen.slice(-SEEN_CAP)));
}

// First run only records the catalog: alerting the whole launch window at once
// would flood the channel with models that are days old.
export async function runModelAlerts(
  deps: ModelAlertDeps,
): Promise<ModelAlertResult> {
  const launches = newModelLaunches(
    await deps.fetchCatalog(),
    deps.now ?? new Date(),
    MAX_ALERTS_PER_RUN,
  );
  const seen = readSeen(deps.store);
  if (seen === null) {
    writeSeen(
      deps.store,
      launches.map((launch) => launch.url),
    );
    log.info(`Model alerts baseline recorded: ${launches.length} launches`);
    return { baseline: true, alerted: 0, failed: 0 };
  }

  const known = new Set(seen);
  const fresh = launches.filter((launch) => !known.has(launch.url)).reverse();
  const result = { baseline: false, alerted: 0, failed: 0 };
  for (const launch of fresh) {
    const delivery = await deps.send(launch);
    if (!delivery.delivered) {
      // Left unseen on purpose: the next run retries it.
      result.failed++;
      continue;
    }
    seen.push(launch.url);
    writeSeen(deps.store, seen);
    result.alerted++;
  }
  log.info(
    `Model alerts: alerted=${result.alerted}, failed=${result.failed}, candidates=${launches.length}`,
  );
  return result;
}
