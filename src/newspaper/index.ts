import type { RadarBucket } from "../agent/radar-buckets.js";
import type { LaunchOfDay } from "../agent/radar-launches.js";
import { log } from "../utils/logger.js";
import { buildEdition } from "./edition.js";
import { renderNewspaper } from "./render.js";

export interface NewspaperInput {
  day: string;
  buckets: RadarBucket[];
  launches: LaunchOfDay[];
  reading: string;
}

export function newspaperPath(day: string): string {
  return `jornal/${day}.html`;
}

/** Relative to the radar page at reports/<slug>, so it holds on any base URL. */
export function newspaperLink(day: string): string {
  return `[Ler esta edição em formato de jornal, com imagens](../${newspaperPath(day)})`;
}

function renderPage(input: NewspaperInput): string {
  return renderNewspaper(buildEdition(input), { document: true });
}

/** The newspaper is a second view of the radar: its failure must not cost the radar. */
export function newspaperAttachment(
  input: NewspaperInput,
  render: (input: NewspaperInput) => string = renderPage,
): { path: string; content: string } | null {
  try {
    return { path: newspaperPath(input.day), content: render(input) };
  } catch (err) {
    log.warn(
      `Newspaper skipped: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
