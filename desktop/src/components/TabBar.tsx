import { t } from "../lib/i18n";
import { TABS, type TabId, nextTabIndex, panelId, tabId } from "../lib/tabs";

/** Padrao WAI-ARIA de abas: um unico Tab stop, setas/Home/End trocam de aba. */
export default function TabBar({
  current,
  onChange,
}: {
  current: TabId;
  onChange: (tab: TabId) => void;
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

  return (
    <div className="shrink-0 border-b border-edge bg-panel px-3">
      <nav
        role="tablist"
        aria-label={t("tabs.label")}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-0.5 py-1 text-xs"
      >
        {TABS.map((tab) => {
          const active = tab.id === current;
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
              className={`relative rounded-lg px-2 py-1 transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                active
                  ? "font-semibold text-fg after:bg-accent"
                  : "text-muted after:bg-transparent hover:bg-hover hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
