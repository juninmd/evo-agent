/**
 * Geometria e escala dos graficos, sem DOM: tudo aqui e testavel em Node e os
 * componentes em `components/charts/` so desenham o que estas funcoes devolvem.
 */

export type Scale = (value: number) => number;

/** Mapeia `domain` em `range`; um dominio de um ponto so cai no meio do range. */
export function linearScale(
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number],
): Scale {
  const span = d1 - d0;
  if (span === 0) return () => (r0 + r1) / 2;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

/**
 * Passo "redondo" (1, 2, 2,5 ou 5 vezes uma potencia de 10) para cerca de
 * `count` marcas: um eixo com 9.100 / 22.075 / 35.050 nao se le de relance.
 */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || count < 1) return 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;
  return factor * magnitude;
}

/**
 * Marcas do eixo Y cobrindo [min, max]. A primeira e a ultima sao multiplos do
 * passo, entao o dominio do grafico e `[ticks[0], ticks.at(-1)]`.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  let low = Math.min(min, max);
  let high = Math.max(min, max);
  if (low === high) {
    // Serie plana: abre espaco em volta para a linha nao colar na borda.
    const pad = Math.abs(low) > 0 ? Math.abs(low) * 0.1 : 1;
    low -= pad;
    high += pad;
  }
  const step = niceStep(high - low, count);
  const first = Math.floor(low / step) * step;
  const last = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  // O indice evita o acumulo de erro de ponto flutuante de `value += step`.
  const total = Math.round((last - first) / step);
  for (let index = 0; index <= total; index++) {
    ticks.push(Number((first + index * step).toPrecision(12)));
  }
  return ticks;
}

const DURATION_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14_400, 21_600,
  43_200, 86_400,
];

/**
 * Marcas de um eixo de duracao, em segundos, a partir do zero. O passo sai de
 * uma escada de relogio (15 s, 30 s, 1 min, 5 min...): "3 min 20 s" e redondo
 * em base 10 e estranho num eixo de tempo.
 */
export function durationTicks(maxSeconds: number, count = 3): number[] {
  const max = Number.isFinite(maxSeconds) && maxSeconds > 0 ? maxSeconds : 1;
  const raw = max / count;
  const step =
    DURATION_STEPS.find((candidate) => candidate >= raw) ??
    niceStep(max, count);
  const ticks: number[] = [];
  for (let value = 0; value < max + step; value += step) ticks.push(value);
  return ticks;
}

/** Indices espalhados por igual, sempre com o primeiro e o ultimo. */
export function spreadIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length <= count) return Array.from({ length }, (_, index) => index);
  const last = length - 1;
  const picked = new Set<number>();
  for (let slot = 0; slot < count; slot++) {
    picked.add(Math.round((slot / (count - 1)) * last));
  }
  return [...picked].sort((a, b) => a - b);
}

/** Indice do ponto cujo x esta mais perto de `x`; `xs` vem em ordem crescente. */
export function nearestIndex(xs: readonly number[], x: number): number {
  if (xs.length === 0) return -1;
  let low = 0;
  let high = xs.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (xs[middle] <= x) low = middle;
    else high = middle;
  }
  return Math.abs(xs[low] - x) <= Math.abs(xs[high] - x) ? low : high;
}

export type Point = readonly [x: number, y: number];

/** Meio pixel de precisao basta e deixa o atributo `d` curto. */
function coordinate(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function linePath(points: readonly Point[]): string {
  return points
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${coordinate(x)},${coordinate(y)}`,
    )
    .join("");
}

/** A linha fechada ate a base, para o preenchimento sob a serie. */
export function areaPath(points: readonly Point[], baseline: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)}L${coordinate(last[0])},${coordinate(baseline)}L${coordinate(first[0])},${coordinate(baseline)}Z`;
}

export type SeriesStats = {
  count: number;
  minimum: number;
  maximum: number;
  average: number;
  /** Percentil 95 pelo metodo do posto mais proximo. */
  p95: number;
  last: number;
  /** Ultima leitura menos a primeira. */
  change: number;
};

export function percentile(
  sorted: readonly number[],
  fraction: number,
): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

/** `values` em ordem cronologica; `null` quando nao ha leitura. */
export function seriesStats(values: readonly number[]): SeriesStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    count: values.length,
    minimum: sorted[0],
    maximum: sorted[sorted.length - 1],
    average: sum / values.length,
    p95: percentile(sorted, 0.95),
    last: values[values.length - 1],
    change: values[values.length - 1] - values[0],
  };
}
