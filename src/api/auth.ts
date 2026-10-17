import { timingSafeEqual } from "node:crypto";

const BEARER = "Bearer ";

/**
 * Constant-time bearer check. The API is reachable from outside the cluster and
 * a plain comparison of the token leaks its bytes through response timing.
 * Length still differs visibly, but that is unavoidable and reveals no content.
 */
export function isAuthorized(
  header: string | undefined,
  token: string,
): boolean {
  if (!token || !header?.startsWith(BEARER)) return false;
  const provided = Buffer.from(header.slice(BEARER.length).trim(), "utf8");
  const expected = Buffer.from(token, "utf8");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
