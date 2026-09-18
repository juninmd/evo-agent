const MIN_TLDR_ITEMS = 5;
// The model leads with whatever it reads first: news before popularity.
const READING_PRIORITY = [
  "models",
  "releases",
  "vendors",
  "papers",
  "hackernews",
  "reddit",
  "community",
  "github",
];

export function readingOrder<T extends { key: string }>(buckets: T[]): T[] {
  const rank = (key: string) => {
    const index = READING_PRIORITY.indexOf(key);
    return index < 0 ? READING_PRIORITY.length : index;
  };
  return [...buckets].sort((left, right) => rank(left.key) - rank(right.key));
}

export const RADAR_SYSTEM_PROMPT = [
  "Voce escreve o resumo executivo de um radar diario de IA para um tech lead.",
  "Responda em pt-BR, denso, sem floreio, sem introducao e sem conclusao.",
  "Formato exato: uma secao '## TL;DR' com 10 a 12 itens numerados,",
  "seguida de uma secao '## O que observar' com 3 bullets.",
  "Cada item do TL;DR e uma frase curta com um fato concreto (numero, nome de produto ou versao).",
  "Priorize releases de agentes de codigo, mudancas de API/preco e papers com mais votos; cubra frentes diferentes em vez de repetir o mesmo assunto.",
  "Estrelas acumuladas do GitHub nao sao noticia: cite um repositorio so pelo que ele lancou ou mudou, nunca pela contagem de estrelas.",
  "Nao invente dados: use apenas o que esta no material fornecido.",
  "Nao mostre raciocinio nem rascunho: a resposta comeca exatamente em '## TL;DR'.",
].join(" ");

/**
 * Reasoning models behind LiteLLM leak their scratchpad into the text; the
 * edition is whatever follows the last TL;DR heading, or nothing.
 */
export function extractReading(text: string): string | null {
  // Past the first <unk> the model has degenerated; the line it was on is lost.
  const broken = text.indexOf("<unk>");
  const intact =
    broken < 0
      ? text
      : text.slice(0, Math.max(0, text.lastIndexOf("\n", broken)));
  const start = intact.lastIndexOf("## TL;DR");
  if (start < 0) return null;
  const reading = intact.slice(start).trim();
  const items = reading.match(/^\s*\d+\.\s+\S/gm)?.length ?? 0;
  return items >= MIN_TLDR_ITEMS && readsAsPortuguese(reading) ? reading : null;
}

/** The proxy's model drifts to English despite the prompt; function words tell. */
function readsAsPortuguese(text: string): boolean {
  const count = (pattern: RegExp) => text.match(pattern)?.length ?? 0;
  const portuguese = count(
    /\b(de|do|da|dos|das|para|com|que|em|no|na|os|um|uma|por|ao)\b/gi,
  );
  const english = count(
    /\b(the|and|with|for|to|of|in|is|are|now|from|this|that)\b/gi,
  );
  return portuguese >= english;
}
