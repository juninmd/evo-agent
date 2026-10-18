import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");
const ENV_READ =
  /(?:process\.env\.|\benv\.)([A-Z][A-Z0-9_]{3,})|(?:positiveNumber|validUrl)\(\s*env,\s*"([A-Z][A-Z0-9_]{3,})"/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === "__tests__" ? [] : sourceFiles(path);
    }
    return path.endsWith(".ts") ? [path] : [];
  });
}

// The README env table drifted twice (dead model defaults, 8 missing vars);
// this keeps the table the single place a reader learns what can be set.
describe("README env table", () => {
  it("documents every environment variable the source reads", () => {
    const readme = readFileSync(join(SRC, "..", "README.md"), "utf8");
    const names = new Set<string>();
    for (const file of sourceFiles(SRC)) {
      for (const m of readFileSync(file, "utf8").matchAll(ENV_READ)) {
        names.add(m[1] ?? m[2]);
      }
    }
    const missing = [...names].filter((n) => !readme.includes(`\`${n}\``));
    expect(missing.sort()).toEqual([]);
  });
});
