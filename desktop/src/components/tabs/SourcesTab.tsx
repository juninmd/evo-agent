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
import {
  CELL,
  CELL_NUM,
  CELL_NUM_LAST,
  MONO,
  ROW,
  TH,
  THEAD,
  TH_NUM,
  TH_NUM_LAST,
} from "../table";

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

  const rows = sources.data?.items ?? [];
  const recent = articles.data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card
        fill
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
        ) : rows.length === 0 ? (
          <EmptyState message={t("sources.empty")} />
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>{t("sources.source")}</th>
                <th className={TH}>{t("sources.primary")}</th>
                <th className={TH_NUM}>{t("sources.articles")}</th>
                <th className={TH}>{t("sources.lastSeen")}</th>
                <th className={TH_NUM}>{t("sources.failures")}</th>
                <th className={TH_NUM_LAST}>{t("sources.skipped")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.source} className={ROW}>
                  <td className={`${CELL} text-fg`}>
                    <span
                      className="block max-w-[38ch] truncate"
                      title={item.source}
                    >
                      {item.source}
                    </span>
                  </td>
                  <td className={`${CELL} ${MONO}`}>
                    {item.primary ? (
                      <Badge tone="accent">{t("common.yes")}</Badge>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className={`${CELL_NUM} evo-num text-muted`}>
                    {formatCount(item.recentArticles)}
                  </td>
                  <td className={`${CELL} whitespace-nowrap text-muted`}>
                    {item.lastSeenAt ? formatRelative(item.lastSeenAt) : "—"}
                  </td>
                  <td className={CELL}>
                    {item.consecutiveFailures > 0 ? (
                      <Badge tone="warn">
                        {formatCount(item.consecutiveFailures)}
                      </Badge>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className={`${CELL_NUM_LAST} evo-num text-faint`}>
                    {item.skipRemaining > 0
                      ? formatCount(item.skipRemaining)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        fill
        title={t("sources.recent")}
        hint={t("sources.days", { days })}
        actions={
          <label className="flex items-center gap-1 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={primaryOnly}
              onChange={(event) => setPrimaryOnly(event.target.checked)}
            />
            {t("common.primaryOnly")}
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
        ) : recent.length === 0 ? (
          <EmptyState message={t("sources.empty")} />
        ) : (
          <ul className="flex flex-col">
            {recent.map((article) => (
              <li
                key={article.id}
                className="flex items-start justify-between gap-2 border-b border-edge/60 py-1.5 last:border-b-0"
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
