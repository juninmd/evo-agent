import type { ModelCard } from "../../crawler/model-launches.js";
import { priceLine } from "../../crawler/model-launches.js";
import { escapeHtml } from "../../utils/escape.js";
import { link, plain } from "../skill-week/render.js";
import type { BriefItem, Section } from "./rank.js";

const HEADINGS: Record<Section, string> = {
  breaking: "O que vai quebrar",
  claude: "Novidades do Claude",
  models: "Modelos novos",
  repos: "Repositórios em alta",
  tools: "Ferramentas novas",
};
const ICONS: Record<Section, string> = {
  breaking: "⚠️",
  claude: "🟠",
  models: "🧠",
  repos: "⭐",
  tools: "🛠️",
};
export const SECTION_ORDER: Section[] = [
  "breaking",
  "claude",
  "models",
  "repos",
  "tools",
];

/** Like plain(), but keeps underscores: API names (billing_policy) must survive. */
export function clip(text: string, max: number): string {
  return plain(text.replace(/_/g, "\ue000"), max).replace(/\ue000/g, "_");
}

function fence(command: string): string {
  return `\`\`\`bash\n${command}\n\`\`\``;
}

/** Release notes title an item with its own first words; print only the rest. */
export function restAfterTitle(item: BriefItem): string {
  const core = item.title
    .replace(/^Até \d{2}\/\d{2}\/\d{4}: /, "")
    .replace(/…$/, "")
    .trim();
  return core && item.line.startsWith(core)
    ? item.line.slice(core.length).trim()
    : item.line;
}

function renderItem(item: BriefItem): string {
  const rest = restAfterTitle(item);
  return [
    `- **${link(clip(item.title, 110), item.url)}**${rest ? `: ${clip(rest, 300)}` : ""}`,
    item.command ? `\n${fence(item.command)}` : "",
  ].join("");
}

function money(value: number | null): string {
  return value === null ? "?" : `$${value}`;
}

/** Comparable at a glance: price, context, weights, where to run. */
export function renderModelTable(cards: ModelCard[]): string {
  if (cards.length === 0) return "";
  return [
    "| Modelo | Entrada / saída (1M tokens) | Contexto | Pesos | Onde rodar |",
    "|---|---|---:|---|---|",
    ...cards.map((card) => {
      const where = [
        link("OpenRouter", card.url),
        card.hfUrl ? link("Hugging Face", card.hfUrl) : "",
      ]
        .filter(Boolean)
        .join(" · ");
      const context = card.context
        ? `${Math.round(card.context / 1000)}k`
        : "?";
      return `| ${plain(card.name, 60)} | ${money(card.inputPrice)} / ${money(card.outputPrice)} | ${context} | ${card.openWeights ? "abertos" : "fechados"} | ${where} |`;
    }),
  ].join("\n");
}

export function renderBriefPage(
  sections: Map<Section, BriefItem[]>,
  cards: ModelCard[],
): string {
  const parts: string[] = [];
  for (const section of SECTION_ORDER) {
    const items = sections.get(section) ?? [];
    if (section === "models") {
      if (cards.length === 0) continue;
      parts.push(`## ${HEADINGS.models}`, renderModelTable(cards));
      continue;
    }
    if (items.length === 0) continue;
    parts.push(`## ${HEADINGS[section]}`, items.map(renderItem).join("\n"));
  }
  return parts.join("\n\n");
}

/** Telegram HTML: numbered so the vote buttons below can point at each line. */
export function renderBriefMessage(title: string, top: BriefItem[]): string {
  const lines = top.map((item, index) => {
    const rest = restAfterTitle(item);
    return `${index + 1}. ${ICONS[item.section]} <a href="${escapeHtml(item.url)}">${escapeHtml(clip(item.title, 90))}</a>${rest ? `\n${escapeHtml(clip(rest, 180))}` : ""}`;
  });
  return `⚡ <b>${escapeHtml(title)}</b> · Evo Agent\n\n${lines.join("\n\n")}\n\n<i>Vote em cada item: o ranking aprende com você.</i>`;
}

export function modelLine(card: ModelCard): string {
  const price = priceLine(card);
  return [
    price,
    card.context ? `${Math.round(card.context / 1000)}k de contexto` : "",
    card.openWeights ? "pesos abertos" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
