import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { chronological, summarizeCycles } from "../../lib/cycles";
import { formatCount, formatDuration, formatPercent } from "../../lib/format";
import { cycleStatusLabel, runModeLabel, t } from "../../lib/i18n";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import CycleTable from "../CycleTable";
import ErrorBanner from "../ErrorBanner";
import Skeleton from "../Skeleton";
import CycleDurationChart from "../charts/CycleDurationChart";

/** Um numero do resumo: rotulo pequeno em cima, valor embaixo. */
function Figure({
  label,
  value,
  hint,
  tone = "text-fg",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] uppercase tracking-wide text-faint">
        {label}
      </dt>
      <dd className={`text-lg font-semibold leading-6 tracking-tight ${tone}`}>
        {value}
      </dd>
      {hint && <dd className="text-[11px] text-muted">{hint}</dd>}
    </div>
  );
}

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

  const items = useMemo(() => poll.data?.items ?? [], [poll.data]);
  const summary = useMemo(() => summarizeCycles(items), [items]);
  const timeline = useMemo(() => chronological(items), [items]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {items.length > 0 && (
        <section
          aria-label={t("cycles.summary")}
          className="evo-card evo-enter grid shrink-0 gap-3 p-3 lg:grid-cols-[15rem_minmax(0,1fr)]"
        >
          <dl className="grid grid-cols-2 content-start gap-x-3 gap-y-2.5">
            <Figure
              label={t("cycles.successRate")}
              value={
                summary.successRate === null
                  ? "—"
                  : formatPercent(summary.successRate)
              }
              hint={t("cycles.successRateHint", {
                succeeded: formatCount(summary.succeeded),
                decided: formatCount(summary.succeeded + summary.failed),
              })}
              tone={
                summary.successRate === null
                  ? "text-fg"
                  : summary.successRate >= 0.9
                    ? "text-ok"
                    : summary.successRate >= 0.5
                      ? "text-warn"
                      : "text-danger"
              }
            />
            <Figure
              label={t("cycles.failures")}
              value={formatCount(summary.failed)}
              tone={summary.failed > 0 ? "text-danger" : "text-ok"}
            />
            <Figure
              label={t("cycles.median")}
              value={formatDuration(summary.medianSeconds)}
            />
            <Figure
              label={t("cycles.p95")}
              value={formatDuration(summary.p95Seconds)}
            />
          </dl>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-fg">
              {t("cycles.chartTitle")}
            </h2>
            <p className="mb-1 text-[11px] text-muted">
              {t("cycles.chartHint")}
            </p>
            <CycleDurationChart runs={timeline} />
          </div>
        </section>
      )}
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
          <Skeleton label={t("app.loading")} shape="table" />
        ) : (
          <CycleTable runs={items} />
        )}
      </Card>
    </div>
  );
}
