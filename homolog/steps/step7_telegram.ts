import { notifyNewArticle } from "../../src/notifier/telegram.js";
import fs from "fs/promises";

async function main() {
  const raw = await fs.readFile("./homolog/article.json", "utf-8");
  const article = JSON.parse(raw);
  const url = process.env.ARTICLE_URL ?? "https://github.com/juninmd/evo-agent";

  await notifyNewArticle(article.title, url, article.summary, article.sources);
  console.log("Notificação enviada.");
  console.log("TELEGRAM_SENT=true");
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
