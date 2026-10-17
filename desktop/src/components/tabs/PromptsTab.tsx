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
import {
  CELL,
  CELL_LAST,
  CELL_NUM,
  MONO,
  ROW,
  TH,
  THEAD,
  TH_LAST,
  TH_NUM,
} from "../table";

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
            <table className="w-full border-collapse text-xs">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>{t("cycles.id")}</th>
                  <th className={TH_NUM}>{t("prompts.score")}</th>
                  <th className={TH}>{t("cycles.status")}</th>
                  <th className={TH_NUM}>{t("prompts.chars")}</th>
                  <th className={TH}>{t("prompts.created")}</th>
                  <th className={TH_LAST}>{t("prompts.reason")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((version) => (
                  <tr key={version.id} className={ROW}>
                    <td className={`${CELL} evo-num ${MONO} text-faint`}>
                      {version.id}
                    </td>
                    <td className={`${CELL_NUM} evo-num font-semibold text-fg`}>
                      {version.score}
                    </td>
                    <td className={CELL}>
                      <Badge tone={TONES[version.status] ?? "neutral"}>
                        {promptStatusLabel(version.status)}
                      </Badge>
                    </td>
                    <td className={`${CELL_NUM} evo-num text-muted`}>
                      {formatCount(version.promptChars)}
                    </td>
                    <td className={`${CELL} whitespace-nowrap text-muted`}>
                      {formatDateTime(version.createdAt)}
                    </td>
                    <td
                      className={`${CELL_LAST} text-muted`}
                      title={version.reason}
                    >
                      <span className="line-clamp-2">{version.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pt-2 text-[11px] text-faint">
              {t("prompts.rollbackHint")}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
