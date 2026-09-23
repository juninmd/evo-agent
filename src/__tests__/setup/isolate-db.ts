import { tmpdir } from "node:os";
import { join } from "node:path";

// Several test files import the store.js singleton without mocking
// config.js (they only stub individual db methods with vi.spyOn). Without
// this, that singleton opens the real dev database at data/knowledge.db.
// Under concurrent test execution multiple files/processes then race on the
// same physical SQLite file, surfacing as sporadic "database is locked"
// errors and cross-run state leaks. Point every test file at its own
// isolated, unique temp file before config.js (and therefore store.js) is
// ever imported.
// Always assign a fresh path (never reuse process.env.DB_PATH as-is): a
// worker thread/process can be reused across multiple test files, and each
// file must get its own database, not just one that differs from prod.
process.env.DB_PATH = join(
  tmpdir(),
  `evo-test-isolated-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);
