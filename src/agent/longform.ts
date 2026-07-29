import type { Article } from "../knowledge/store.js";
import { sanitizeForPrompt } from "../utils/escape.js";
import { log } from "../utils/logger.js";
import {
  EDITORIAL_CLICHES,
  type EditorialDraft,
  looksEnglish,
} from "./editorial.js";

const ANALYSIS_MIN_CHARS = 700;
const SYNTHESIS_MIN_CHARS = 900;

const STYLE_RULES = `Regras de escrita:
- Parágrafos corridos em português brasileiro. Nada de listas, bullets, subtítulos, tabelas ou emojis.
- Nunca use rótulos fixos como "Por que importa", "O que aconteceu", "Contexto:", "Em resumo" ou "Vale destacar". O texto deve fluir como análise escrita por uma pessoa.
- Não use "cada vez mais", "players do mercado", "impacto significativo", "revolucionário" nem outras frases de preenchimento.
- Não invente números, versões, datas, benchmarks, nomes ou capacidades que não estejam na evidência.
- Não escreva URLs nem links; as citações são adicionadas pelo programa.
- Prefira frases concretas: o que muda na arquitetura, no custo, no risco, na operação ou na decisão de adoção de quem lê.`;

export function proseIssues(text: string, minChars: number): string[] {
  const issues: string[] = [];
  const trimmed = text.trim();
  if (trimmed.length < minChars) {
    issues.push(
      `texto curto demais (${trimmed.length}/${minChars} caracteres)`,
    );
  }
  if (/^\s*[-*+]\s+/m.test(trimmed)) issues.push("contém lista com bullets");
  if (/^\s*#{1,6}\s+/m.test(trimmed)) issues.push("contém subtítulo markdown");
  if (/https?:\/\//i.test(trimmed)) issues.push("contém URL");
  const cliche = trimmed.match(EDITORIAL_CLICHES);
  if (cliche) issues.push(`usa a expressão proibida "${cliche[0]}"`);
  if (looksEnglish(trimmed, 8)) issues.push("não está em português brasileiro");
  return issues;
}

function paragraphs(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Fallback prose when the expansion pass cannot produce a usable section. */
function agendaProse(whatHappened: string, whyItMatters: string): string {
  return paragraphs(`${whatHappened.trim()}\n\n${whyItMatters.trim()}`);
}

type Ask = (
  userPrompt: string,
  systemPrompt?: string,
  options?: { maxOutputTokens?: number },
) => Promise<string>;

async function writeProse(
  ask: Ask,
  basePrompt: string,
  systemPrompt: string,
  minChars: number,
  maxOutputTokens: number,
): Promise<string | null> {
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    let text: string;
    try {
      text = await ask(`${basePrompt}${feedback}`, systemPrompt, {
        maxOutputTokens,
      });
    } catch (err) {
      log.warn(
        `Long-form attempt ${attempt} failed: ${(err as Error).message}`,
      );
      return null;
    }
    const clean = paragraphs(text);
    const issues = proseIssues(clean, minChars);
    if (issues.length === 0) return clean;
    log.warn(`Long-form attempt ${attempt} rejected: ${issues.join("; ")}`);
    feedback = `\n\nA versão anterior foi rejeitada porque: ${issues.join("; ")}. Reescreva o texto inteiro corrigindo exatamente esses problemas.`;
  }
  return null;
}

async function expandHighlightAnalysis(
  ask: Ask,
  draft: EditorialDraft,
  articles: Article[],
  index: number,
  period: string,
): Promise<string> {
  const highlight = draft.highlights[index];
  const article = articles[highlight.sourceIndex];
  const fallback = agendaProse(highlight.whatHappened, highlight.whyItMatters);
  if (!article) return fallback;

  const prompt = `Escreva a seção de análise de uma edição técnica diária (período ${period}) sobre a pauta abaixo.

PAUTA: ${sanitizeForPrompt(highlight.headline, 200)}
FONTE: ${sanitizeForPrompt(article.source, 120)} — ${sanitizeForPrompt(article.title, 240)}
EVIDÊNCIA (única base factual permitida): ${sanitizeForPrompt(article.summary, 900)}
Apuração já feita pela edição:
- Fato central: ${sanitizeForPrompt(highlight.whatHappened, 600)}
- Consequência técnica: ${sanitizeForPrompt(highlight.whyItMatters, 600)}

Escreva de 3 a 5 parágrafos densos (no mínimo ${ANALYSIS_MIN_CHARS} caracteres no total). Comece pelo fato, depois desdobre o que ele muda na prática para quem constrói e opera software com IA, e feche com o limite ou a incerteza que a evidência ainda deixa em aberto.

${STYLE_RULES}

Responda apenas com o texto da análise.`;

  const prose = await writeProse(
    ask,
    prompt,
    "Você é um editor técnico sênior escrevendo em português brasileiro. Responda apenas com parágrafos de texto corrido.",
    ANALYSIS_MIN_CHARS,
    1600,
  );
  return prose ?? fallback;
}

async function expandSynthesis(
  ask: Ask,
  draft: EditorialDraft,
  period: string,
): Promise<string> {
  const agenda = draft.highlights
    .map(
      (highlight) =>
        `- ${sanitizeForPrompt(highlight.headline, 200)}: ${sanitizeForPrompt(highlight.whatHappened, 400)}`,
    )
    .join("\n");

  const prompt = `Escreva o fechamento analítico da edição técnica do período ${period}, conectando somente as pautas abaixo.

${agenda}

Escreva de 3 a 4 parágrafos (no mínimo ${SYNTHESIS_MIN_CHARS} caracteres) mostrando o que essas pautas, lidas juntas, dizem sobre a direção técnica do momento, onde elas se contradizem e o que ainda não está resolvido. Não repita as pautas uma a uma nem faça resumo enumerado.

${STYLE_RULES}

Responda apenas com o texto.`;

  const prose = await writeProse(
    ask,
    prompt,
    "Você é um editor técnico sênior escrevendo em português brasileiro. Responda apenas com parágrafos de texto corrido.",
    SYNTHESIS_MIN_CHARS,
    1600,
  );
  return prose ?? draft.synthesis;
}

/**
 * Second editorial pass: turns the validated agenda into long-form prose, one
 * model call per highlight so the text is not squeezed by a single response
 * budget. Failures degrade to the agenda text instead of losing the edition.
 */
export async function expandEdition(
  ask: Ask,
  draft: EditorialDraft,
  articles: Article[],
  period: string,
): Promise<EditorialDraft> {
  const highlights = [...draft.highlights];
  for (let index = 0; index < highlights.length; index++) {
    highlights[index] = {
      ...highlights[index],
      analysis: await expandHighlightAnalysis(
        ask,
        draft,
        articles,
        index,
        period,
      ),
    };
  }
  const expanded = { ...draft, highlights };
  return {
    ...expanded,
    synthesis: await expandSynthesis(ask, expanded, period),
  };
}
