import type { MetricPoint } from "./types";

/** A serie como CSV, do mais antigo ao mais novo, para colar numa planilha. */
export function seriesCsv(points: readonly MetricPoint[]): string {
  const rows = [...points]
    .reverse()
    .map((point) => `${point.recordedAt},${point.value}`);
  return ["recordedAt,value", ...rows].join("\n");
}
