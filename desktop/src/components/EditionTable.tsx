import { type Column, DataTable } from "@juninmd/sonido";
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

  const columns: Column<Edition>[] = [
    {
      key: "kind",
      label: t("editions.filterKind"),
      render: (edition) => (
        <span className="whitespace-nowrap">
          <Badge tone={edition.kind === "article" ? "accent" : "info"}>
            {editionKindLabel(edition)}
          </Badge>
        </span>
      ),
    },
    {
      key: "title",
      label: t("common.title"),
      render: (edition) => (
        <>
          <button
            type="button"
            disabled={!onOpen}
            onClick={() => onOpen?.(edition.slug)}
            className="block max-w-[46ch] truncate text-left text-fg hover:text-accent-text disabled:cursor-default"
            title={`${edition.title} - ${edition.url}`}
          >
            {edition.title}
          </button>
          <span className="block font-mono text-[11px] text-faint">
            {edition.date} · {edition.slug}
          </span>
        </>
      ),
    },
    {
      key: "notification",
      label: t("editions.filterStatus"),
      render: (edition) => (
        <Badge tone={NOTIFICATION_TONES[edition.notificationStatus]}>
          {notificationLabel(edition.notificationStatus)}
        </Badge>
      ),
    },
    ...(compact
      ? []
      : [
          {
            key: "sources",
            label: t("editions.sources"),
            align: "end" as const,
            render: (edition: Edition) => (
              <span className="text-muted">
                {formatCount(
                  metricNumber(edition.editorialMetrics, "selected"),
                )}
              </span>
            ),
          },
          {
            key: "quality",
            label: t("editions.quality"),
            align: "end" as const,
            render: (edition: Edition) => (
              <span className="text-muted">
                {formatCount(
                  metricNumber(edition.editorialMetrics, "primarySources"),
                )}
              </span>
            ),
          },
          {
            key: "attempts",
            label: t("editions.attempts"),
            align: "end" as const,
            render: (edition: Edition) => (
              <span className="text-faint">{edition.notificationAttempts}</span>
            ),
          },
        ]),
  ];

  return (
    <DataTable
      label={t("editions.title")}
      columns={columns}
      rows={editions}
      rowKey={(edition) => edition.slug}
    />
  );
}
