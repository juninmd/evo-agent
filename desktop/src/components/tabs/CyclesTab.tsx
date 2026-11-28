import { useState } from "react";
import { api } from "../../lib/api";
import { formatCount } from "../../lib/format";
import { cycleStatusLabel, runModeLabel, t } from "../../lib/i18n";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import CycleTable from "../CycleTable";
import ErrorBanner from "../ErrorBanner";
import FilterSelect from "../FilterSelect";
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
          <FilterSelect
            label={t("cycles.type")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "", label: t("common.all") },
              ...modes.map((mode) => ({
                value: mode,
                label: runModeLabel(mode),
              })),
            ]}
          />
          <FilterSelect
            label={t("cycles.status")}
            value={status}
            onChange={setStatus}
            options={STATUSES.map((option) => ({
              value: option,
              label: option === "" ? t("common.all") : cycleStatusLabel(option),
            }))}
          />
          <FilterSelect
            label={t("editions.limit")}
            value={String(limit)}
            onChange={(value) => setLimit(Number(value))}
            options={LIMITS.map((option) => ({
              value: String(option),
              label: formatCount(option),
            }))}
          />
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
