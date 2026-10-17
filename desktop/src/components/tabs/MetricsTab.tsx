import { useState } from "react";
import { api } from "../../lib/api";
import { formatCount, formatDateTime, formatNumber } from "../../lib/format";
import { t } from "../../lib/i18n";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import EmptyState from "../EmptyState";
import ErrorBanner from "../ErrorBanner";
import Skeleton from "../Skeleton";
import Sparkline from "../Sparkline";
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

/** Maximo, media e minimo da serie, para dar escala ao grafico. */
function Caption({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </span>
      <span className="evo-num text-xs text-fg">{formatNumber(value, 2)}</span>
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
  const values = [...points].reverse().map((point) => point.value);

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
          <Skeleton label={t("app.loading")} />
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
      >
        {!selected ? (
          <EmptyState message={t("metrics.selectHint")} />
        ) : series.error ? (
          <ErrorBanner
            message={t("common.loadFailed", { error: series.error })}
            busy={series.loading}
            onRetry={series.reload}
          />
        ) : points.length === 0 ? (
          <EmptyState message={t("metrics.empty")} />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <Caption label={t("metrics.max")} value={Math.max(...values)} />
              <Caption
                label={t("metrics.avg")}
                value={
                  values.reduce((sum, value) => sum + value, 0) / values.length
                }
              />
              <Caption label={t("metrics.min")} value={Math.min(...values)} />
            </div>
            <Sparkline points={values} label={selected} />
            <ul className="text-[11px]">
              {points.map((point) => (
                <li
                  key={`${point.recordedAt}-${point.value}`}
                  className="flex items-center justify-between gap-2 border-b border-edge/60 py-1 last:border-b-0"
                >
                  <span className="text-faint">
                    {formatDateTime(point.recordedAt)}
                  </span>
                  <span className="evo-num text-fg">
                    {formatNumber(point.value, 2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
