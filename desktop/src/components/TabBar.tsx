import { type TabItem, Tabs } from "@juninmd/sonido";
import type { Attention } from "../lib/attention";
import { t } from "../lib/i18n";
import { TABS, type TabId } from "../lib/tabs";
import Badge, { type Tone } from "./Badge";

const TONES: Record<Attention["tone"], Tone> = {
  warn: "warn",
  danger: "danger",
  info: "info",
};

/**
 * Abas do console no `Tabs` do Sonido: tablist WAI-ARIA com foco itinerante
 * (setas, Home, End). O contador de atencao vira `Badge` mais um texto
 * `visually-hidden`, para o leitor de tela ouvir o motivo e nao um digito solto.
 */
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
  const items: TabItem<TabId>[] = TABS.map((tab) => {
    const badge = attention[tab.id];
    return {
      key: tab.id,
      label: tab.label,
      badge: badge ? (
        <>
          <Badge tone={TONES[badge.tone]}>{badge.count}</Badge>
          <span className="sn-visually-hidden">{badge.title}</span>
        </>
      ) : undefined,
    };
  });

  return (
    <div className="shrink-0 bg-panel px-2 pt-1">
      <Tabs
        label={t("tabs.label")}
        items={items}
        value={current}
        onChange={onChange}
        idPrefix="aba"
        variant="underline"
      />
    </div>
  );
}
