import { generateArticle } from "../../src/agent/writer.js";

async function main() {
  const article = await generateArticle("daily");
  console.log(`Título:  ${article.title}`);
  console.log(`Conteúdo: ${article.content.length} chars`);
  console.log(`Tags:    ${article.tags.join(", ")}`);
  console.log(`Fontes:  ${article.sources.length}`);
  // Linhas parseáveis pelo script pai
  console.log(`ARTICLE_TITLE=${article.title}`);
  console.log(`ARTICLE_SLUG=${article.slug}`);
  // Salva artigo para próximo step
  const fs = await import("fs/promises");
  await fs.mkdir("./homolog", { recursive: true });
  await fs.writeFile("./homolog/article.json", JSON.stringify(article, null, 2));
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
