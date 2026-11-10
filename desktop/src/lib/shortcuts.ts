import { TABS, type TabId } from "./tabs";

export type ShortcutAction = { kind: "tab"; tab: TabId } | { kind: "refresh" };

type KeyLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

type TargetLike = {
  tagName?: string;
  isContentEditable?: boolean;
} | null;

/** Digitar "1" num campo e digitar, nao navegar. */
export function isTypingTarget(target: TargetLike): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Atalhos sem modificador: `1`..`7` abrem a aba naquela posicao e `r` rele a
 * API. Com Ctrl/Cmd/Alt a tecla e do sistema (Ctrl+R recarrega o webview em
 * desenvolvimento) e o console nao a intercepta.
 */
export function shortcutFor(
  event: KeyLike,
  target: TargetLike,
): ShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(target)) return null;
  if (event.key === "r" || event.key === "R") return { kind: "refresh" };
  if (/^[1-9]$/.test(event.key)) {
    const tab = TABS[Number(event.key) - 1];
    return tab ? { kind: "tab", tab: tab.id } : null;
  }
  return null;
}
