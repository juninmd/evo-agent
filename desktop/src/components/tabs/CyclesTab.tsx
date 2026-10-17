import { useState } from "react";
import { api } from "../../lib/api";
import { formatCount } from "../../lib/format";
import { cycleStatusLabel, runModeLabel, t } from "../../lib/i18n";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import CycleTable from "../CycleTable";
import ErrorBanner from "../ErrorBanner";
import Skeleton from "../Skeleton";

const LIMITS = [25, 50, 100, 200];
const STATUSES = ["", "succeeded", "failed", "skipped", "running"];

export default function CyclesTab({ modes }: { modes: string[] }) {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(50);

  const poll = usePoll(
    `cycles:${kind}:${status}:${limit}`,
    () => api.cycles({ kind, status, limit }),
    20_000,
  );

  const items = poll.data?.items ?? [];

  return (
    <Card
      fill
      title={t("cycles.title")}
      hint={t("cycles.count", { total: items.length })}
      actions={
        <>
          <label className="flex items-center gap-1 text-[11px] text-muted">
            {t("cycles.type")}
            <select
              className="evo-field px-1.5 py-0.5 text-[11px]"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="">{t("common.all")}</option>
              {modes.map((mode) => (
                <option key={mode} value={mode}>
                  {runModeLabel(mode)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-[11px] text-muted">
            {t("cycles.status")}
            <select
              className="evo-field px-1.5 py-0.5 text-[11px]"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option === "" ? t("common.all") : cycleStatusLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-[11px] text-muted">
            {t("editions.limit")}
            <select
              className="evo-field px-1.5 py-0.5 text-[11px]"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              {LIMITS.map((option) => (
                <option key={option} value={option}>
                  {formatCount(option)}
                </option>
              ))}
            </select>
          </label>
        </>
      }
    >
      {poll.error && (
        <div className="mb-2">
          <ErrorBanner
            message={t("common.loadFailed", { error: poll.error })}
            busy={poll.loading}
            onRetry={poll.reload}
          />
        </div>
      )}
      {!poll.data && !poll.error ? (
        <Skeleton label={t("app.loading")} />
      ) : (
        <CycleTable runs={items} />
      )}
    </Card>
  );
}
