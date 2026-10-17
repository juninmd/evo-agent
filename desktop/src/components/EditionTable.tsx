import { formatCount, metricNumber } from "../lib/format";
import { editionKindLabel, notificationLabel, t } from "../lib/i18n";
import type { Edition } from "../lib/types";
import Badge, { type Tone } from "./Badge";
import EmptyState from "./EmptyState";

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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
            <th className="py-1 pr-3 font-medium">
              {t("editions.filterKind")}
            </th>
            <th className="py-1 pr-3 font-medium">{t("common.title")}</th>
            <th className="py-1 pr-3 font-medium">
              {t("editions.filterStatus")}
            </th>
            {!compact && (
              <>
                <th className="py-1 pr-3 font-medium">
                  {t("editions.sources")}
                </th>
                <th className="py-1 pr-3 font-medium">
                  {t("editions.quality")}
                </th>
                <th className="py-1 font-medium">{t("editions.attempts")}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {editions.map((edition) => (
            <tr
              key={edition.slug}
              className="border-t border-edge/70 align-top"
            >
              <td className="py-1.5 pr-3 whitespace-nowrap">
                <Badge tone={edition.kind === "article" ? "accent" : "info"}>
                  {editionKindLabel(edition)}
                </Badge>
              </td>
              <td className="py-1.5 pr-3">
                <button
                  type="button"
                  disabled={!onOpen}
                  onClick={() => onOpen?.(edition.slug)}
                  className="block max-w-[46ch] truncate text-left text-fg hover:text-accent-text disabled:cursor-default"
                  title={`${edition.title} — ${edition.url}`}
                >
                  {edition.title}
                </button>
                <span className="text-[11px] text-faint">
                  {edition.date} · {edition.slug}
                </span>
              </td>
              <td className="py-1.5 pr-3">
                <Badge tone={NOTIFICATION_TONES[edition.notificationStatus]}>
                  {notificationLabel(edition.notificationStatus)}
                </Badge>
              </td>
              {!compact && (
                <>
                  <td className="evo-num py-1.5 pr-3 text-muted">
                    {formatCount(
                      metricNumber(edition.editorialMetrics, "selected"),
                    )}
                  </td>
                  <td className="evo-num py-1.5 pr-3 text-muted">
                    {formatCount(
                      metricNumber(edition.editorialMetrics, "primarySources"),
                    )}
                  </td>
                  <td className="evo-num py-1.5 text-faint">
                    {edition.notificationAttempts}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
