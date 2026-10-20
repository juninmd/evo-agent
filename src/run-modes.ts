import type { RunMode } from "./config.js";

// Typed as a full Record so adding a RunMode without a summary fails to compile;
// `--help` and the README drift test both read from here.
export const RUN_MODE_SUMMARY: Record<RunMode, string> = {
  DAEMON: "Learn cycle now, then cron: crawl, daily editions, reports, radar",
  CRAWL: "One crawl + improve cycle, drain the Telegram outbox, exit",
  DAILY: "Publish one daily edition within the day's budget, exit",
  DAILY_SWEEP: "Fill whatever is missing from today's edition budget, exit",
  RADAR: "Publish the cross-source radar (tables + reading), exit",
  TECHLEAD: "Publish the tech-lead digest, exit",
  DEV_TIPS: "Weekly tips from Claude Code, VS Code and OpenCode release notes",
  WEEKLY: "Publish the weekly report, exit",
  BIWEEKLY: "Publish the biweekly report, exit",
  MONTHLY: "Publish the monthly report, exit",
  BIMONTHLY: "Publish the bimonthly report, exit",
  SEMESTER: "Publish the semester report, exit",
  EBOOK: "Refine and publish the living AI-assisted development handbook",
  MODEL_ALERTS: "Alert on new LLMs from major vendors (needs only Telegram)",
  API: "Serve the read-only REST API for the desktop console",
};

export function runModeHelp(): string {
  const width = Math.max(...Object.keys(RUN_MODE_SUMMARY).map((m) => m.length));
  const rows = Object.entries(RUN_MODE_SUMMARY).map(
    ([mode, summary]) => `  ${mode.padEnd(width)}  ${summary}`,
  );
  return [
    "evo-agent: set RUN_MODE (default DAEMON) and run `npm start`.",
    "",
    ...rows,
    "",
    "Variables: see the README environment table.",
  ].join("\n");
}
