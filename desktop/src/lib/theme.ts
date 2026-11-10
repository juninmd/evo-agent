export type ThemeId = "escuro" | "claro" | "sistema";
export type ResolvedTheme = Exclude<ThemeId, "sistema">;

const KEY = "evo-console.theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

export const THEMES: ThemeId[] = ["escuro", "claro", "sistema"];

export function isThemeId(value: string | null): value is ThemeId {
  return value !== null && (THEMES as string[]).includes(value);
}

export function loadTheme(): ThemeId {
  if (typeof localStorage === "undefined") return "escuro";
  const saved = localStorage.getItem(KEY);
  return isThemeId(saved) ? saved : "escuro";
}

/** "sistema" vira claro ou escuro conforme a preferencia do SO. */
export function resolveTheme(
  theme: ThemeId,
  systemLight: boolean,
): ResolvedTheme {
  if (theme !== "sistema") return theme;
  return systemLight ? "claro" : "escuro";
}

export function isSystemLight(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(LIGHT_QUERY).matches;
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.skin = resolveTheme(theme, isSystemLight());
  localStorage.setItem(KEY, theme);
}

/** Reaplica quando o SO troca de tema com o console aberto. */
export function followSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(LIGHT_QUERY);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}

export function nextTheme(theme: ThemeId): ThemeId {
  if (theme === "escuro") return "claro";
  if (theme === "claro") return "sistema";
  return "escuro";
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

/**
 * Roda `update` dentro de uma View Transition quando o webview tem a API e a
 * pessoa nao pediu menos movimento; senao, roda direto. A troca de tema vira
 * um fade curto em vez de um corte seco.
 */
export function withThemeTransition(update: () => void): void {
  const target = document as TransitionDocument;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof target.startViewTransition !== "function") {
    update();
    return;
  }
  target.startViewTransition(update);
}
