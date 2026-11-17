import type { AskOptions } from "../../utils/ai.js";
import { sanitizeForPrompt } from "../../utils/escape.js";
import { UNTRUSTED_MATERIAL_RULE } from "../prompt-guards.js";
import { citedUrls } from "../techlead.js";
import {
  codeBlocks,
  commandLines,
  inlineSpans,
  isAnchored,
  isSpanAnchored,
} from "./artifacts.js";
import type { ScoredItem } from "./scoring.js";

export type Ask = (
  userPrompt: string,
  systemPrompt?: string,
  options?: AskOptions,
) => Promise<string>;

export const REQUIRED_SECTIONS = [
  "Por que agora",
  "Ao final você terá",
  "Passo a passo",
  "Exercício",
  "Armadilhas",
] as const;
const MIN_EXECUTABLE = 2;
const MATERIAL_CHARS = 12_000;
const ATTEMPTS = 2;
const FENCED = /```[\s\S]*?```/g;
/**
 * Markup kramdown would render outside a code block: raw HTML, images,
 * attribute lists and links to anything but https. The source is third-party
 * text, so the lesson may carry nothing that executes or hides a destination.
 */
const UNSAFE_PROSE = [
  /<[a-z/!?]/i,
  /!\[/,
  /\{:/,
  /\]\((?!https:\/\/)/,
  /\b(javascript|vbscript|data):/i,
  /^~~~/m,
];

/** Kramdown also treats an indented block after a blank line as code. */
function hasIndentedCode(prose: string): boolean {
  const lines = prose.split("\n");
  return lines.some(
    (line, index) => /^( {4}|\t)\S/.test(line) && lines[index - 1] === "",
  );
}

export const TUTORIAL_SYSTEM_PROMPT = [
  "Você escreve uma aula prática em pt-BR para devs que usam agentes de código.",
  "Ensine UMA coisa do material: o leitor deve conseguir fazer sozinho ao final.",
  "Comece com '## <título curto e específico>' e use exatamente estas seções, nesta ordem:",
  REQUIRED_SECTIONS.map((section) => `'### ${section}'`).join(", "),
  ". Em 'Passo a passo', numere os passos e copie comandos e configs do material em blocos ```;",
  "nunca escreva um comando, flag ou linha de código que não esteja no material.",
  "'Exercício' é uma tarefa de até 15 minutos no repositório do leitor, com um critério de pronto.",
  "'Armadilhas' cobre custo, segurança e quando não usar. Sem introdução nem conclusão genéricas.",
  "Cite a fonte em uma linha 'Fonte: <url exata do material>'.",
  UNTRUSTED_MATERIAL_RULE,
].join(" ");

export function tutorialMaterial(item: ScoredItem): string {
  const { article } = item;
  return [
    `Título: ${sanitizeForPrompt(article.title, 240)}`,
    `URL: ${article.url}`,
    `Fonte: ${sanitizeForPrompt(article.source, 120)}`,
    "Conteúdo:",
    (article.body || article.summary || "").slice(0, MATERIAL_CHARS),
  ].join("\n");
}

/**
 * Null when the lesson breaks the contract: a missing section, too little to
 * run, a line of code the source does not contain, or a foreign URL.
 */
export function validateTutorial(
  markdown: string,
  item: ScoredItem,
): string | null {
  const text = markdown.trim();
  if (!/^## \S/m.test(text)) return null;
  let cursor = -1;
  for (const section of REQUIRED_SECTIONS) {
    const at = text.indexOf(`### ${section}`);
    if (at <= cursor) return null;
    cursor = at;
  }
  const prose = text.replace(FENCED, "");
  if (UNSAFE_PROSE.some((pattern) => pattern.test(prose))) return null;
  if (hasIndentedCode(prose)) return null;
  const source = [item.article.body || "", item.article.summary || ""];
  const blocks = codeBlocks(text);
  const commands = commandLines(text);
  if (blocks.length + commands.length < MIN_EXECUTABLE) return null;
  if (!blocks.every((block) => isAnchored(block, source))) return null;
  const spans = [...commands, ...inlineSpans(text)];
  if (!spans.every((span) => isSpanAnchored(span, source))) return null;
  const urls = citedUrls(text);
  if (!urls.includes(item.article.url)) return null;
  const allowed = new Set([item.article.url, ...item.artifacts]);
  if (urls.some((url) => !allowed.has(url))) return null;
  return text;
}

/** The lesson, or null when the model could not meet the gate: the edition still ships. */
export async function writeTutorial(
  ask: Ask,
  item: ScoredItem,
  model?: string,
): Promise<string | null> {
  let feedback = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const response = await ask(
      `${tutorialMaterial(item)}${feedback}`,
      TUTORIAL_SYSTEM_PROMPT,
      { maxOutputTokens: 4000, ...(model ? { model } : {}) },
    );
    const lesson = validateTutorial(response, item);
    if (lesson) return lesson;
    feedback =
      "\n\nA versão anterior foi rejeitada: confira as cinco seções na ordem, pelo menos dois comandos ou blocos copiados literalmente do material e a linha 'Fonte:' com a URL do material.";
  }
  return null;
}
