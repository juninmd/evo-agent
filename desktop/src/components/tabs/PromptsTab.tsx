import { useState } from "react";
import { api } from "../../lib/api";
import { formatCount, formatDateTime } from "../../lib/format";
import { promptStatusLabel, t } from "../../lib/i18n";
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
  if (!poll.data) return <Skeleton label={t("app.loading")} />;

  const { active, items } = poll.data;

  return (
    <div className="flex flex-col gap-3">
      {poll.error && (
        <ErrorBanner
          message={t("common.loadFailed", { error: poll.error })}
          busy={poll.loading}
          onRetry={poll.reload}
        />
      )}

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
              <button
                type="button"
                className="evo-btn"
                onClick={() => setShowPrompt((value) => !value)}
              >
                {showPrompt ? t("common.hide") : t("common.show")}
              </button>
              <CopyButton text={active.prompt} />
            </>
          )
        }
      >
        {active ? (
          showPrompt ? (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-edge bg-ink p-2 text-[11px] text-muted">
              {active.prompt}
            </pre>
          ) : (
            <p className="text-xs text-faint">••••••••</p>
          )
        ) : (
          <EmptyState message={t("prompts.none")} />
        )}
      </Card>

      <Card title={t("prompts.versions")} hint={t("prompts.gate")}>
        {items.length === 0 ? (
          <EmptyState message={t("prompts.none")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="py-1 pr-3 font-medium">{t("cycles.id")}</th>
                  <th className="py-1 pr-3 font-medium">
                    {t("prompts.score")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("cycles.status")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("prompts.chars")}
                  </th>
                  <th className="py-1 pr-3 font-medium">
                    {t("prompts.created")}
                  </th>
                  <th className="py-1 font-medium">{t("prompts.reason")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((version) => (
                  <tr
                    key={version.id}
                    className="border-t border-edge/70 align-top"
                  >
                    <td className="evo-num py-1.5 pr-3 text-faint">
                      {version.id}
                    </td>
                    <td className="evo-num py-1.5 pr-3 text-fg">
                      {version.score}
                    </td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={TONES[version.status] ?? "neutral"}>
                        {promptStatusLabel(version.status)}
                      </Badge>
                    </td>
                    <td className="evo-num py-1.5 pr-3 text-muted">
                      {formatCount(version.promptChars)}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-muted">
                      {formatDateTime(version.createdAt)}
                    </td>
                    <td className="py-1.5 text-muted" title={version.reason}>
                      <span className="line-clamp-2">{version.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pt-2 text-[11px] text-faint">
              {t("prompts.rollbackHint")}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
