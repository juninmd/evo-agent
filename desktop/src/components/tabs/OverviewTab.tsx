import { api } from "../../lib/api";
import { formatCount, formatDateTime, formatNumber } from "../../lib/format";
import { healthReasonLabel, t } from "../../lib/i18n";
import type { TabId } from "../../lib/tabs";
import type { Overview, Stats } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import CycleTable from "../CycleTable";
import EditionTable from "../EditionTable";
import ErrorBanner from "../ErrorBanner";
import RunPanel from "../RunPanel";
import Skeleton from "../Skeleton";
import StatTile from "../StatTile";
import CycleStrip from "../charts/CycleStrip";
import Meter from "../charts/Meter";
import PublicationCalendar from "../charts/PublicationCalendar";
import SegmentedBar from "../charts/SegmentedBar";

const CALENDAR_DAYS = 35;

/** Leitura propria e lenta: o calendario so muda quando sai uma edicao. */
function CalendarCard() {
  const calendar = usePoll(
    "calendar",
    () => api.calendar(CALENDAR_DAYS),
    300_000,
  );
  return (
    <Card
      title={t("calendar.title")}
      hint={
        calendar.data
          ? t("calendar.hint", {
              days: calendar.data.days.length,
              target: calendar.data.target,
            })
          : undefined
      }
    >
      {calendar.error && !calendar.data ? (
        <ErrorBanner
          message={t("common.loadFailed", { error: calendar.error })}
          busy={calendar.loading}
          onRetry={calendar.reload}
        />
      ) : !calendar.data ? (
        <Skeleton label={t("app.loading")} shape="chart" />
      ) : (
        <PublicationCalendar calendar={calendar.data} />
      )}
    </Card>
  );
}

function StatGrid({ stats, overview }: { stats: Stats; overview: Overview }) {
  return (
    <div className="evo-stagger grid grid-cols-2 gap-2 lg:grid-cols-4">
      <StatTile
        label={t("overview.editionsToday")}
        value={`${overview.editionsToday}/${overview.dailyEditionsTarget}`}
        tone={
          overview.editionsToday >= overview.dailyEditionsTarget ? "ok" : "warn"
        }
      >
        <Meter
          value={overview.editionsToday}
          max={overview.dailyEditionsTarget}
          label={t("overview.editionsProgress")}
          className={
            overview.editionsToday >= overview.dailyEditionsTarget
              ? "text-ok"
              : "text-warn"
          }
        />
      </StatTile>
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
    return <Skeleton label={t("app.loading")} shape="tiles" />;
  }

  const { health } = overview;
  const healthySources = Math.max(
    0,
    overview.sources.total - overview.sources.failing,
  );

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
        <section
          className={`rounded-lg border px-3 py-2 text-xs ${
            health.status === "critical"
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-warn/40 bg-warn/10 text-warn"
          }`}
        >
          <h2 className="font-semibold">{t("overview.healthReasons")}</h2>
          <ul className="mt-0.5 list-inside list-disc">
            {health.reasons.map((reason) => (
              <li key={reason}>{healthReasonLabel(reason)}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label={t("overview.stats")}>
        <StatGrid stats={overview.stats} overview={overview} />
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-3">
        <CalendarCard />

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
          <SegmentedBar
            label={t("overview.sourcesBar")}
            formatValue={formatCount}
            segments={[
              {
                key: "healthy",
                label: t("overview.sourcesHealthy"),
                value: healthySources,
                className: "bg-ok",
              },
              {
                key: "failing",
                label: t("overview.sourcesFailingLabel"),
                value: overview.sources.failing,
                className: "bg-warn",
              },
            ]}
          />
          <p className="mt-1.5 text-[11px] text-muted">
            {t("overview.sourcesPrimary", {
              count: formatCount(overview.sources.primary),
            })}
            {" · "}
            {t("overview.sourcesTotal", {
              count: formatCount(overview.sources.total),
            })}
          </p>
          {overview.intelligence && (
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
          )}
        </Card>

        <Card title={t("overview.runTitle")}>
          <RunPanel overview={overview} modes={runModes} onStarted={onRetry} />
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
          <>
            {/* A API devolve o mais novo primeiro; a fita le no sentido do tempo. */}
            <CycleStrip runs={[...overview.lastCycles].reverse()} />
            <button
              type="button"
              className="evo-btn"
              onClick={() => onOpenTab("cycles")}
            >
              {t("overview.viewAll")}
            </button>
          </>
        }
      >
        <CycleTable runs={overview.lastCycles} compact />
      </Card>
    </div>
  );
}
