import { db, getDb } from "../knowledge/store.js";
import { evaluateHealth } from "./health.js";

const stats = db.getOperationalStats();
const health = evaluateHealth(stats);
console.log(JSON.stringify({ ...health, stats }));
getDb().close();
process.exitCode = health.status === "healthy" ? 0 : 1;
