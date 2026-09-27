import { articleCss } from "./article.js";
import { baseCss } from "./base.js";
import { codeCss } from "./code.js";
import { homeCss } from "./home.js";
import { rankingCss } from "./ranking.js";

export function buildSiteCss(): string {
  return [baseCss, homeCss, articleCss, codeCss, rankingCss].join("\n");
}
