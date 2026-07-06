import { describe, expect, it } from "vitest";
import { parseImprovementResponse } from "../agent/improver.js";

describe("improvement response parser", () => {
  it("accepts fenced JSON with a backtick code string", () => {
    const parsed = parseImprovementResponse(`\`\`\`json
{
  "improved_system_prompt": "Escreva em pt-BR com fontes.",
  "updated_keywords": ["agent evals"],
  "extra_sources": [],
  "code_snippet": {
    "title": "Typed event",
    "language": "typescript",
    "code": \`
type Event = { name: string };
export const event: Event = { name: "crawl" };
\`,
    "explanation": "Tipagem simples."
  },
  "reasoning": "Mantem foco em evidencias."
}
\`\`\``);

    expect(parsed.code_snippet?.code).toContain("type Event");
    expect(parsed.updated_keywords).toEqual(["agent evals"]);
  });

  it("rejects responses without JSON", () => {
    expect(() => parseImprovementResponse("sem json")).toThrow("No JSON found");
  });
});
