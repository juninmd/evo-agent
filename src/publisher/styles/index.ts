import { articleCss } from "./article.js";
import { baseCss } from "./base.js";
import { codeCss } from "./code.js";
import { homeCss } from "./home.js";

export function buildSiteCss(): string {
  return [baseCss, homeCss, articleCss, codeCss].join("\n");
}
