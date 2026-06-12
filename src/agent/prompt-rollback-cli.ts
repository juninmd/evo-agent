import { db, getDb } from "../knowledge/store.js";
import { rollbackPrompt } from "./prompt-policy.js";

const rolledBack = rollbackPrompt(db);
console.log(
  JSON.stringify({
    rolledBack,
    message: rolledBack
      ? "previous prompt version restored"
      : "no previous promoted prompt available",
  }),
);
getDb().close();
process.exitCode = rolledBack ? 0 : 1;
