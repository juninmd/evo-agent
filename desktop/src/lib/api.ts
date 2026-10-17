import { invoke } from "@tauri-apps/api/core";
import type {
  ArticlePage,
  CycleRun,
  Edition,
  EditionDetail,
  Health,
  Meta,
  Metrics,
  Overview,
  Page,
  Prompts,
  RunAccepted,
  SettingsView,
  SourcePage,
} from "./types";

/** O unico lugar do frontend que chama `invoke`: os nomes aqui sao o contrato
 * com `src-tauri/src/commands.rs` e nao podem divergir de um lado so. */
export const api = {
  settingsGet: () => invoke<SettingsView>("settings_get"),
  /** `token: null` mantem o token salvo; string vazia limpa. */
  settingsSave: (baseUrl: string, token: string | null) =>
    invoke<SettingsView>("settings_save", { baseUrl, token }),
  /** Prova URL e token em uma chamada: `/api/v1/meta` exige autenticacao. */
  settingsTest: () => invoke<Meta>("settings_test"),

  overview: () => invoke<Overview>("overview"),
  health: () => invoke<Health>("health"),
  meta: () => invoke<Meta>("meta"),

  editions: (
    options: { limit?: number; kind?: string; status?: string } = {},
  ) =>
    invoke<Page<Edition>>("editions", {
      limit: options.limit ?? null,
      kind: options.kind ?? null,
      status: options.status ?? null,
    }),
  editionDetail: (slug: string) =>
    invoke<EditionDetail>("edition_detail", { slug }),

  articles: (
    options: { days?: number; limit?: number; primary?: boolean } = {},
  ) =>
    invoke<ArticlePage>("articles", {
      days: options.days ?? null,
      limit: options.limit ?? null,
      primary: options.primary ?? false,
    }),
  sources: (days?: number) =>
    invoke<SourcePage>("sources", { days: days ?? null }),
  cycles: (options: { limit?: number; kind?: string; status?: string } = {}) =>
    invoke<Page<CycleRun>>("cycles", {
      limit: options.limit ?? null,
      kind: options.kind ?? null,
      status: options.status ?? null,
    }),
  prompts: () => invoke<Prompts>("prompts"),
  metrics: (options: { name?: string; hours?: number } = {}) =>
    invoke<Metrics>("metrics", {
      name: options.name ?? null,
      hours: options.hours ?? null,
    }),

  runStart: (mode: string) => invoke<RunAccepted>("run_start", { mode }),
  openExternal: (url: string) => invoke<void>("open_external", { url }),
};

/** O Rust ja devolve a mensagem pronta para o usuario. */
export function errText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "erro inesperado";
}
