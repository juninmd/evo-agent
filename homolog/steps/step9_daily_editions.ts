/**
 * Homologa a cadência diária: gera N edições encadeadas (sem repetir fontes),
 * valida cada uma e mede o que o usuário pediu — volume de texto, número de
 * assuntos e ausência de linguagem robótica.
 *
 * Uso:
 *   DB_PATH=./homolog/homolog.db npx tsx homolog/steps/step9_daily_editions.ts
 * Variáveis:
 *   HOMOLOG_EDITIONS=3   quantas edições gerar
 *   HOMOLOG_CRAWL=1      roda o crawler antes (fontes frescas)
 *   HOMOLOG_PUBLISH=1    publica no GitHub Pages e notifica o Telegram
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { assertValidArticle } from "../../src/agent/article-validation.js";
import { EDITORIAL_CLICHES } from "../../src/agent/editorial.js";
import type { GeneratedArticle } from "../../src/agent/types.js";
import { generateArticle } from "../../src/agent/writer.js";
import { crawlAll } from "../../src/crawler/index.js";
import { notifyNewArticle, sendMessage } from "../../src/notifier/telegram.js";
import { publishArticle } from "../../src/publisher/github.js";
import { escapeHtml } from "../../src/utils/escape.js";

const EDITIONS = Number(process.env.HOMOLOG_EDITIONS ?? "3");
const SHOULD_CRAWL = process.env.HOMOLOG_CRAWL === "1";
const SHOULD_PUBLISH = process.env.HOMOLOG_PUBLISH === "1";
const SHOULD_TELEGRAM = process.env.HOMOLOG_TELEGRAM === "1";

/**
 * Preview enviado ao Telegram quando a edição não é publicada no GitHub Pages.
 * Mantém o texto real da edição, cortado no limite de 4096 chars da API.
 */
async function sendPreview(
  index: number,
  article: GeneratedArticle,
): Promise<boolean> {
  const body = article.content
    .replace(/^#.*$/gm, "")
    .replace(/\[Fonte:[^\]]*\]\([^)]*\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2800);
  const message = [
    `<b>[HOMOLOG ${index}/${EDITIONS}] ${escapeHtml(article.title)}</b>`,
    "",
    escapeHtml(body),
    "",
    `<i>${subjectCount(article)} assuntos · ${article.content.length} caracteres · ${article.sources.length} fontes</i>`,
  ].join("\n");
  const delivery = await sendMessage(message);
  console.log(`TELEGRAM_SENT=${delivery.delivered}`);
  return delivery.delivered;
}

function subjectCount(article: GeneratedArticle): number {
  return (article.content.match(/^### /gm) ?? []).length;
}

function report(index: number, article: GeneratedArticle) {
  const cliche = article.content.match(EDITORIAL_CLICHES);
  console.log(`\n--- Edição ${index}/${EDITIONS} ---`);
  console.log(`TITULO=${article.title}`);
  console.log(`ASSUNTOS=${subjectCount(article)}`);
  console.log(`CARACTERES=${article.content.length}`);
  console.log(`FONTES=${article.sources.length}`);
  console.log(`CLICHE=${cliche ? cliche[0] : "nenhum"}`);
  console.log(
    `TRECHO=${article.content.slice(0, 600).replace(/\n/g, " ⏎ ")}\n`,
  );
}

async function main() {
  if (SHOULD_CRAWL) {
    console.log("Crawling fontes...");
    const crawl = await crawlAll();
    console.log(
      `CRAWL_SAVED=${crawl.totalSaved} CRAWL_FAILED=${crawl.failedSources.length}`,
    );
  }

  const excludeUrls: string[] = [];
  let ok = 0;
  for (let index = 1; index <= EDITIONS; index++) {
    try {
      const article = await generateArticle("daily", { excludeUrls });
      assertValidArticle(article);
      mkdirSync("tmp/homolog", { recursive: true });
      writeFileSync(`tmp/homolog/edicao-${index}.md`, article.content, "utf8");
      report(index, article);
      if (subjectCount(article) < 5) {
        throw new Error(`edição com menos de 5 assuntos: ${subjectCount(article)}`);
      }
      excludeUrls.push(...article.sources);
      if (SHOULD_PUBLISH) {
        const url = await publishArticle(article);
        console.log(`ARTICLE_URL=${url}`);
        const delivery = await notifyNewArticle(
          article.title,
          url,
          article.summary,
          article.sources,
        );
        console.log(`TELEGRAM_SENT=${delivery.delivered}`);
        if (!delivery.delivered) throw new Error(delivery.error ?? "telegram");
      } else if (SHOULD_TELEGRAM && !(await sendPreview(index, article))) {
        throw new Error("Telegram não confirmou a entrega");
      }
      ok++;
    } catch (err) {
      console.error(`Edição ${index} falhou: ${(err as Error).message}`);
      break;
    }
  }

  console.log(`\nHOMOLOG_EDITIONS_OK=${ok}/${EDITIONS}`);
  if (ok < EDITIONS) process.exit(1);
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
