export interface QualityBreakdown {
  primary: number;
  community: number;
  depth: number;
  evidence: number;
}

export interface QualityScore {
  score: number;
  breakdown: QualityBreakdown;
}

function num(metrics: Record<string, unknown>, key: string): number {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

const ratio = (value: number, target: number) =>
  target <= 0 ? 0 : Math.max(0, Math.min(1, value / target));

/**
 * 0-100 reading of how well an edition is anchored. Each facet is 0-100 and the
 * weights favour what the validator already treats as the editorial contract:
 * official sources first, then evidence per highlight, then breadth, then
 * independent community signal. Null when the edition has no selection (radar
 * and digest pages publish tables, not curated highlights).
 */
export function scoreEdition(
  metrics: Record<string, unknown>,
  evidenceCount: number,
): QualityScore | null {
  const selected = num(metrics, "selected");
  if (selected <= 0) return null;
  const breakdown: QualityBreakdown = {
    primary: Math.round(
      100 * ratio(num(metrics, "primarySources"), Math.ceil(selected / 4)),
    ),
    community: Math.round(100 * ratio(num(metrics, "communitySignals"), 3)),
    depth: Math.round(100 * ratio(selected, 12)),
    evidence: Math.round(100 * ratio(evidenceCount, selected)),
  };
  const score = Math.round(
    breakdown.primary * 0.35 +
      breakdown.evidence * 0.25 +
      breakdown.depth * 0.25 +
      breakdown.community * 0.15,
  );
  return { score, breakdown };
}

const FACET_LABEL: Record<keyof QualityBreakdown, string> = {
  primary: "primary-source share",
  community: "community signals",
  depth: "number of covered items",
  evidence: "evidence per highlight",
};

/**
 * One line for the improvement prompt: how the last editions scored and which
 * facet dragged the average down. Empty when nothing scoreable was published.
 */
export function qualityFeedback(
  editions: Array<{ metrics: Record<string, unknown>; evidenceCount: number }>,
): string {
  const scored = editions
    .map((edition) => scoreEdition(edition.metrics, edition.evidenceCount))
    .filter((quality): quality is QualityScore => quality !== null);
  if (scored.length === 0) return "";
  const average = Math.round(
    scored.reduce((sum, quality) => sum + quality.score, 0) / scored.length,
  );
  const facets = Object.keys(FACET_LABEL) as Array<keyof QualityBreakdown>;
  const mean = (facet: keyof QualityBreakdown) =>
    scored.reduce((sum, quality) => sum + quality.breakdown[facet], 0) /
    scored.length;
  const weakest = facets.reduce((low, facet) =>
    mean(facet) < mean(low) ? facet : low,
  );
  return `last ${scored.length} editions averaged ${average}/100; weakest facet: ${FACET_LABEL[weakest]} (${Math.round(mean(weakest))}/100)`;
}
