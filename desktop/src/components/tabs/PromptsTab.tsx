import { Button, type Column, DataTable } from "@juninmd/sonido";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCount, formatDateTime } from "../../lib/format";
import { promptStatusLabel, t } from "../../lib/i18n";
import type { PromptVersion } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import Badge, { type Tone } from "../Badge";
import Card from "../Card";
import CopyButton from "../CopyButton";
import EmptyState from "../EmptyState";
import ErrorBanner from "../ErrorBanner";
import Skeleton from "../Skeleton";

const TONES: Record<string, Tone> = {
  promoted: "ok",
  rejected: "danger",
  rolled_back: "warn",
};

export default function PromptsTab() {
  const [showPrompt, setShowPrompt] = useState(false);
  const poll = usePoll("prompts", () => api.prompts(), 60_000);

  if (poll.error && !poll.data) {
    return (
      <ErrorBanner
        message={t("common.loadFailed", { error: poll.error })}
        busy={poll.loading}
        onRetry={poll.reload}
      />
    );
  }

  const { active, items } = poll.data ?? { active: null, items: [] };

  const columns: Column<PromptVersion>[] = [
    {
      key: "id",
      label: t("cycles.id"),
      render: (version) => (
        <span className="font-mono text-[11px] text-faint">{version.id}</span>
      ),
    },
    {
      key: "score",
      label: t("prompts.score"),
      align: "end",
      render: (version) => (
        <span className="font-semibold text-fg">{version.score}</span>
      ),
    },
    {
      key: "status",
      label: t("cycles.status"),
      render: (version) => (
        <Badge tone={TONES[version.status] ?? "neutral"}>
          {promptStatusLabel(version.status)}
        </Badge>
      ),
    },
    {
      key: "chars",
      label: t("prompts.chars"),
      align: "end",
      render: (version) => (
        <span className="text-muted">{formatCount(version.promptChars)}</span>
      ),
    },
    {
      key: "created",
      label: t("prompts.created"),
      render: (version) => (
        <span className="whitespace-nowrap text-muted">
          {formatDateTime(version.createdAt)}
        </span>
      ),
    },
    {
      key: "reason",
      label: t("prompts.reason"),
      render: (version) => (
        <span className="line-clamp-2 text-muted" title={version.reason}>
          {version.reason}
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card
        title={t("prompts.active")}
        hint={
          active
            ? t("prompts.activeHint", {
                chars: formatCount(active.chars),
                time: formatDateTime(active.updatedAt),
              })
            : undefined
        }
        actions={
          active && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPrompt((value) => !value)}
              >
                {showPrompt ? t("common.hide") : t("common.show")}
              </Button>
              <CopyButton text={active.prompt} />
            </>
          )
        }
      >
        {!poll.data && !poll.error ? (
          <Skeleton label={t("app.loading")} />
        ) : active ? (
          showPrompt ? (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-edge bg-ink p-2.5 text-[11px] leading-relaxed text-muted">
              {active.prompt}
            </pre>
          ) : (
            <p className="text-xs text-faint">
              ••••••••••••••••••••••••••••••••••
            </p>
          )
        ) : (
          <EmptyState message={t("prompts.none")} />
        )}
      </Card>

      <Card fill title={t("prompts.versions")} hint={t("prompts.gate")}>
        {items.length === 0 ? (
          <EmptyState message={t("prompts.none")} />
        ) : (
          <>
            <DataTable
              label={t("prompts.versions")}
              columns={columns}
              rows={items}
              rowKey={(version) => String(version.id)}
            />
            <p className="pt-2 text-[11px] text-faint">
              {t("prompts.rollbackHint")}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
