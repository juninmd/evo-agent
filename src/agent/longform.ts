import type { Article } from "../knowledge/store.js";
import { sanitizeForPrompt } from "../utils/escape.js";
import { log } from "../utils/logger.js";
import { isCommunitySignal, isPrimarySource } from "./curation.js";
import type { EditorialDraft, EditorialHighlight } from "./editorial.js";
import {
  COMMUNITY_HEDGE,
  isNominalFragment,
  proseIssues,
  unsupportedNames,
} from "./prose-checks.js";

export { proseIssues } from "./prose-checks.js";

const ANALYSIS_MIN_CHARS = 380;
const ANALYSIS_MAX_CHARS = 750;
const SYNTHESIS_MIN_CHARS = 500;
const SYNTHESIS_MAX_CHARS = 1000;

const STYLE_RULES = `Regras de escrita:
- Parágrafos corridos em português brasileiro. Nada de listas, bullets, subtítulos, tabelas ou emojis.
- Direto ao ponto: uma ideia por frase, frases curtas, sem redundância. Não repita em um parágrafo o que já foi dito no anterior.
- Nunca use rótulos fixos como "Por que importa", "O que aconteceu", "Contexto:", "Em resumo" ou "Vale destacar". O texto deve fluir como análise escrita por uma pessoa.
- Não use "cada vez mais", "players do mercado", "impacto significativo", "revolucionário", "nesse contexto", "diante disso", "é fundamental", "não se trata apenas de" nem outras frases de preenchimento típicas de IA.
- Não invente números, versões, datas, benchmarks, nomes ou capacidades que não estejam na evidência.
- Não escreva URLs nem links; as citações são adicionadas pelo programa.
- Prefira frases concretas: o que muda na arquitetura, no custo, no risco, na operação ou na decisão de adoção de quem lê.
- Nunca abra com "Para quem desenvolve/constrói/opera software com IA"; nomeie quem é afetado (quem usa a extensão, quem roda o proxy, quem paga a API).
- Escreva variáveis de ambiente, flags, headers, comandos, pacotes e trechos de configuração entre crases, exatamente como na evidência.
- Não deixe frases ou expressões em inglês, nem entre parênteses; traduza ou omita.`;

function paragraphs(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Agenda fields often come telegraphic; published prose still ends its sentences. */
function closeSentence(text: string): string {
  const clean = text.trim();
  return !clean || /[.!?…:]$/.test(clean) ? clean : `${clean}.`;
}

/** Fallback prose when the expansion pass cannot produce a usable section. */
function agendaProse(whatHappened: string, whyItMatters: string): string {
  return paragraphs(
    `${closeSentence(whatHappened)}\n\n${closeSentence(whyItMatters)}`,
  );
}

/** Fallbacks skip the expansion checks, so they must clear them here instead. */
function usableFallback(text: string): string | null {
  if (!text.trim() || proseIssues(text, 0).length > 0) return null;
  return text.split(/\n{2,}/).some(isNominalFragment) ? null : text;
}

function sourceKind(article: Article): "primary" | "community" | "coverage" {
  if (isPrimarySource(article)) return "primary";
  return isCommunitySignal(article) ? "community" : "coverage";
}

const SOURCE_KIND_PROMPT = {
  primary: {
    label:
      "fonte primária (registro oficial de quem lançou; trate o conteúdo como fato)",
    rule: "A evidência é o registro oficial: não a chame de relato nem diga que depende de confirmação da comunidade.",
  },
  community: {
    label: "sinal da comunidade (relato de usuário, ainda não confirmado)",
    rule: "A evidência é um relato da comunidade: trate-a como relato, sem generalizar para uma tendência.",
  },
  coverage: {
    label: "cobertura de terceiros (não é o registro oficial)",
    rule: "Não trate como confirmado nada além do que a evidência afirma.",
  },
} as const;

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
  maxChars?: number,
  extraIssues: (text: string) => string[] = () => [],
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
    const issues = [
      ...proseIssues(clean, minChars, maxChars),
      ...extraIssues(clean),
    ];
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
): Promise<string | null> {
  const highlight = draft.highlights[index];
  const article = articles[highlight.sourceIndex];
  const fallback = usableFallback(
    agendaProse(highlight.whatHappened, highlight.whyItMatters),
  );
  if (!article) return fallback;
  const kind = sourceKind(article);

  const prompt = `Escreva a seção de análise de uma edição técnica diária (período ${period}) sobre a pauta abaixo.

PAUTA: ${sanitizeForPrompt(highlight.headline, 200)}
FONTE: ${sanitizeForPrompt(article.source, 120)} — ${sanitizeForPrompt(article.title, 240)}
TIPO DE FONTE: ${SOURCE_KIND_PROMPT[kind].label}
EVIDÊNCIA (única base factual permitida): ${sanitizeForPrompt(article.summary, 900)}
Apuração já feita pela edição:
- Fato central: ${sanitizeForPrompt(highlight.whatHappened, 600)}
- Consequência técnica: ${sanitizeForPrompt(highlight.whyItMatters, 600)}

Escreva 2 parágrafos curtos e diretos, entre ${ANALYSIS_MIN_CHARS} e ${ANALYSIS_MAX_CHARS} caracteres no total (nunca mais que isso), sem enrolação. Primeiro parágrafo: o fato, sem preâmbulo. Segundo parágrafo: a consequência prática concreta (arquitetura, custo, risco, operação ou adoção) para quem é afetado, incluindo o limite ou a incerteza que a evidência ainda deixa em aberto. ${SOURCE_KIND_PROMPT[kind].rule}

${STYLE_RULES}

Responda apenas com o texto da análise.`;

  const prose = await writeProse(
    ask,
    prompt,
    "Você é um editor técnico sênior escrevendo em português brasileiro. Responda apenas com parágrafos de texto corrido.",
    ANALYSIS_MIN_CHARS,
    1600,
    ANALYSIS_MAX_CHARS,
    (text) =>
      kind === "primary" && COMMUNITY_HEDGE.test(text)
        ? ["trata uma fonte primária como relato da comunidade"]
        : [],
  );
  return prose ?? fallback;
}

async function expandSynthesis(
  ask: Ask,
  draft: EditorialDraft,
  period: string,
): Promise<string> {
  const corpus = draft.highlights
    .map((highlight) =>
      [
        highlight.headline,
        highlight.whatHappened,
        highlight.whyItMatters,
        highlight.analysis ?? "",
      ].join(" "),
    )
    .join(" ");
  const agenda = draft.highlights
    .map(
      (highlight) =>
        `- ${sanitizeForPrompt(highlight.headline, 200)}: ${sanitizeForPrompt(highlight.whatHappened, 400)}`,
    )
    .join("\n");

  const prompt = `Escreva o fechamento analítico da edição técnica do período ${period}, conectando somente as pautas abaixo.

${agenda}

Escreva 2 parágrafos diretos, entre ${SYNTHESIS_MIN_CHARS} e ${SYNTHESIS_MAX_CHARS} caracteres no total (nunca mais que isso), mostrando o que essas pautas, lidas juntas, dizem sobre a direção técnica do momento, onde elas se contradizem e o que ainda não está resolvido. Não repita as pautas uma a uma nem faça resumo enumerado.

${STYLE_RULES}

Responda apenas com o texto.`;

  const prose = await writeProse(
    ask,
    prompt,
    "Você é um editor técnico sênior escrevendo em português brasileiro. Responda apenas com parágrafos de texto corrido.",
    SYNTHESIS_MIN_CHARS,
    1600,
    SYNTHESIS_MAX_CHARS,
    (text) => {
      const names = unsupportedNames(text, corpus);
      return names.length > 0
        ? [`cita nomes que nenhuma pauta menciona (${names.join(", ")})`]
        : [];
    },
  );
  return prose ?? usableFallback(draft.synthesis) ?? "";
}

/**
 * Second editorial pass: turns the validated agenda into long-form prose, one
 * model call per highlight so the text is not squeezed by a single response
 * budget. Failures degrade to the agenda text instead of losing the edition;
 * an item whose agenda text is itself corrupted is dropped, never published.
 */
export async function expandEdition(
  ask: Ask,
  draft: EditorialDraft,
  articles: Article[],
  period: string,
): Promise<EditorialDraft> {
  const highlights: EditorialHighlight[] = [];
  for (let index = 0; index < draft.highlights.length; index++) {
    const analysis = await expandHighlightAnalysis(
      ask,
      draft,
      articles,
      index,
      period,
    );
    if (analysis) highlights.push({ ...draft.highlights[index], analysis });
    else
      log.warn(
        `Dropping corrupted highlight: ${draft.highlights[index].headline}`,
      );
  }
  const expanded = { ...draft, highlights };
  return {
    ...expanded,
    synthesis: await expandSynthesis(ask, expanded, period),
  };
}
