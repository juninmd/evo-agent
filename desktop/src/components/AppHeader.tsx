import { formatDateTime, hostOf } from "../lib/format";
import { t } from "../lib/i18n";
import type { ThemeId } from "../lib/theme";
import type { HealthStatus } from "../lib/types";
import StatusPill from "./StatusPill";

function Mark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6 shrink-0 rounded-md bg-ink p-0.5"
    >
      <polyline
        points="3,17 9,12 14,15 21,6"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="6" r="1.7" fill="var(--color-accent-text)" />
    </svg>
  );
}

const NEXT_THEME: Record<ThemeId, string> = {
  escuro: t("app.theme.toLight"),
  claro: "Seguir o sistema",
  sistema: t("app.theme.toDark"),
};

export default function AppHeader({
  baseUrl,
  status,
  reasons,
  updatedAt,
  loading,
  onRefresh,
  theme,
  onCycleTheme,
}: {
  baseUrl: string | null;
  status: HealthStatus | null;
  reasons: string[];
  updatedAt: number | null;
  loading: boolean;
  onRefresh: () => void;
  theme: ThemeId;
  onCycleTheme: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-edge bg-panel px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Mark />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-fg">
            {t("app.title")}
          </h1>
          <p className="truncate text-[11px] text-muted">
            {baseUrl
              ? t("app.apiHost", { host: hostOf(baseUrl) })
              : t("settings.notConfigured")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {status && <StatusPill status={status} reasons={reasons} />}
        {updatedAt !== null && (
          <span className="text-[11px] text-faint">
            {t("app.updatedAt", {
              time: formatDateTime(new Date(updatedAt).toISOString()),
            })}
          </span>
        )}
        <button
          type="button"
          className="evo-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label={t("app.refresh")}
          title={t("app.refresh")}
        >
          <span aria-hidden="true">⟳</span>
          {t("app.refresh")}
        </button>
        <button
          type="button"
          className="evo-btn"
          onClick={onCycleTheme}
          title={NEXT_THEME[theme]}
          aria-label={NEXT_THEME[theme]}
        >
          <span aria-hidden="true">
            {theme === "escuro" ? "◐" : theme === "claro" ? "◑" : "◒"}
          </span>
        </button>
      </div>
    </header>
  );
}
