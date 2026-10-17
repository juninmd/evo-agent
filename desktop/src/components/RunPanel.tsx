import { useState } from "react";
import { api, errText } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { runModeLabel, t } from "../lib/i18n";
import type { Overview } from "../lib/types";
import Badge from "./Badge";

/** Os modos vem do agente: o console nao mantem uma segunda lista. */
export default function RunPanel({
  overview,
  modes,
  onStarted,
}: {
  overview: Overview | undefined;
  modes: string[];
  onStarted: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function start(mode: string) {
    setBusy(mode);
    setNotice(null);
    try {
      await api.runStart(mode);
      setNotice(t("overview.runStarted", { mode: runModeLabel(mode) }));
      onStarted();
    } catch (error) {
      setNotice(t("overview.runFailed", { error: errText(error) }));
    } finally {
      setBusy(null);
    }
  }

  const active = overview?.activeRun ?? null;
  const enabled = overview?.runsEnabled === true;

  return (
    <div className="flex flex-col gap-2">
      {active ? (
        <Badge tone="info">
          {t("overview.runActive", {
            mode: runModeLabel(active.mode),
            time: formatDateTime(active.startedAt),
          })}
        </Badge>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              className="evo-btn"
              disabled={!enabled || busy !== null}
              onClick={() => void start(mode)}
            >
              {busy === mode ? t("common.loadingShort") : runModeLabel(mode)}
            </button>
          ))}
        </div>
      )}

      {!enabled && (
        <p className="text-[11px] text-muted">{t("overview.runDisabled")}</p>
      )}
      {notice && <p className="text-[11px] text-muted">{notice}</p>}
    </div>
  );
}
