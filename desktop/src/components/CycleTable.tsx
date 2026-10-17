import { formatDateTime } from "../lib/format";
import { t } from "../lib/i18n";
import { cycleStatusLabel, runModeLabel } from "../lib/i18n";
import type { CycleRun } from "../lib/types";
import Badge from "./Badge";
import EmptyState from "./EmptyState";

export function cycleTone(run: Pick<CycleRun, "status">) {
  if (run.status === "succeeded") return "ok" as const;
  if (run.status === "failed") return "danger" as const;
  if (run.status === "running") return "info" as const;
  return "warn" as const;
}

export default function CycleTable({
  runs,
  compact = false,
}: {
  runs: CycleRun[];
  compact?: boolean;
}) {
  if (runs.length === 0) {
    return <EmptyState message={t("cycles.empty")} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
            {!compact && (
              <th className="py-1 pr-3 font-medium">{t("cycles.id")}</th>
            )}
            <th className="py-1 pr-3 font-medium">{t("cycles.type")}</th>
            <th className="py-1 pr-3 font-medium">{t("cycles.status")}</th>
            <th className="py-1 pr-3 font-medium">{t("cycles.started")}</th>
            <th className="py-1 pr-3 font-medium">{t("cycles.duration")}</th>
            <th className="py-1 font-medium">{t("cycles.error")}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-t border-edge/70 align-top">
              {!compact && (
                <td className="evo-num py-1.5 pr-3 text-faint">{run.id}</td>
              )}
              <td className="py-1.5 pr-3 text-fg">{runModeLabel(run.type)}</td>
              <td className="py-1.5 pr-3">
                <Badge tone={cycleTone(run)}>
                  {cycleStatusLabel(run.status)}
                </Badge>
              </td>
              <td className="py-1.5 pr-3 text-muted">
                {formatDateTime(run.startedAt)}
              </td>
              <td className="evo-num py-1.5 pr-3 text-muted">
                {run.durationSeconds === null
                  ? "—"
                  : `${run.durationSeconds} s`}
              </td>
              {/* O motivo da falha continua na visão geral: é a linha mais
                  útil de um painel de operação. */}
              <td className="py-1.5 text-danger">
                {run.error ? (
                  <span className="line-clamp-2" title={run.error}>
                    {run.error}
                  </span>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
