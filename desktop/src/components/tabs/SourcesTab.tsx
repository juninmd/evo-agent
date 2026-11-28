import { Checkbox, type Column, DataTable } from "@juninmd/sonido";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCount, formatRelative } from "../../lib/format";
import { t } from "../../lib/i18n";
import type { SourceView } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import Badge from "../Badge";
import Card from "../Card";
import EmptyState from "../EmptyState";
import ErrorBanner from "../ErrorBanner";
import FilterSelect from "../FilterSelect";
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

  const rows = sources.data?.items ?? [];
  const recent = articles.data?.items ?? [];

  const columns: Column<SourceView>[] = [
    {
      key: "source",
      label: t("sources.source"),
      render: (item) => (
        <span
          className="block max-w-[38ch] truncate text-fg"
          title={item.source}
        >
          {item.source}
        </span>
      ),
    },
    {
      key: "primary",
      label: t("sources.primary"),
      render: (item) =>
        item.primary ? (
          <Badge tone="accent">{t("common.yes")}</Badge>
        ) : (
          <span className="text-faint">-</span>
        ),
    },
    {
      key: "articles",
      label: t("sources.articles"),
      align: "end",
      render: (item) => (
        <span className="text-muted">{formatCount(item.recentArticles)}</span>
      ),
    },
    {
      key: "lastSeen",
      label: t("sources.lastSeen"),
      render: (item) => (
        <span className="whitespace-nowrap text-muted">
          {item.lastSeenAt ? formatRelative(item.lastSeenAt) : "-"}
        </span>
      ),
    },
    {
      key: "failures",
      label: t("sources.failures"),
      align: "end",
      render: (item) =>
        item.consecutiveFailures > 0 ? (
          <Badge tone="warn">{formatCount(item.consecutiveFailures)}</Badge>
        ) : (
          <span className="text-faint">-</span>
        ),
    },
    {
      key: "skipped",
      label: t("sources.skipped"),
      align: "end",
      render: (item) => (
        <span className="text-faint">
          {item.skipRemaining > 0 ? formatCount(item.skipRemaining) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card
        fill
        title={t("sources.health")}
        hint={t("sources.days", { days })}
        actions={
          <FilterSelect
            label={t("sources.window")}
            value={String(days)}
            onChange={(value) => setDays(Number(value))}
            options={WINDOWS.map((window) => ({
              value: String(window),
              label: t("sources.days", { days: window }),
            }))}
          />
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
          <DataTable
            label={t("sources.health")}
            columns={columns}
            rows={rows}
            rowKey={(item) => item.source}
          />
        )}
      </Card>

      <Card
        fill
        title={t("sources.recent")}
        hint={t("sources.days", { days })}
        actions={
          <Checkbox
            label={t("common.primaryOnly")}
            checked={primaryOnly}
            onChange={setPrimaryOnly}
          />
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
