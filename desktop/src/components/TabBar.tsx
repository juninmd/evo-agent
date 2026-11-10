import { useLayoutEffect, useRef, useState } from "react";
import type { Attention } from "../lib/attention";
import { t } from "../lib/i18n";
import { TABS, type TabId, nextTabIndex, panelId, tabId } from "../lib/tabs";

const TONES: Record<Attention["tone"], string> = {
  warn: "bg-warn/20 text-warn",
  danger: "bg-danger/20 text-danger",
  info: "bg-info/20 text-info",
};

/** Padrao WAI-ARIA de abas: um unico Tab stop, setas/Home/End trocam de aba. */
export default function TabBar({
  current,
  onChange,
  attention = {},
}: {
  current: TabId;
  onChange: (tab: TabId) => void;
  /** O que exige olhar em cada aba; a aba sem entrada nao mostra badge. */
  attention?: Partial<Record<TabId, Attention>>;
}) {
  function onKeyDown(event: React.KeyboardEvent) {
    const target = nextTabIndex(current, event.key);
    if (target === null) return;
    event.preventDefault();
    const next = TABS[target];
    onChange(next.id);
    // A aba nova existe depois do render: o foco vai no proximo frame.
    window.requestAnimationFrame(() =>
      document.getElementById(tabId(next.id))?.focus(),
    );
  }

  // Um unico marcador que desliza ate a aba ativa. A posicao e medida no DOM
  // porque a largura de cada aba depende do rotulo e do badge.
  const listRef = useRef<HTMLElement | null>(null);
  const [marker, setMarker] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: um badge que aparece ou some muda a largura das abas, entao `attention` tambem refaz a medida.
  useLayoutEffect(() => {
    const list = listRef.current;
    const button = document.getElementById(tabId(current));
    if (!list || !button) return;
    const measure = () =>
      setMarker({
        left: button.offsetLeft + 8,
        top: button.offsetTop + button.offsetHeight - 2,
        width: Math.max(0, button.offsetWidth - 16),
      });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [current, attention]);

  return (
    <div className="shrink-0 border-b border-edge bg-panel px-3">
      <nav
        ref={listRef}
        role="tablist"
        aria-label={t("tabs.label")}
        title={t("shortcuts.hint")}
        onKeyDown={onKeyDown}
        className="relative flex flex-wrap gap-0.5 py-1 text-xs"
      >
        {marker && (
          <span
            aria-hidden="true"
            data-testid="tab-marker"
            className="pointer-events-none absolute left-0 top-0 h-0.5 rounded-full bg-accent transition-[transform,width] duration-200 ease-out"
            style={{
              width: marker.width,
              transform: `translate(${marker.left}px, ${marker.top}px)`,
            }}
          />
        )}
        {TABS.map((tab) => {
          const active = tab.id === current;
          const badge = attention[tab.id];
          return (
            <button
              key={tab.id}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={active ? panelId(tab.id) : undefined}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              title={badge?.title}
              aria-keyshortcuts={String(TABS.indexOf(tab) + 1)}
              className={`relative flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                active
                  ? "font-semibold text-fg"
                  : "text-muted hover:bg-hover hover:text-fg"
              }`}
            >
              {tab.label}
              {badge && (
                <>
                  <span
                    aria-hidden="true"
                    className={`evo-num rounded px-1 text-[10px] font-semibold leading-4 ${TONES[badge.tone]}`}
                  >
                    {badge.count}
                  </span>
                  {/* Leitor de tela ouve o numero com contexto, nao um digito solto. */}
                  <span className="sr-only">— {badge.title}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
