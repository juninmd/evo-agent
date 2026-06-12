const level = process.env.LOG_LEVEL ?? "info";
const format = process.env.LOG_FORMAT ?? "json";
const levels = { debug: 0, info: 1, warn: 2, error: 3 };

export function redactLogValue(value: string): string {
  return value
    .replace(/(Bearer\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/((?:TOKEN|API_KEY|PASSWORD|SECRET)=)[^\s]+/gi, "$1[REDACTED]");
}

function write(
  l: keyof typeof levels,
  msg: string,
  context?: Record<string, unknown>,
) {
  if (levels[l] >= levels[level as keyof typeof levels]) {
    const ts = new Date().toISOString();
    const message = redactLogValue(msg);
    if (format === "json") {
      console.log(
        JSON.stringify({
          timestamp: ts,
          level: l,
          message,
          ...(context ? { context } : {}),
        }),
      );
      return;
    }
    console.log(`[${ts}] [${l.toUpperCase()}] ${message}`);
  }
}

export const log = {
  debug: (m: string, context?: Record<string, unknown>) =>
    write("debug", m, context),
  info: (m: string, context?: Record<string, unknown>) =>
    write("info", m, context),
  warn: (m: string, context?: Record<string, unknown>) =>
    write("warn", m, context),
  error: (m: string, context?: Record<string, unknown>) =>
    write("error", m, context),
};
