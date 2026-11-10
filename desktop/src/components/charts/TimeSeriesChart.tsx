import { useId, useMemo } from "react";
import {
  type Point,
  areaPath,
  linePath,
  linearScale,
  nearestIndex,
  niceTicks,
  spreadIndices,
} from "../../lib/chart";
import {
  formatAxisNumber,
  formatDateTime,
  parseTimestamp,
} from "../../lib/format";
import { t } from "../../lib/i18n";
import ChartTooltip from "./ChartTooltip";
import { useChartCursor } from "./useChartCursor";
import { useElementWidth } from "./useElementWidth";

export type SeriesPoint = { at: string; value: number };

const HEIGHT = 190;
const TOP = 10;
const BOTTOM = 24;
const RIGHT = 14;

/**
 * Serie temporal de uma metrica: eixo Y em marcas redondas, eixo X com horas,
 * area em degrade, cursor que gruda na leitura mais proxima e a mesma leitura
 * pelo teclado. `points` vem em ordem cronologica.
 */
export default function TimeSeriesChart({
  points,
  label,
  formatValue,
}: {
  points: SeriesPoint[];
  label: string;
  formatValue: (value: number) => string;
}) {
  const titleId = useId();
  const descId = useId();
  const gradientId = useId();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const cursor = useChartCursor(points.length);

  const geometry = useMemo(() => {
    const values = points.map((point) => point.value);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const tickLabels = ticks.map(formatAxisNumber);
    // Largura do eixo pelo rotulo mais comprido (~6,2 px por digito a 11 px).
    const left =
      Math.ceil(Math.max(...tickLabels.map((text) => text.length)) * 6.2) + 12;
    const times = points.map(
      (point, index) => parseTimestamp(point.at)?.getTime() ?? index,
    );
    const first = times[0];
    const last = times[times.length - 1];
    // Leituras fora de ordem ou no mesmo instante caem para o indice.
    const byTime =
      last > first &&
      times.every((time, index) => index === 0 || time >= times[index - 1]);
    const x = byTime
      ? linearScale([first, last], [left, width - RIGHT])
      : linearScale([0, Math.max(1, points.length - 1)], [left, width - RIGHT]);
    const y = linearScale(
      [ticks[0], ticks[ticks.length - 1]],
      [HEIGHT - BOTTOM, TOP],
    );
    const coordinates: Point[] = points.map((point, index) => [
      points.length === 1
        ? (left + width - RIGHT) / 2
        : x(byTime ? times[index] : index),
      y(point.value),
    ]);
    return { ticks, tickLabels, left, y, coordinates };
  }, [points, width]);

  if (points.length === 0) return null;

  const { ticks, tickLabels, left, y, coordinates } = geometry;
  const baseline = HEIGHT - BOTTOM;
  const xs = coordinates.map(([x]) => x);
  const lastPoint = coordinates[coordinates.length - 1];
  const active = cursor.active !== null ? coordinates[cursor.active] : null;
  const activePoint = cursor.active !== null ? points[cursor.active] : null;
  // Um rotulo "17/10, 10:00" ocupa ~80 px: so cabem os que deixam folga.
  const timeLabels = spreadIndices(
    points.length,
    Math.max(2, Math.min(5, Math.floor((width - left - RIGHT) / 105))),
  );

  function onPointerMove(event: React.PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    cursor.hover(nearestIndex(xs, event.clientX - bounds.left));
  }

  return (
    <div
      ref={ref}
      role="application"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: o grupo e o Tab stop do grafico; as setas percorrem as leituras.
      tabIndex={0}
      aria-label={t("chart.keyboardHint", { name: label })}
      onKeyDown={cursor.onKeyDown}
      onBlur={cursor.clear}
      className="relative w-full rounded-lg"
    >
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width}
        height={HEIGHT}
        className="block max-w-full"
      >
        <title id={titleId}>{label}</title>
        <desc id={descId}>
          {t("chart.seriesSummary", {
            count: points.length,
            first: formatValue(points[0].value),
            last: formatValue(points[points.length - 1].value),
          })}
        </desc>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-accent)"
              stopOpacity="0.26"
            />
            <stop
              offset="100%"
              stopColor="var(--color-accent)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {ticks.map((tick, index) => {
          // Meio pixel: um fio de 1 px cai inteiro numa linha de pixels.
          const line = Math.round(y(tick)) + 0.5;
          return (
            <g key={tick}>
              <line
                className="evo-chart-grid"
                x1={left}
                x2={width - RIGHT}
                y1={line}
                y2={line}
              />
              <text
                className="evo-chart-axis"
                x={left - 8}
                y={line}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {tickLabels[index]}
              </text>
            </g>
          );
        })}

        {timeLabels.map((index, position) => (
          <text
            key={index}
            className="evo-chart-axis"
            x={coordinates[index][0]}
            y={HEIGHT - 6}
            textAnchor={
              position === 0
                ? "start"
                : position === timeLabels.length - 1
                  ? "end"
                  : "middle"
            }
          >
            {formatDateTime(points[index].at)}
          </text>
        ))}

        {/* `key` pelo nome: o traco se redesenha ao trocar de metrica, nao a
            cada releitura da mesma serie. */}
        <g key={label}>
          <path
            className="evo-chart-area"
            d={areaPath(coordinates, baseline)}
            fill={`url(#${gradientId})`}
          />
          <path
            className="evo-chart-line"
            d={linePath(coordinates)}
            pathLength={1}
          />
          {points.length === 1 || active === null ? (
            <circle
              className="evo-chart-dot evo-chart-area"
              cx={lastPoint[0]}
              cy={lastPoint[1]}
              r={4}
            />
          ) : null}
        </g>

        {active && (
          <g data-testid="chart-cursor">
            <line
              className="evo-chart-cursor"
              x1={Math.round(active[0]) + 0.5}
              x2={Math.round(active[0]) + 0.5}
              y1={TOP}
              y2={baseline}
            />
            <circle
              className="evo-chart-dot"
              cx={active[0]}
              cy={active[1]}
              r={4.5}
            />
          </g>
        )}

        {/* O alvo e a area inteira: ninguem mira numa linha de 2 px. */}
        <rect
          x={left}
          y={0}
          width={Math.max(0, width - RIGHT - left)}
          height={baseline}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => cursor.hover(null)}
        />
      </svg>

      {active && activePoint && (
        <ChartTooltip x={active[0]} y={active[1]} width={width}>
          <strong className="evo-num block text-xs font-semibold">
            {formatValue(activePoint.value)}
          </strong>
          <span className="text-muted">{formatDateTime(activePoint.at)}</span>
        </ChartTooltip>
      )}
      <span className="sr-only" aria-live="polite">
        {cursor.byKeyboard && activePoint
          ? t("chart.reading", {
              value: formatValue(activePoint.value),
              time: formatDateTime(activePoint.at),
            })
          : ""}
      </span>
    </div>
  );
}
