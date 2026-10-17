import { formatCount, metricNumber } from "../lib/format";
import { editionKindLabel, notificationLabel, t } from "../lib/i18n";
import type { Edition } from "../lib/types";
import Badge, { type Tone } from "./Badge";
import EmptyState from "./EmptyState";
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
} from "./table";

const NOTIFICATION_TONES: Record<Edition["notificationStatus"], Tone> = {
  delivered: "ok",
  pending: "warn",
  dead_letter: "danger",
  suppressed: "neutral",
};

export default function EditionTable({
  editions,
  onOpen,
  compact = false,
}: {
  editions: Edition[];
  onOpen?: (slug: string) => void;
  compact?: boolean;
}) {
  if (editions.length === 0) {
    return <EmptyState message={t("editions.empty")} />;
  }

  return (
    <table className="w-full border-collapse text-xs">
      <thead className={THEAD}>
        <tr>
          <th className={TH}>{t("editions.filterKind")}</th>
          <th className={TH}>{t("common.title")}</th>
          <th className={TH}>{t("editions.filterStatus")}</th>
          {!compact && (
            <>
              <th className={TH_NUM}>{t("editions.sources")}</th>
              <th className={TH_NUM}>{t("editions.quality")}</th>
              <th className={TH_NUM_LAST}>{t("editions.attempts")}</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {editions.map((edition) => (
          <tr key={edition.slug} className={ROW}>
            <td className={`${CELL} whitespace-nowrap`}>
              <Badge tone={edition.kind === "article" ? "accent" : "info"}>
                {editionKindLabel(edition)}
              </Badge>
            </td>
            <td className={CELL}>
              <button
                type="button"
                disabled={!onOpen}
                onClick={() => onOpen?.(edition.slug)}
                className="block max-w-[46ch] truncate text-left text-fg hover:text-accent-text disabled:cursor-default"
                title={`${edition.title} — ${edition.url}`}
              >
                {edition.title}
              </button>
              <span className={`${MONO} text-faint`}>
                {edition.date} · {edition.slug}
              </span>
            </td>
            <td className={CELL}>
              <Badge tone={NOTIFICATION_TONES[edition.notificationStatus]}>
                {notificationLabel(edition.notificationStatus)}
              </Badge>
            </td>
            {!compact && (
              <>
                <td className={`${CELL_NUM} evo-num text-muted`}>
                  {formatCount(
                    metricNumber(edition.editorialMetrics, "selected"),
                  )}
                </td>
                <td className={`${CELL_NUM} evo-num text-muted`}>
                  {formatCount(
                    metricNumber(edition.editorialMetrics, "primarySources"),
                  )}
                </td>
                <td className={`${CELL_NUM_LAST} evo-num text-faint`}>
                  {edition.notificationAttempts}
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
