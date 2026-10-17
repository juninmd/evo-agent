import { formatDateTime } from "../lib/format";
import { cycleStatusLabel, runModeLabel, t } from "../lib/i18n";
import type { CycleRun } from "../lib/types";
import Badge from "./Badge";
import EmptyState from "./EmptyState";
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
} from "./table";

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
    <table className="w-full border-collapse text-xs">
      <thead className={THEAD}>
        <tr>
          {!compact && <th className={TH}>{t("cycles.id")}</th>}
          <th className={TH}>{t("cycles.type")}</th>
          <th className={TH}>{t("cycles.status")}</th>
          <th className={TH}>{t("cycles.started")}</th>
          <th className={TH_NUM}>{t("cycles.duration")}</th>
          <th className={TH_LAST}>{t("cycles.error")}</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id} className={ROW}>
            {!compact && (
              <td className={`${CELL} evo-num ${MONO} text-faint`}>{run.id}</td>
            )}
            <td className={`${CELL} whitespace-nowrap text-fg`}>
              {runModeLabel(run.type)}
            </td>
            <td className={CELL}>
              <Badge tone={cycleTone(run)}>
                {cycleStatusLabel(run.status)}
              </Badge>
            </td>
            <td className={`${CELL} whitespace-nowrap text-muted`}>
              {formatDateTime(run.startedAt)}
            </td>
            <td className={`${CELL_NUM} evo-num text-muted`}>
              {run.durationSeconds === null ? "—" : `${run.durationSeconds} s`}
            </td>
            {/* O motivo da falha continua na visao geral: e a linha mais util
                de um painel de operacao. */}
            <td className={`${CELL_LAST} text-danger`}>
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
  );
}
