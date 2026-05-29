import { publishArticle } from "../../src/publisher/github.js";
import fs from "fs/promises";

async function main() {
  const raw = await fs.readFile("./homolog/article.json", "utf-8");
  const article = JSON.parse(raw);
  const url = await publishArticle(article);
  console.log(`Publicado em: ${url}`);
  console.log(`ARTICLE_URL=${url}`);
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
