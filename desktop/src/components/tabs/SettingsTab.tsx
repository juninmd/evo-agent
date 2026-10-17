import { useState } from "react";
import { api, errText } from "../../lib/api";
import { formatDateTime, formatDuration, formatNumber } from "../../lib/format";
import { t } from "../../lib/i18n";
import type { ThemeId } from "../../lib/theme";
import type { Meta, SettingsView } from "../../lib/types";
import Card from "../Card";
import ErrorBanner from "../ErrorBanner";
import Skeleton from "../Skeleton";

const THEME_KEYS: { id: ThemeId; label: () => string }[] = [
  { id: "escuro", label: () => t("settings.themeDark") },
  { id: "claro", label: () => t("settings.themeLight") },
  { id: "sistema", label: () => t("settings.themeSystem") },
];

function ConnectionCard({ meta }: { meta: Meta | undefined }) {
  if (!meta) return <Skeleton label={t("app.loading")} />;

  const rows: [string, string][] = [
    [t("settings.runMode"), meta.runMode],
    [t("settings.timezone"), meta.timezone],
    [t("settings.database"), meta.database.path],
    [
      t("settings.uptime"),
      `${formatDuration(meta.uptimeSeconds)} · ${formatDateTime(meta.startedAt)}`,
    ],
    [t("settings.crawl"), `${meta.schedule.crawlIntervalMinutes} min`],
    [
      t("settings.article"),
      `${meta.schedule.articleCron} · ${meta.dailyEditions}/dia`,
    ],
    [t("settings.radar"), meta.schedule.radarCron],
    [t("settings.modelAlerts"), meta.schedule.modelAlertCron],
    [
      t("settings.runsEnabled"),
      meta.runsEnabled
        ? t("settings.runsEnabledValue", {
            modes: formatNumber(meta.runnableModes.length, 0),
          })
        : t("settings.runsDisabledValue"),
    ],
  ];

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-edge px-2 py-1.5">
          <dt className="text-[10px] uppercase tracking-wide text-faint">
            {label}
          </dt>
          <dd className="break-words text-xs text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function SettingsTab({
  settings,
  meta,
  theme,
  onTheme,
  onSaved,
}: {
  settings: SettingsView | null;
  meta: Meta | undefined;
  theme: ThemeId;
  onTheme: (theme: ThemeId) => void;
  onSaved: (view: SettingsView) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? "");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "clear" | null>(null);

  /** `null` mantem o token salvo; "" limpa; qualquer texto substitui. */
  async function save(nextToken: string | null, label: string) {
    setBusy(nextToken === "" ? "clear" : "save");
    setNotice(null);
    setError(null);
    try {
      const view = await api.settingsSave(baseUrl, nextToken);
      onSaved(view);
      setToken("");
      setNotice(label);
    } catch (cause) {
      setError(errText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setNotice(null);
    setError(null);
    try {
      await api.settingsTest();
      setNotice(t("settings.testOk"));
    } catch (cause) {
      setError(t("settings.testFailed", { error: errText(cause) }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card title={t("settings.title")}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("settings.apiUrl")}
            <input
              type="url"
              inputMode="url"
              spellCheck={false}
              className="evo-field px-2 py-1 text-xs"
              placeholder="https://evo-agent.exemplo.svc"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
            <span className="text-[11px] text-faint">
              {t("settings.apiUrlHint")}
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("settings.token")}
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="evo-field px-2 py-1 text-xs"
              placeholder={settings?.hasToken ? "••••••••" : "API_TOKEN"}
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <span className="text-[11px] text-faint">
              {settings?.hasToken
                ? t("settings.tokenStored")
                : t("settings.tokenMissing")}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="evo-btn evo-btn-primary"
              disabled={busy !== null || baseUrl.trim() === ""}
              onClick={() =>
                void save(token === "" ? null : token, t("settings.saved"))
              }
            >
              {t("settings.save")}
            </button>
            <button
              type="button"
              className="evo-btn"
              disabled={busy !== null}
              onClick={() => void test()}
            >
              {t("settings.test")}
            </button>
            {settings?.hasToken && (
              <button
                type="button"
                className="evo-btn"
                disabled={busy !== null}
                onClick={() => void save("", t("settings.tokenMissing"))}
              >
                {t("settings.clearToken")}
              </button>
            )}
          </div>

          {notice && <p className="text-[11px] text-ok">{notice}</p>}
          {error && <ErrorBanner message={error} onRetry={undefined} />}
        </div>
      </Card>

      <Card title={t("settings.connection")}>
        <ConnectionCard meta={meta} />
      </Card>

      <Card title={t("settings.theme")}>
        <fieldset
          aria-label={t("settings.theme")}
          className="flex flex-wrap gap-1.5"
        >
          {THEME_KEYS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={theme === option.id}
              className={`evo-btn ${theme === option.id ? "evo-btn-primary" : ""}`}
              onClick={() => onTheme(option.id)}
            >
              {option.label()}
            </button>
          ))}
        </fieldset>
      </Card>
    </div>
  );
}
