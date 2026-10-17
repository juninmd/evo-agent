import { useState } from "react";
import { api } from "../../lib/api";
import { formatCount, formatRelative } from "../../lib/format";
import { t } from "../../lib/i18n";
import { usePoll } from "../../lib/usePoll";
import Badge from "../Badge";
import Card from "../Card";
import EmptyState from "../EmptyState";
import ErrorBanner from "../ErrorBanner";
import Skeleton from "../Skeleton";

const WINDOWS = [1, 3, 7, 30];

export default function SourcesTab() {
  const [days, setDays] = useState(7);
  const [primaryOnly, setPrimaryOnly] = useState(false);

  const sources = usePoll(`sources:${days}`, () => api.sources(days), 60_000);
  const articles = usePoll(
    `articles:${days}:${primaryOnly}`,
    () => api.articles({ days, limit: 100, primary: primaryOnly }),
    60_000,
  );

  return (
    <div className="flex flex-col gap-3">
      <Card
        title={t("sources.health")}
        hint={t("sources.days", { days })}
        actions={
          <label className="flex items-center gap-1 text-[11px] text-muted">
            {t("sources.window")}
            <select
              className="evo-field px-1.5 py-0.5 text-[11px]"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {t("sources.days", { days: window })}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {sources.error && (
          <div className="mb-2">
            <ErrorBanner
              message={t("common.loadFailed", { error: sources.error })}
              busy={sources.loading}
              onRetry={sources.reload}
            />
          </div>
        )}
        {!sources.data && !sources.error ? (
          <Skeleton label={t("app.loading")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="py-1 pr-3 font-medium">
                    {t("sources.source")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("sources.primary")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("sources.articles")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("sources.lastSeen")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("sources.failures")}
                  </th>
                  <th className="py-1 font-medium">{t("sources.skipped")}</th>
                </tr>
              </thead>
              <tbody>
                {(sources.data?.items ?? []).map((item) => (
                  <tr key={item.source} className="border-t border-edge/70">
                    <td
                      className="max-w-[32ch] truncate py-1.5 pr-3 text-fg"
                      title={item.source}
                    >
                      {item.source}
                    </td>
                    <td className="py-1.5 pr-3">
                      {item.primary ? (
                        <Badge tone="accent">sim</Badge>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="evo-num py-1.5 pr-3 text-muted">
                      {formatCount(item.recentArticles)}
                    </td>
                    <td className="py-1.5 pr-3 text-muted">
                      {item.lastSeenAt ? formatRelative(item.lastSeenAt) : "—"}
                    </td>
                    <td className="py-1.5 pr-3">
                      {item.consecutiveFailures > 0 ? (
                        <Badge tone="warn">
                          {formatCount(item.consecutiveFailures)}
                        </Badge>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="evo-num py-1.5 text-faint">
                      {item.skipRemaining > 0
                        ? formatCount(item.skipRemaining)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(sources.data?.items ?? []).length === 0 && (
              <EmptyState message={t("sources.empty")} />
            )}
          </div>
        )}
      </Card>

      <Card
        title={t("sources.recent")}
        hint={t("sources.days", { days })}
        actions={
          <label className="flex items-center gap-1 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={primaryOnly}
              onChange={(event) => setPrimaryOnly(event.target.checked)}
            />
            {t("sources.primary")}
          </label>
        }
      >
        {articles.error && (
          <div className="mb-2">
            <ErrorBanner
              message={t("common.loadFailed", { error: articles.error })}
              busy={articles.loading}
              onRetry={articles.reload}
            />
          </div>
        )}
        {!articles.data && !articles.error ? (
          <Skeleton label={t("app.loading")} />
        ) : (
          <ul className="flex flex-col gap-1">
            {(articles.data?.items ?? []).map((article) => (
              <li
                key={article.id}
                className="flex items-start justify-between gap-2 border-b border-edge/60 pb-1 last:border-b-0"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    className="block max-w-[70ch] truncate text-left text-xs text-fg hover:text-accent-text"
                    title={article.url}
                    onClick={() => void api.openExternal(article.url)}
                  >
                    {article.title}
                  </button>
                  <p className="text-[11px] text-faint">
                    {article.source} · {formatRelative(article.crawledAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {article.primary && (
                    <Badge tone="accent">{t("sources.primary")}</Badge>
                  )}
                  <Badge>{formatCount(article.engagementScore)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
