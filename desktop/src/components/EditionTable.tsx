import { formatCount, metricNumber } from "../lib/format";
import {
  editionKindLabel,
  lifecycleLabel,
  notificationLabel,
  t,
} from "../lib/i18n";
import type { Edition } from "../lib/types";
import Badge, { type Tone } from "./Badge";
import EmptyState from "./EmptyState";
import Meter from "./charts/Meter";
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

/** Faixas da pontuacao editorial (0-100), as mesmas do portao de promocao. */
export function scoreTone(score: number): "ok" | "warn" | "danger" {
  if (score >= 80) return "ok";
  if (score >= 60) return "warn";
  return "danger";
}

const SCORE_TEXT = { ok: "text-ok", warn: "text-warn", danger: "text-danger" };

const LIFECYCLE_TONES: Record<Edition["status"], Tone> = {
  published: "neutral",
  corrected: "info",
  retracted: "danger",
};

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
              <th className={TH}>{t("editions.score")}</th>
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
              {/* "Publicada" e o estado normal: so o desvio ganha badge. */}
              {edition.status !== "published" && (
                <span className="ml-1.5">
                  <Badge tone={LIFECYCLE_TONES[edition.status] ?? "neutral"}>
                    {lifecycleLabel(edition.status)}
                  </Badge>
                </span>
              )}
            </td>
            <td className={CELL}>
              <Badge tone={NOTIFICATION_TONES[edition.notificationStatus]}>
                {notificationLabel(edition.notificationStatus)}
              </Badge>
            </td>
            {!compact && (
              <>
                <td className={CELL}>
                  {edition.qualityScore === null ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <span className="flex w-20 flex-col gap-1">
                      <span className="evo-num font-medium text-fg">
                        {edition.qualityScore}
                      </span>
                      <Meter
                        value={edition.qualityScore}
                        max={100}
                        label={t("editions.scoreOf", {
                          score: edition.qualityScore,
                        })}
                        className={SCORE_TEXT[scoreTone(edition.qualityScore)]}
                      />
                    </span>
                  )}
                </td>
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
