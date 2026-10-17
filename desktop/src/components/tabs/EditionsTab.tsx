import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatCount } from "../../lib/format";
import { type MessageKey, notificationLabel, t } from "../../lib/i18n";
import type { Edition } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import Card from "../Card";
import EditionDetailPanel from "../EditionDetailPanel";
import EditionTable from "../EditionTable";
import ErrorBanner from "../ErrorBanner";
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

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted">
      {label}
      <select
        className="evo-field px-1.5 py-0.5 text-[11px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

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
    <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card
        title={t("editions.title")}
        hint={t("editions.count", { total: items.length })}
        actions={
          <>
            <Select
              label={t("editions.filterKind")}
              value={kind}
              onChange={setKind}
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </Select>
            <Select
              label={t("editions.filterStatus")}
              value={status}
              onChange={setStatus}
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option === ""
                    ? t("editions.status.all")
                    : notificationLabel(option)}
                </option>
              ))}
            </Select>
            <Select
              label={t("editions.limit")}
              value={limit}
              onChange={(value) => setLimit(Number(value))}
            >
              {LIMITS.map((option) => (
                <option key={option} value={option}>
                  {formatCount(option)}
                </option>
              ))}
            </Select>
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
        <aside className="evo-card hidden items-center justify-center p-4 text-center text-[11px] text-faint lg:flex">
          {t("editions.selectHint")}
        </aside>
      )}
    </div>
  );
}
