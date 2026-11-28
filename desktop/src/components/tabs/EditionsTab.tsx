import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatCount } from "../../lib/format";
import { type MessageKey, notificationLabel, t } from "../../lib/i18n";
import type { Edition } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import EditionDetailPanel from "../EditionDetailPanel";
import EditionTable from "../EditionTable";
import EmptyState from "../EmptyState";
import ErrorBanner from "../ErrorBanner";
import FilterSelect from "../FilterSelect";
import Skeleton from "../Skeleton";

const LIMITS = [25, 50, 100, 200];

const KINDS: { value: string; label: MessageKey }[] = [
  { value: "", label: "editions.kind.all" },
  { value: "article", label: "editions.kind.article" },
  { value: "report", label: "editions.kind.report" },
];

const STATUSES: (Edition["notificationStatus"] | "")[] = [
  "",
  "delivered",
  "pending",
  "dead_letter",
  "suppressed",
];

export default function EditionsTab() {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(50);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const poll = usePoll(
    `editions:${kind}:${status}:${limit}`,
    () => api.editions({ kind, status, limit }),
    30_000,
  );

  const items = useMemo(() => poll.data?.items ?? [], [poll.data]);

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Card
        fill
        title={t("editions.title")}
        hint={t("editions.count", { total: items.length })}
        actions={
          <>
            <FilterSelect
              label={t("editions.filterKind")}
              value={kind}
              onChange={setKind}
              options={KINDS.map((option) => ({
                value: option.value,
                label: t(option.label),
              }))}
            />
            <FilterSelect
              label={t("editions.filterStatus")}
              value={status}
              onChange={setStatus}
              options={STATUSES.map((option) => ({
                value: option,
                label:
                  option === ""
                    ? t("editions.status.all")
                    : notificationLabel(option),
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
          <EditionTable editions={items} onOpen={setOpenSlug} />
        )}
      </Card>

      {openSlug ? (
        <EditionDetailPanel slug={openSlug} onClose={() => setOpenSlug(null)} />
      ) : (
        <aside className="hidden min-h-0 lg:block">
          <Card fill className="h-full">
            <EmptyState message={t("editions.selectHint")} />
          </Card>
        </aside>
      )}
    </div>
  );
}
