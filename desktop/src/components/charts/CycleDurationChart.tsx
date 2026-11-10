import { useId, useMemo } from "react";
import { durationTicks, linearScale } from "../../lib/chart";
import { formatDateTime, formatDuration } from "../../lib/format";
import { cycleStatusLabel, runModeLabel, t } from "../../lib/i18n";
import type { CycleRun } from "../../lib/types";
import ChartTooltip from "./ChartTooltip";
import { CYCLE_BG, CYCLE_FILL, CYCLE_STATUSES } from "./cycleTone";
import { useChartCursor } from "./useChartCursor";
import { useElementWidth } from "./useElementWidth";

const HEIGHT = 150;
const TOP = 8;
const BOTTOM = 22;
const RIGHT = 8;
const MAX_BAR = 18;

/**
 * Uma coluna por ciclo, do mais antigo ao mais novo: a altura e a duracao e a
 * cor e o estado. `runs` vem em ordem cronologica. Um ciclo ainda em execucao
 * nao tem duracao e aparece como um marcador na base.
 */
export default function CycleDurationChart({ runs }: { runs: CycleRun[] }) {
  const titleId = useId();
  const [ref, width] = useElementWidth<HTMLDivElement>(640);
  const cursor = useChartCursor(runs.length);

  const { ticks, left, y } = useMemo(() => {
    const longest = Math.max(1, ...runs.map((run) => run.durationSeconds ?? 0));
    const marks = durationTicks(longest);
    const labels = marks.map((mark) => formatDuration(mark));
    return {
      ticks: marks,
      left:
        Math.ceil(Math.max(...labels.map((text) => text.length)) * 6.2) + 12,
      y: linearScale([0, marks[marks.length - 1]], [HEIGHT - BOTTOM, TOP]),
    };
  }, [runs]);

  if (runs.length === 0) return null;

  const baseline = HEIGHT - BOTTOM;
  const band = (width - RIGHT - left) / runs.length;
  // A coluna nao enche a faixa: sobra pelo menos 2 px de respiro entre vizinhas.
  const bar = Math.max(2, Math.min(MAX_BAR, band - 2));
  const center = (index: number) => left + band * (index + 0.5);
  const present = CYCLE_STATUSES.filter((status) =>
    runs.some((run) => run.status === status),
  );
  const active = cursor.active !== null ? runs[cursor.active] : null;
  const first = runs[0];
  const last = runs[runs.length - 1];

  function describe(run: CycleRun): string {
    return t("chart.cycleReading", {
      type: runModeLabel(run.type),
      status: cycleStatusLabel(run.status),
      time: formatDateTime(run.startedAt),
      duration: formatDuration(run.durationSeconds),
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={ref}
        role="application"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: o grupo e o Tab stop do grafico; as setas percorrem os ciclos.
        tabIndex={0}
        aria-label={t("chart.keyboardHint", { name: t("cycles.chartTitle") })}
        onKeyDown={cursor.onKeyDown}
        onBlur={cursor.clear}
        className="relative w-full rounded-lg"
      >
        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          className="block max-w-full"
        >
          <title id={titleId}>{t("cycles.chartTitle")}</title>
          {ticks.map((tick) => {
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
                  {formatDuration(tick)}
                </text>
              </g>
            );
          })}
          <text className="evo-chart-axis" x={left} y={HEIGHT - 5}>
            {formatDateTime(first.startedAt)}
          </text>
          {runs.length > 1 && (
            <text
              className="evo-chart-axis"
              x={width - RIGHT}
              y={HEIGHT - 5}
              textAnchor="end"
            >
              {formatDateTime(last.startedAt)}
            </text>
          )}

          {runs.map((run, index) => {
            const dimmed = cursor.active !== null && cursor.active !== index;
            const x = center(index) - bar / 2;
            if (run.durationSeconds === null) {
              return (
                <circle
                  key={run.id}
                  cx={center(index)}
                  cy={baseline - 4}
                  r={Math.min(4, bar / 2 + 1)}
                  fill={CYCLE_FILL[run.status]}
                  opacity={dimmed ? 0.5 : 1}
                />
              );
            }
            // Mesmo um ciclo de 0 s ganha 2 px: uma coluna invisivel some do historico.
            const top = Math.min(y(run.durationSeconds), baseline - 2);
            const radius = Math.min(3, bar / 2, (baseline - top) / 2);
            return (
              <path
                key={run.id}
                className="evo-chart-bar"
                // Topo arredondado, base reta: a coluna nasce da linha de base.
                d={`M${x},${baseline}V${top + radius}Q${x},${top} ${x + radius},${top}H${x + bar - radius}Q${x + bar},${top} ${x + bar},${top + radius}V${baseline}Z`}
                fill={CYCLE_FILL[run.status]}
                opacity={dimmed ? 0.5 : 1}
                style={{ animationDelay: `${Math.min(index * 8, 240)}ms` }}
              />
            );
          })}

          {runs.map((run, index) => (
            <rect
              key={run.id}
              data-testid="cycle-bar"
              x={left + band * index}
              y={0}
              width={band}
              height={baseline}
              fill="transparent"
              onPointerMove={() => cursor.hover(index)}
              onPointerLeave={() => cursor.hover(null)}
            />
          ))}
        </svg>

        {active && cursor.active !== null && (
          <ChartTooltip
            x={center(cursor.active)}
            y={
              active.durationSeconds === null
                ? baseline - 8
                : Math.min(y(active.durationSeconds), baseline - 2)
            }
            width={width}
          >
            <strong className="block text-xs font-semibold">
              {runModeLabel(active.type)} ·{" "}
              <span className="evo-num">
                {formatDuration(active.durationSeconds)}
              </span>
            </strong>
            <span className="flex items-center gap-1.5 text-muted">
              <span
                aria-hidden="true"
                className={`inline-block size-2 rounded-sm ${CYCLE_BG[active.status]}`}
              />
              {cycleStatusLabel(active.status)} ·{" "}
              {formatDateTime(active.startedAt)}
            </span>
          </ChartTooltip>
        )}
        <span className="sr-only" aria-live="polite">
          {cursor.byKeyboard && active ? describe(active) : ""}
        </span>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
        {present.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-sm ${CYCLE_BG[status]}`}
            />
            {cycleStatusLabel(status)}
          </li>
        ))}
      </ul>
    </div>
  );
}
