import { formatCount, formatDateTime, formatNumber } from "../../lib/format";
import { healthReasonLabel, t } from "../../lib/i18n";
import type { TabId } from "../../lib/tabs";
import type { Overview, Stats } from "../../lib/types";
import Badge from "../Badge";
import Card from "../Card";
import CycleTable from "../CycleTable";
import EditionTable from "../EditionTable";
import ErrorBanner from "../ErrorBanner";
import RunPanel from "../RunPanel";
import Skeleton from "../Skeleton";
import StatTile from "../StatTile";

function StatGrid({ stats, overview }: { stats: Stats; overview: Overview }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <StatTile
        label={t("overview.editionsToday")}
        value={`${overview.editionsToday}/${overview.dailyEditionsTarget}`}
        tone={
          overview.editionsToday >= overview.dailyEditionsTarget ? "ok" : "warn"
        }
      />
      <StatTile
        label={t("overview.recentArticles")}
        value={formatCount(stats.recentArticles)}
        tone={stats.recentArticles === 0 ? "warn" : undefined}
      />
      <StatTile
        label={t("overview.primarySources")}
        value={formatCount(stats.recentPrimarySources)}
        tone={stats.recentPrimarySources === 0 ? "warn" : "ok"}
      />
      <StatTile
        label={t("overview.cyclesOk")}
        value={formatCount(stats.successfulCycles24h)}
        tone={stats.successfulCycles24h === 0 ? "danger" : undefined}
      />
      <StatTile
        label={t("overview.cyclesFailed")}
        value={formatCount(stats.failedCycles24h)}
        tone={stats.failedCycles24h > 0 ? "warn" : "ok"}
      />
      <StatTile
        label={t("overview.pendingNotifications")}
        value={formatCount(stats.pendingNotifications)}
        hint={
          stats.stalePendingNotifications > 0
            ? t("overview.stalePending")
            : undefined
        }
        tone={stats.pendingNotifications > 5 ? "warn" : undefined}
      />
      <StatTile
        label={t("overview.deadLetter")}
        value={formatCount(stats.deadLetterNotifications)}
        tone={stats.deadLetterNotifications > 0 ? "danger" : "ok"}
      />
      <StatTile
        label={t("overview.staleRunning")}
        value={formatCount(stats.staleRunningCycles)}
        tone={stats.staleRunningCycles > 0 ? "danger" : "ok"}
      />
    </div>
  );
}

export default function OverviewTab({
  overview,
  loading,
  error,
  onRetry,
  onOpenTab,
  runModes,
}: {
  overview: Overview | undefined;
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
  onOpenTab: (tab: TabId) => void;
  runModes: string[];
}) {
  if (error && !overview) {
    return (
      <ErrorBanner
        message={t("common.loadFailed", { error })}
        busy={loading}
        onRetry={onRetry}
      />
    );
  }
  if (!overview) {
    return <Skeleton label={t("app.loading")} />;
  }

  const { health } = overview;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <ErrorBanner
          message={t("common.loadFailed", { error })}
          busy={loading}
          onRetry={onRetry}
        />
      )}

      {health.reasons.length > 0 && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            health.status === "critical"
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-warn/40 bg-warn/10 text-warn"
          }`}
        >
          <p className="font-semibold">{t("overview.healthReasons")}</p>
          <ul className="mt-0.5 list-inside list-disc">
            {health.reasons.map((reason) => (
              <li key={reason}>{healthReasonLabel(reason)}</li>
            ))}
          </ul>
        </div>
      )}

      <section aria-label={t("overview.stats")}>
        <StatGrid stats={overview.stats} overview={overview} />
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Card title={t("overview.runTitle")}>
          <RunPanel overview={overview} modes={runModes} onStarted={onRetry} />
        </Card>

        <Card
          title={t("overview.sources")}
          hint={t("overview.sourcesHint", {
            failing: formatCount(overview.sources.failing),
            total: formatCount(overview.sources.total),
            primary: formatCount(overview.sources.primary),
          })}
          actions={
            <button
              type="button"
              className="evo-btn"
              onClick={() => onOpenTab("sources")}
            >
              {t("overview.viewAll")}
            </button>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={overview.sources.failing > 0 ? "warn" : "ok"}>
              {t("overview.sourcesFailing", {
                count: formatCount(overview.sources.failing),
              })}
            </Badge>
            <Badge tone="accent">
              {t("overview.sourcesPrimary", {
                count: formatCount(overview.sources.primary),
              })}
            </Badge>
            <Badge>
              {t("overview.sourcesTotal", {
                count: formatCount(overview.sources.total),
              })}
            </Badge>
          </div>
          {overview.intelligence ? (
            <div className="mt-2 border-t border-edge pt-2">
              <p className="text-[11px] uppercase tracking-wide text-faint">
                {t("overview.intelligence")}
              </p>
              <p className="text-sm text-fg">
                {overview.intelligence.topModel}{" "}
                <span className="evo-num text-muted">
                  {formatNumber(overview.intelligence.topScore, 1)}
                </span>
              </p>
              <p className="text-[11px] text-faint">
                {t("overview.intelligenceHint", {
                  day: overview.intelligence.day,
                })}
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <Card
        title={t("overview.latestEditions")}
        actions={
          <button
            type="button"
            className="evo-btn"
            onClick={() => onOpenTab("editions")}
          >
            {t("overview.viewAll")}
          </button>
        }
      >
        <EditionTable editions={overview.latestEditions} compact />
      </Card>

      <Card
        title={t("overview.lastCycles")}
        hint={
          overview.lastCycles[0]
            ? formatDateTime(overview.lastCycles[0].startedAt)
            : undefined
        }
        actions={
          <button
            type="button"
            className="evo-btn"
            onClick={() => onOpenTab("cycles")}
          >
            {t("overview.viewAll")}
          </button>
        }
      >
        <CycleTable runs={overview.lastCycles} compact />
      </Card>
    </div>
  );
}
