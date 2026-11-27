import { Button, ConfirmButton, TextField, useToast } from "@juninmd/sonido";
import { useState } from "react";
import { api, errText } from "../../lib/api";
import { formatDateTime, formatDuration, formatNumber } from "../../lib/format";
import { t } from "../../lib/i18n";
import type { ThemeId } from "../../lib/theme";
import type { Meta, SettingsView } from "../../lib/types";
import Card from "../Card";
import ErrorBanner from "../ErrorBanner";
import { MonitorIcon, MoonIcon, SunIcon } from "../Icons";
import Skeleton from "../Skeleton";

const THEME_OPTIONS: {
  id: ThemeId;
  label: () => string;
  Icon: (props: { className?: string }) => React.ReactElement;
}[] = [
  { id: "escuro", label: () => t("settings.themeDark"), Icon: MoonIcon },
  { id: "claro", label: () => t("settings.themeLight"), Icon: SunIcon },
  { id: "sistema", label: () => t("settings.themeSystem"), Icon: MonitorIcon },
];

function ConnectionCard({ meta }: { meta: Meta | undefined }) {
  if (!meta) return <Skeleton label={t("app.loading")} />;

  const rows: [string, string, boolean?][] = [
    [t("settings.runMode"), meta.runMode, true],
    [t("settings.timezone"), meta.timezone, true],
    [t("settings.database"), meta.database.path, true],
    [
      t("settings.uptime"),
      `${formatDuration(meta.uptimeSeconds)} · ${formatDateTime(meta.startedAt)}`,
    ],
    [t("settings.crawl"), `${meta.schedule.crawlIntervalMinutes} min`],
    [
      t("settings.article"),
      `${meta.schedule.articleCron} · ${meta.dailyEditions}/dia`,
      true,
    ],
    [t("settings.radar"), meta.schedule.radarCron, true],
    [t("settings.modelAlerts"), meta.schedule.modelAlertCron, true],
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
      {rows.map(([label, value, mono]) => (
        <div key={label} className="rounded-lg border border-edge px-2 py-1.5">
          <dt className="text-[10px] uppercase tracking-wide text-faint">
            {label}
          </dt>
          <dd
            className={`break-words text-xs text-fg ${mono ? "font-mono text-[11px]" : ""}`}
          >
            {value}
          </dd>
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
  const toast = useToast();
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? "");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "clear" | null>(null);

  /** `null` mantem o token salvo; "" limpa; qualquer texto substitui. */
  async function save(nextToken: string | null, label: string) {
    setBusy(nextToken === "" ? "clear" : "save");
    setError(null);
    try {
      const view = await api.settingsSave(baseUrl, nextToken);
      onSaved(view);
      setToken("");
      toast({ title: label, tone: "success" });
    } catch (cause) {
      setError(errText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setError(null);
    try {
      await api.settingsTest();
      toast({ title: t("settings.testOk"), tone: "success" });
    } catch (cause) {
      setError(t("settings.testFailed", { error: errText(cause) }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card title={t("settings.title")}>
        {/* Os campos ficam contidos: um input de 1000 px nao se le. */}
        {/* Um form de verdade: Enter num campo salva, como o usuario espera. */}
        <form
          className="flex max-w-2xl flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy !== null || baseUrl.trim() === "") return;
            void save(token === "" ? null : token, t("settings.saved"));
          }}
        >
          <TextField
            label={t("settings.apiUrl")}
            type="url"
            inputMode="url"
            spellCheck={false}
            placeholder="https://evo-agent.exemplo.svc"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            hint={t("settings.apiUrlHint")}
            className="font-mono"
          />

          <TextField
            label={t("settings.token")}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={settings?.hasToken ? "••••••••" : "API_TOKEN"}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            hint={
              settings?.hasToken
                ? t("settings.tokenStored")
                : t("settings.tokenMissing")
            }
            className="font-mono"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={busy !== null || baseUrl.trim() === ""}
              loading={busy === "save"}
            >
              {t("settings.save")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy !== null}
              loading={busy === "test"}
              onClick={() => void test()}
            >
              {t("settings.test")}
            </Button>
            {settings?.hasToken && (
              <ConfirmButton
                appearance="inline"
                className="sn-button sn-button--secondary sn-button--sm"
                ask={t("settings.clearTokenAsk")}
                confirmLabel={t("settings.clearToken")}
                cancelLabel={t("common.cancel")}
                disabled={busy !== null}
                onConfirm={() => void save("", t("settings.tokenMissing"))}
              >
                {t("settings.clearToken")}
              </ConfirmButton>
            )}
          </div>

          {error && <ErrorBanner message={error} />}
        </form>
      </Card>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Sem token nao ha o que conectar: um "Carregando..." permanente era um
            spinner que nunca resolvia. */}
        {settings?.hasToken && (
          <Card title={t("settings.connection")}>
            <ConnectionCard meta={meta} />
          </Card>
        )}

        <Card title={t("settings.theme")}>
          <fieldset
            aria-label={t("settings.theme")}
            className="flex flex-col gap-1.5"
          >
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={theme === option.id ? "primary" : "secondary"}
                size="sm"
                aria-pressed={theme === option.id}
                onClick={() => onTheme(option.id)}
                iconStart={<option.Icon className="size-3.5" />}
              >
                {option.label()}
              </Button>
            ))}
          </fieldset>
        </Card>
      </div>
    </div>
  );
}
