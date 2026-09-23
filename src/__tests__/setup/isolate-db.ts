import { tmpdir } from "node:os";
import { join } from "node:path";

// Fresh DB per test file: the store singleton would otherwise open data/knowledge.db and race.
process.env.DB_PATH = join(
  tmpdir(),
  `evo-test-isolated-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);
