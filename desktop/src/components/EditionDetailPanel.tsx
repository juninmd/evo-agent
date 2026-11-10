import { useEffect, useState } from "react";
import { api, errText } from "../lib/api";
import { formatCount, formatFullDateTime, metricNumber } from "../lib/format";
import {
  editionKindLabel,
  lifecycleLabel,
  notificationLabel,
  revisionReasonLabel,
  t,
} from "../lib/i18n";
import type { EditionDetail } from "../lib/types";
import Badge, { type Tone } from "./Badge";
import ErrorBanner from "./ErrorBanner";
import { CloseIcon, ExternalIcon } from "./Icons";
import Skeleton from "./Skeleton";
import SegmentedBar from "./charts/SegmentedBar";

const TONES: Record<string, Tone> = {
  delivered: "ok",
  pending: "warn",
  dead_letter: "danger",
  suppressed: "neutral",
};

/**
 * Quanto do que foi considerado entrou na edicao, e quanto disso e fonte
 * primaria. Sem os tres numeros (paginas antigas, radar) nao ha funil.
 */
function Funnel({ metrics }: { metrics: Record<string, unknown> }) {
  const considered = metricNumber(metrics, "considered");
  const selected = metricNumber(metrics, "selected");
  const rejected = metricNumber(metrics, "rejected");
  if (considered === null || selected === null || rejected === null) {
    return null;
  }
  const primary = Math.min(
    selected,
    metricNumber(metrics, "primarySources") ?? 0,
  );
  return (
    <section>
      <h3 className="text-xs font-semibold text-fg">{t("editions.funnel")}</h3>
      <p className="mb-1.5 text-[11px] text-muted">
        {t("editions.funnelHint", {
          selected: formatCount(selected),
          considered: formatCount(considered),
        })}
      </p>
      <SegmentedBar
        label={t("editions.funnel")}
        formatValue={formatCount}
        segments={[
          {
            key: "primary",
            label: t("editions.funnelPrimary"),
            value: primary,
            className: "bg-accent",
          },
          {
            key: "other",
            label: t("editions.funnelOther"),
            value: selected - primary,
            className: "bg-info",
          },
          {
            key: "rejected",
            label: t("editions.metrics.rejected"),
            value: rejected,
            className: "bg-line",
          },
        ]}
      />
    </section>
  );
}

export default function EditionDetailPanel({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EditionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    api
      .editionDetail(slug)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(errText(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <aside className="evo-card evo-enter flex min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-edge px-3 py-2">
        <h2 className="truncate font-mono text-xs font-semibold text-fg">
          {slug}
        </h2>
        <button
          type="button"
          className="evo-btn"
          onClick={onClose}
          aria-label={t("editions.close")}
        >
          <CloseIcon className="size-3.5" />
          {t("editions.close")}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error && <ErrorBanner message={t("common.loadFailed", { error })} />}
        {!detail && !error && <Skeleton label={t("app.loading")} />}

        {detail && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-fg">
                {detail.edition.title}
              </p>
              <p className="text-[11px] text-faint">
                {formatFullDateTime(detail.edition.publishedAt)} ·{" "}
                {detail.edition.url}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge
                tone={detail.edition.kind === "article" ? "accent" : "info"}
              >
                {editionKindLabel(detail.edition)}
              </Badge>
              <Badge
                tone={TONES[detail.edition.notificationStatus] ?? "neutral"}
              >
                {notificationLabel(detail.edition.notificationStatus)}
              </Badge>
              {detail.edition.status !== "published" && (
                <Badge
                  tone={
                    detail.edition.status === "retracted" ? "danger" : "info"
                  }
                >
                  {lifecycleLabel(detail.edition.status)}
                </Badge>
              )}
              {detail.edition.revision > 1 && (
                <Badge>
                  {t("editions.revision", {
                    revision: detail.edition.revision,
                  })}
                </Badge>
              )}
              {detail.edition.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>

            {detail.edition.summary && (
              <p className="text-xs text-muted">{detail.edition.summary}</p>
            )}

            <Funnel metrics={detail.edition.editorialMetrics} />

            {detail.edition.notificationError && (
              <div className="rounded-lg border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">
                <p className="font-semibold">
                  {t("editions.notificationError")}
                </p>
                <p className="break-words">
                  {detail.edition.notificationError}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="evo-btn evo-btn-primary"
                onClick={() => void api.openExternal(detail.edition.url)}
              >
                <ExternalIcon className="size-3.5" />
                {t("common.openInBrowser")}
              </button>
            </div>

            <section>
              <h3 className="text-xs font-semibold text-fg">
                {t("editions.evidence")}
              </h3>
              <p className="mb-1.5 text-[11px] text-muted">
                {t("editions.evidenceHint", { count: detail.evidence.length })}
              </p>
              <ul className="flex flex-col gap-1.5">
                {detail.evidence.map((item) => (
                  <li
                    key={item.sourceUrl}
                    className="rounded-lg border border-edge px-2 py-1.5"
                  >
                    <button
                      type="button"
                      className="text-left text-xs text-accent-text hover:underline"
                      onClick={() => void api.openExternal(item.sourceUrl)}
                    >
                      {item.sourceTitle}
                    </button>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {item.excerpt}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {detail.revisions.length > 1 && (
              <section>
                <h3 className="text-xs font-semibold text-fg">
                  {t("editions.revisions")}
                </h3>
                <ol className="mt-1 flex flex-col text-[11px]">
                  {detail.revisions.map((revision) => (
                    <li
                      key={revision.revision}
                      className="flex items-center justify-between gap-2 border-t border-edge/60 py-1 first:border-t-0"
                    >
                      <span className="text-fg">
                        <span className="evo-num font-medium">
                          {t("editions.revision", {
                            revision: revision.revision,
                          })}
                        </span>{" "}
                        <span className="text-muted">
                          · {revisionReasonLabel(revision.reason)}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-faint">
                        {formatFullDateTime(revision.createdAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
