import { type Column, DataTable } from "@juninmd/sonido";
import { formatDateTime } from "../lib/format";
import { cycleStatusLabel, runModeLabel, t } from "../lib/i18n";
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

  const columns: Column<CycleRun>[] = [
    ...(compact
      ? []
      : [
          {
            key: "id",
            label: t("cycles.id"),
            render: (run: CycleRun) => (
              <span className="font-mono text-[11px] text-faint">{run.id}</span>
            ),
          },
        ]),
    {
      key: "type",
      label: t("cycles.type"),
      render: (run) => (
        <span className="whitespace-nowrap text-fg">
          {runModeLabel(run.type)}
        </span>
      ),
    },
    {
      key: "status",
      label: t("cycles.status"),
      render: (run) => (
        <Badge tone={cycleTone(run)}>{cycleStatusLabel(run.status)}</Badge>
      ),
    },
    {
      key: "started",
      label: t("cycles.started"),
      render: (run) => (
        <span className="whitespace-nowrap text-muted">
          {formatDateTime(run.startedAt)}
        </span>
      ),
    },
    {
      key: "duration",
      label: t("cycles.duration"),
      align: "end",
      render: (run) => (
        <span className="text-muted">
          {run.durationSeconds === null ? "-" : `${run.durationSeconds} s`}
        </span>
      ),
    },
    {
      // O motivo da falha continua na visao geral: e a linha mais util de um
      // painel de operacao.
      key: "error",
      label: t("cycles.error"),
      render: (run) =>
        run.error ? (
          <span className="line-clamp-2 text-danger" title={run.error}>
            {run.error}
          </span>
        ) : (
          <span className="text-faint">-</span>
        ),
    },
  ];

  return (
    <DataTable
      label={t("cycles.title")}
      columns={columns}
      rows={runs}
      rowKey={(run) => String(run.id)}
    />
  );
}
