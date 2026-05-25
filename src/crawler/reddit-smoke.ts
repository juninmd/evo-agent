process.env.DB_PATH = "data/reddit-comments-test.db";

const { crawlRedditCommunitySignals } = await import("./index.js");
const { db } = await import("../knowledge/store.js");

const count = await crawlRedditCommunitySignals();
const samples = db
  .getRecentArticles(5)
  .filter((article) => article.source.startsWith("Reddit Community Signals"));

console.log(`reddit-community-signals inserted=${count}`);
for (const sample of samples) {
  console.log(`\n[${sample.source}] ${sample.title}`);
  console.log(sample.url);
  console.log(sample.summary.slice(0, 700));
}

export {};
