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

/** A skin e do console; o `data-theme` e o mesmo estado no vocabulario do Sonido. */
export function applyTheme(theme: ThemeId): void {
  const resolved = resolveTheme(theme, isSystemLight());
  const root = document.documentElement;
  root.dataset.skin = resolved;
  root.dataset.theme = resolved === "claro" ? "light" : "dark";
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
