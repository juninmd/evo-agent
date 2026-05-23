const level = process.env.LOG_LEVEL ?? "info";
const levels = { debug: 0, info: 1, warn: 2, error: 3 };

function write(l: keyof typeof levels, msg: string) {
  if (levels[l] >= levels[level as keyof typeof levels]) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [${l.toUpperCase()}] ${msg}`);
  }
}

export const log = {
  debug: (m: string) => write("debug", m),
  info: (m: string) => write("info", m),
  warn: (m: string) => write("warn", m),
  error: (m: string) => write("error", m),
};
