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

const WINDOWS = [6, 24, 48, 168, 720];

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
    <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Card
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="py-1 pr-3 font-medium">{t("metrics.name")}</th>
                  <th className="py-1 pr-3 font-medium">
                    {t("metrics.samples")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("metrics.average")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("metrics.minimum")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("metrics.maximum")}
                  </th>
                  <th className="py-1 font-medium">{t("metrics.last")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.name}
                    className={`border-t border-edge/70 ${
                      selected === row.name ? "bg-active" : ""
                    }`}
                  >
                    <td className="py-1.5 pr-3">
                      <button
                        type="button"
                        className="text-left text-accent-text hover:underline"
                        onClick={() =>
                          setSelected((current) =>
                            current === row.name ? null : row.name,
                          )
                        }
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="evo-num py-1.5 pr-3 text-muted">
                      {formatCount(row.samples)}
                    </td>
                    <td className="evo-num py-1.5 pr-3 text-fg">
                      {formatNumber(row.average, 2)}
                    </td>
                    <td className="evo-num py-1.5 pr-3 text-muted">
                      {formatNumber(row.minimum, 2)}
                    </td>
                    <td className="evo-num py-1.5 pr-3 text-muted">
                      {formatNumber(row.maximum, 2)}
                    </td>
                    <td className="py-1.5 whitespace-nowrap text-faint">
                      {formatDateTime(row.lastRecorded)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
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
          <div className="flex flex-col gap-2">
            <Sparkline points={values} label={selected} />
            <ul className="max-h-56 overflow-auto text-[11px]">
              {points.map((point) => (
                <li
                  key={`${point.recordedAt}-${point.value}`}
                  className="flex items-center justify-between gap-2 border-b border-edge/60 py-0.5 last:border-b-0"
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
