import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { seriesStats } from "../../lib/chart";
import { seriesCsv } from "../../lib/csv";
import { formatCount, formatDateTime, formatNumber } from "../../lib/format";
import { t } from "../../lib/i18n";
import type { MetricSummary } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import CopyButton from "../CopyButton";
import EmptyState from "../EmptyState";
import ErrorBanner from "../ErrorBanner";
import Skeleton from "../Skeleton";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import {
  CELL,
  CELL_LAST,
  CELL_NUM,
  MONO,
  ROW,
  TH,
  THEAD,
  TH_LAST,
  TH_NUM,
} from "../table";

const WINDOWS = [6, 24, 48, 168, 720];

const formatValue = (value: number) => formatNumber(value, 2);

/** Um numero do resumo da serie, para dar escala ao grafico. */
function Caption({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </dt>
      <dd className="evo-num truncate text-xs font-medium text-fg">
        {formatValue(value)}
      </dd>
    </div>
  );
}

/**
 * Onde a media cai entre o minimo e o maximo: uma media colada no minimo com
 * um maximo distante e um pico isolado, nao um patamar alto.
 */
function RangeGlyph({ row }: { row: MetricSummary }) {
  const span = row.maximum - row.minimum;
  const position = span > 0 ? (row.average - row.minimum) / span : 0.5;
  return (
    <span
      aria-hidden="true"
      title={t("metrics.range")}
      className="relative inline-block h-1 w-16 rounded-full bg-active align-middle"
    >
      <span
        className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-panel"
        style={{ left: `${Math.min(1, Math.max(0, position)) * 100}%` }}
      />
    </span>
  );
}

export default function MetricsTab() {
  const [hours, setHours] = useState(48);
  const [selected, setSelected] = useState<string | null>(null);

  const summary = usePoll(
    `metrics:${hours}`,
    () => api.metrics({ hours }),
    60_000,
  );
  const series = usePoll(
    `metrics:${hours}:${selected ?? ""}`,
    () => api.metrics({ hours, name: selected ?? undefined }),
    60_000,
  );

  const rows = summary.data?.summary ?? [];
  const points = series.data?.points ?? [];
  // A API devolve os pontos mais recentes primeiro: o grafico le da esquerda
  // para a direita.
  const chronological = useMemo(
    () =>
      [...(series.data?.points ?? [])]
        .reverse()
        .map((point) => ({ at: point.recordedAt, value: point.value })),
    [series.data],
  );
  const stats = useMemo(
    () => seriesStats(chronological.map((point) => point.value)),
    [chronological],
  );

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <Card
        fill
        title={t("metrics.title")}
        hint={t("metrics.hours", { hours })}
        actions={
          <label className="flex items-center gap-1 text-[11px] text-muted">
            {t("metrics.window")}
            <select
              className="evo-field px-1.5 py-0.5 text-[11px]"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
            >
              {WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {t("metrics.hours", { hours: window })}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {summary.error && (
          <div className="mb-2">
            <ErrorBanner
              message={t("common.loadFailed", { error: summary.error })}
              busy={summary.loading}
              onRetry={summary.reload}
            />
          </div>
        )}
        {!summary.data && !summary.error ? (
          <Skeleton label={t("app.loading")} shape="table" />
        ) : rows.length === 0 ? (
          <EmptyState message={t("metrics.empty")} />
        ) : (
          <>
            <table className="w-full border-collapse text-xs">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>{t("metrics.name")}</th>
                  <th className={TH_NUM}>{t("metrics.samples")}</th>
                  <th className={TH_NUM}>{t("metrics.average")}</th>
                  <th className={TH_NUM}>{t("metrics.minimum")}</th>
                  <th className={TH_NUM}>{t("metrics.maximum")}</th>
                  <th className={TH} aria-hidden="true" />
                  <th className={TH_LAST}>{t("metrics.last")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.name}
                    className={`${ROW} ${
                      selected === row.name ? "bg-active" : "hover:bg-hover"
                    }`}
                  >
                    <td className={CELL}>
                      <button
                        type="button"
                        aria-pressed={selected === row.name}
                        className={`${MONO} text-left ${
                          selected === row.name
                            ? "text-fg"
                            : "text-accent-text hover:underline"
                        }`}
                        onClick={() =>
                          setSelected((current) =>
                            current === row.name ? null : row.name,
                          )
                        }
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className={`${CELL_NUM} evo-num text-muted`}>
                      {formatCount(row.samples)}
                    </td>
                    <td className={`${CELL_NUM} evo-num text-fg`}>
                      {formatNumber(row.average, 2)}
                    </td>
                    <td className={`${CELL_NUM} evo-num text-muted`}>
                      {formatNumber(row.minimum, 2)}
                    </td>
                    <td className={`${CELL_NUM} evo-num text-muted`}>
                      {formatNumber(row.maximum, 2)}
                    </td>
                    <td className={CELL}>
                      <RangeGlyph row={row} />
                    </td>
                    <td className={`${CELL_LAST} whitespace-nowrap text-faint`}>
                      {formatDateTime(row.lastRecorded)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!selected && (
              <p className="pt-2 text-[11px] text-faint">{t("metrics.tip")}</p>
            )}
          </>
        )}
      </Card>

      <Card
        fill
        title={
          selected
            ? t("metrics.series", { name: selected })
            : t("metrics.title")
        }
        hint={
          selected
            ? t("metrics.points", { count: formatCount(points.length) })
            : t("metrics.selectHint")
        }
        actions={
          selected && points.length > 0 ? (
            <CopyButton text={seriesCsv(points)} label={t("metrics.copyCsv")} />
          ) : undefined
        }
      >
        {!selected ? (
          <EmptyState message={t("metrics.selectHint")} />
        ) : series.error ? (
          <ErrorBanner
            message={t("common.loadFailed", { error: series.error })}
            busy={series.loading}
            onRetry={series.reload}
          />
        ) : !series.data ? (
          <Skeleton label={t("app.loading")} shape="chart" />
        ) : !stats ? (
          <EmptyState message={t("metrics.empty")} />
        ) : (
          <div className="evo-enter flex flex-col gap-3 pt-3">
            <dl className="grid grid-cols-5 gap-2">
              <Caption label={t("metrics.lastValue")} value={stats.last} />
              <Caption label={t("metrics.avg")} value={stats.average} />
              <Caption label={t("metrics.p95")} value={stats.p95} />
              <Caption label={t("metrics.min")} value={stats.minimum} />
              <Caption label={t("metrics.max")} value={stats.maximum} />
            </dl>
            {/* Releitura da mesma serie segura o quadro, so mais apagado. */}
            <div
              className={`transition-opacity ${series.loading ? "opacity-60" : ""}`}
            >
              <TimeSeriesChart
                points={chronological}
                label={selected}
                formatValue={formatValue}
              />
            </div>
            <table className="w-full border-collapse text-[11px]">
              <caption className="pb-1 text-left text-[10px] uppercase tracking-wide text-faint">
                {t("metrics.readings")}
              </caption>
              <tbody>
                {points.map((point) => (
                  <tr
                    key={`${point.recordedAt}-${point.value}`}
                    className="border-t border-edge/60"
                  >
                    <th
                      scope="row"
                      className="py-1 text-left font-normal text-faint"
                    >
                      {formatDateTime(point.recordedAt)}
                    </th>
                    <td className="evo-num py-1 text-right text-fg">
                      {formatValue(point.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
