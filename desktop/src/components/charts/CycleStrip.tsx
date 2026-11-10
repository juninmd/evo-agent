import { formatDateTime, formatDuration } from "../../lib/format";
import { cycleStatusLabel, runModeLabel, t } from "../../lib/i18n";
import type { CycleRun } from "../../lib/types";
import { CYCLE_BG } from "./cycleTone";

/**
 * Os ultimos ciclos como uma fita de estados, do mais antigo ao mais novo: da
 * para ver de relance se a falha foi um ponto isolado ou uma sequencia.
 */
export default function CycleStrip({ runs }: { runs: CycleRun[] }) {
  if (runs.length === 0) return null;
  const summary = runs
    .map((run) => `${runModeLabel(run.type)}: ${cycleStatusLabel(run.status)}`)
    .join(", ");
  return (
    <ol
      aria-label={`${t("overview.cycleStrip")}. ${summary}`}
      className="evo-stagger flex items-center gap-1"
    >
      {runs.map((run) => (
        <li
          key={run.id}
          title={`${runModeLabel(run.type)} · ${cycleStatusLabel(run.status)} · ${formatDateTime(run.startedAt)} · ${formatDuration(run.durationSeconds)}`}
          className={`h-4 w-2 rounded-sm ${CYCLE_BG[run.status]}`}
        />
      ))}
    </ol>
  );
}
