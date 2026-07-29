import type { Article } from "../knowledge/store.js";
import { sanitizeForPrompt } from "../utils/escape.js";
import {
  FOCUS_COMMUNITIES,
  focusCommunity,
  isPrimarySource,
} from "./curation.js";

export interface EditorialHighlight {
  sourceIndex: number;
  headline: string;
  whatHappened: string;
  whyItMatters: string;
  evidence: string;
  /** Long-form prose produced by the expansion pass. Absent in the agenda draft. */
  analysis?: string;
}

export interface EditorialDraft {
  title: string;
  dek: string;
  highlights: EditorialHighlight[];
  synthesis: string;
}

const GENERIC_TITLE_PATTERNS = [
  /^an[aá]lise de tend[eê]ncias$/i,
  /^avan[cç]os em /i,
  /^desenvolvimentos( recentes)? em /i,
  /^not[ií]cias( de tecnologia)?$/i,
  /^panorama( t[eé]cnico)?$/i,
  /^resumo( t[eé]cnico)?/i,
];

/**
 * Filler that makes an edition read like a template instead of a text written
 * by an editor. "Por que importa" was the visible symptom: a fixed label glued
 * to every item. The prose passes are checked against this list too.
 */
export const EDITORIAL_CLICHES =
  /(por que (isso )?importa|interesse crescente|impacto significativo|melhorar a produtividade|produtividade e (a )?efici[eê]ncia|cada vez mais|players do mercado|o per[ií]odo foi marcado|vale (a pena )?destacar|[eé] importante (notar|destacar|ressaltar)|em resumo|nesse sentido|no fim das contas|revolucion(a|á)ri)/i;

const ENGLISH_STOPWORDS =
  /\b(the|and|with|of|for|from|that|this|are|is|to|show|shows|how|why|new|take|taking|first)\b/gi;

/**
 * The sources are mostly English and the model occasionally drifts back into it.
 * Counting English function words is enough to catch a drifted section without
 * flagging pt-BR text that merely quotes a product name.
 */
export function looksEnglish(text: string, threshold: number): boolean {
  return (text.match(ENGLISH_STOPWORDS) ?? []).length >= threshold;
}

export function isGenericTitle(title: string): boolean {
  const normalized = title.trim();
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function formatDate(value: string): string {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

export function editorialPeriod(articles: Article[]): string {
  if (articles.length === 0) return "";
  const timestamps = articles
    .map((article) => new Date(article.crawled_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (timestamps.length === 0) return "";
  const first = formatDate(new Date(timestamps[0]).toISOString());
  const last = formatDate(
    new Date(timestamps[timestamps.length - 1]).toISOString(),
  );
  return first === last ? first : `${first} a ${last}`;
}

export function validateEditorialDraft(
  draft: EditorialDraft,
  sources: Article[],
  options: { maxHighlights: number },
): string[] {
  const errors: string[] = [];
  const usedSources = new Set<number>();
  if (isGenericTitle(draft.title)) errors.push("title is generic");
  if (looksEnglish(draft.title, 2)) errors.push("title is not in pt-BR");
  if (looksEnglish(draft.dek, 3)) errors.push("dek is not in pt-BR");
  if (draft.title.trim().length < 20)
    errors.push("title is not specific enough");
  if (draft.title.trim().length > 100) errors.push("title is too long");
  if (draft.dek.trim().length < 50) errors.push("dek is too short");
  if (draft.highlights.length === 0) errors.push("draft has no highlights");
  if (draft.highlights.length < Math.min(5, sources.length)) {
    errors.push("too few highlights");
  }
  if (draft.highlights.length > options.maxHighlights) {
    errors.push("too many highlights");
  }
  draft.highlights.forEach((highlight, index) => {
    if (
      !Number.isInteger(highlight.sourceIndex) ||
      !sources[highlight.sourceIndex]
    ) {
      errors.push(`highlight ${index + 1} has invalid source index`);
    } else if (usedSources.has(highlight.sourceIndex)) {
      errors.push(`highlight ${index + 1} reuses a source`);
    } else {
      usedSources.add(highlight.sourceIndex);
    }
    if (
      highlight.whatHappened.trim().length < 40 ||
      highlight.whyItMatters.trim().length < 30
    ) {
      errors.push(`highlight ${index + 1} lacks grounded detail`);
    }
    if (
      highlight.evidence?.trim().length < 30 ||
      highlight.evidence?.trim().length > 240
    ) {
      errors.push(`highlight ${index + 1} lacks source evidence`);
    }
  });
  if (draft.synthesis.trim().length < 80) {
    errors.push("synthesis is too short");
  }
  const fullText = [
    draft.title,
    draft.dek,
    draft.synthesis,
    ...draft.highlights.flatMap((highlight) => [
      highlight.whatHappened,
      highlight.whyItMatters,
    ]),
  ].join(" ");
  if (EDITORIAL_CLICHES.test(fullText)) {
    errors.push("draft contains vague editorial language");
  }
  const cited = draft.highlights
    .map((highlight) => sources[highlight.sourceIndex])
    .filter((source): source is Article => Boolean(source));
  const hasPrimaryCandidate = sources.some(isPrimarySource);
  if (hasPrimaryCandidate && !cited.some(isPrimarySource)) {
    errors.push("draft lacks a primary source");
  }
  const hasCommunityCandidate = sources.some((source) =>
    /reddit|hacker news|tabnews|community/i.test(source.source),
  );
  if (
    hasCommunityCandidate &&
    !cited.some((source) =>
      /reddit|hacker news|tabnews|community/i.test(source.source),
    )
  ) {
    errors.push("draft lacks an independent community signal");
  }
  for (const community of Object.keys(FOCUS_COMMUNITIES)) {
    const available = sources.some(
      (source) => focusCommunity(source) === community,
    );
    if (
      available &&
      !cited.some((source) => focusCommunity(source) === community)
    ) {
      errors.push(`draft lacks a post from ${community}`);
    }
  }
  return errors;
}

export function parseEditorialDraft(
  text: string,
  sources: Article[],
  maxHighlights: number,
): EditorialDraft {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Editorial response did not contain JSON");
  const draft = parseEditorialJson(match[0]);
  if (!Array.isArray(draft.highlights)) {
    throw new Error("Editorial response has invalid highlights");
  }
  draft.title = boundedTitle(draft.title);
  draft.dek = typeof draft.dek === "string" ? draft.dek : "";
  draft.synthesis = typeof draft.synthesis === "string" ? draft.synthesis : "";
  const seenSources = new Set<number>();
  draft.highlights = draft.highlights.filter((highlight) => {
    if (
      !highlight ||
      !Number.isInteger(highlight.sourceIndex) ||
      !sources[highlight.sourceIndex] ||
      seenSources.has(highlight.sourceIndex)
    ) {
      return false;
    }
    seenSources.add(highlight.sourceIndex);
    highlight.headline =
      typeof highlight.headline === "string" ? highlight.headline : "";
    highlight.whatHappened =
      typeof highlight.whatHappened === "string" ? highlight.whatHappened : "";
    highlight.whyItMatters =
      typeof highlight.whyItMatters === "string" ? highlight.whyItMatters : "";
    highlight.evidence =
      typeof highlight.evidence === "string" ? highlight.evidence : "";
    return true;
  });
  for (const highlight of draft.highlights) {
    const source = sources[highlight.sourceIndex];
    if (source) {
      highlight.evidence = source.summary.trim().slice(0, 240);
    }
  }
  const errors = validateEditorialDraft(draft, sources, { maxHighlights });
  if (errors.length > 0) {
    throw new Error(`Editorial draft invalid: ${errors.join("; ")}`);
  }
  return draft;
}

const TRAILING_CONNECTORS =
  /[\s,;:–—-]+(de|do|da|dos|das|e|em|com|para|por|que|a|o|as|os|no|na|nos|nas|ao|aos|à|às|sobre|entre)$/i;

function boundedTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  const title = value.trim();
  if (title.length <= 100) return title;
  const prefix = title.slice(0, 100);
  const lastSpace = prefix.lastIndexOf(" ");
  const cut = (lastSpace >= 60 ? prefix.slice(0, lastSpace) : prefix).trim();
  // Truncating mid-phrase leaves titles like "... entra em guerra de".
  return cut.replace(TRAILING_CONNECTORS, "").replace(/[\s,;:–—-]+$/, "");
}

export function parseEditorialJson(value: string): EditorialDraft {
  let inString = false;
  let escaped = false;
  let repaired = "";
  for (const char of value) {
    if (escaped) {
      repaired += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      repaired += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      repaired += char;
      continue;
    }
    if (inString && (char === "\n" || char === "\r" || char === "\t")) {
      repaired += char === "\t" ? "\\t" : "\\n";
      continue;
    }
    repaired += char;
  }
  return JSON.parse(repaired) as EditorialDraft;
}

export function buildEditorialPrompt(
  articles: Article[],
  period: string,
  maxHighlights: number,
): string {
  const minimumHighlights = Math.min(5, articles.length, maxHighlights);
  const communityIndexes = articles.flatMap((article, index) =>
    /reddit|hacker news|tabnews|community/i.test(article.source) ? [index] : [],
  );
  const primaryIndexes = articles.flatMap((article, index) =>
    isPrimarySource(article) ? [index] : [],
  );
  const focusLines = Object.keys(FOCUS_COMMUNITIES).flatMap((community) => {
    const indexes = articles.flatMap((article, index) =>
      focusCommunity(article) === community ? [index] : [],
    );
    return indexes.length > 0
      ? [`  - ${community}: ${indexes.join(", ")}`]
      : [];
  });
  const sources = articles
    .map(
      (article, index) =>
        `[${index}] SOURCE=${sanitizeForPrompt(article.source, 120)}\nTITLE=${sanitizeForPrompt(article.title, 240)}\nEVIDENCE=${sanitizeForPrompt(article.summary, 600)}\nURL=${article.url}`,
    )
    .join("\n\n");

  return `Produza uma edição técnica em português brasileiro para o período ${period}.

FONTES CONFIÁVEIS:
${sources}

Retorne JSON válido:
{
  "title": "título específico que nomeia 1-2 descobertas centrais",
  "dek": "duas frases que resumem a edição sem clichês",
  "highlights": [
    {
      "sourceIndex": 0,
      "headline": "rótulo factual curto",
      "whatHappened": "o que ocorreu, somente com fatos presentes em EVIDENCE",
      "whyItMatters": "impacto técnico concreto para engenharia, operação ou produto",
      "evidence": "trecho factual curto extraído ou fielmente condensado de EVIDENCE"
    }
  ],
  "synthesis": "2-3 parágrafos conectando apenas os destaques selecionados"
}

Regras:
- Escreva todos os campos em português brasileiro, inclusive o título, mesmo quando a fonte estiver em inglês.
- Escolha de ${minimumHighlights} a ${maxHighlights} pautas com sourceIndex distintos; qualidade acima de cobertura.
- Cada destaque usa exatamente um sourceIndex existente.
- ${
    primaryIndexes.length > 0
      ? `Inclua obrigatoriamente ao menos um destes sourceIndex primários: ${primaryIndexes.join(", ")}.`
      : "Não há fonte primária disponível nesta seleção."
  }
- ${
    communityIndexes.length > 0
      ? `Inclua obrigatoriamente ao menos um destes sourceIndex comunitários: ${communityIndexes.join(", ")}.`
      : "Não há fonte comunitária disponível nesta seleção."
  }
- ${
    focusLines.length > 0
      ? `Comunidades em foco — escolha ao menos um sourceIndex de CADA grupo abaixo e trate esses destaques com a mesma profundidade dos anúncios oficiais:\n${focusLines.join("\n")}`
      : "Não há comunidades em foco nesta seleção."
  }
- Quando houver vários sinais do Reddit, priorize 2-4 deles se trouxerem relatos técnicos, limitações reais, regressões, benchmarks ou padrões de adoção observados por usuários.
- evidence deve conter 30-240 caracteres e permanecer fiel ao campo EVIDENCE da fonte.
- Não invente números, versões, capacidades, datas ou anúncios.
- Não use frases vagas como "o período foi marcado", "cada vez mais" ou "players do mercado".
- Nunca escreva "por que importa", "vale destacar", "é importante notar", "em resumo" ou "nesse sentido"; escreva como um editor humano, não como um template.
- Em "whyItMatters", nomeie uma decisão concreta: orçamento, integração, risco, arquitetura, migração, operação ou adoção. Não escreva apenas "melhora produtividade e eficiência".
- Compare ao menos um anúncio oficial com um sinal independente de Hacker News, Reddit ou TabNews quando disponível.
- Não use os títulos genéricos "Notícias de Tecnologia", "Panorama Técnico", "Desenvolvimentos em IA" ou equivalentes.
- O título deve citar pelo menos um produto, organização, técnica ou mudança concreta. Não comece com "Avanços em".
- Não inclua Markdown, links ou diagrama; o programa adicionará as citações.`;
}
