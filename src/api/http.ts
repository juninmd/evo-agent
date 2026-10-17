import type { IncomingMessage, ServerResponse } from "node:http";

/** Thrown by a route handler to answer with a status the default path doesn't. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

/** Bounded by `limitBytes` so an oversized body cannot be buffered into RAM. */
export function readJsonBody(
  req: IncomingMessage,
  limitBytes = 64 * 1024,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk: Buffer) => {
      if (rejected) return;
      size += chunk.length;
      if (size > limitBytes) {
        rejected = true;
        chunks.length = 0;
        // Drained rather than destroyed: the 413 still has to be written back.
        req.resume();
        reject(new ApiError(413, "request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (rejected) return;
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ApiError(400, "request body is not valid JSON"));
      }
    });
    req.on("error", (error) => {
      if (!rejected) reject(error);
    });
  });
}

export function stringParam(
  url: URL,
  key: string,
  options: { maxLength?: number } = {},
): string | undefined {
  const value = url.searchParams.get(key)?.trim();
  if (!value) return undefined;
  const maxLength = options.maxLength ?? 200;
  if (value.length > maxLength) {
    throw new ApiError(400, `query parameter ${key} is too long`);
  }
  return value;
}

export function intParam(
  url: URL,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = url.searchParams.get(key);
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, `query parameter ${key} must be ${min}..${max}`);
  }
  return value;
}

/**
 * Compares a `/api/v1/editions/:slug` template with a pathname. Returns the
 * captured parameters, or null when the shapes differ.
 */
export function matchPath(
  template: string,
  pathname: string,
): Record<string, string> | null {
  const expected = template.split("/").filter(Boolean);
  const actual = pathname.split("/").filter(Boolean);
  if (expected.length !== actual.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < expected.length; i++) {
    const segment = expected[i];
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = decodeURIComponent(actual[i]);
      continue;
    }
    if (segment !== actual[i]) return null;
  }
  return params;
}
