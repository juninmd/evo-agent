/**
 * Bounds for every axios call that reads a third-party page. A timeout alone
 * does not stop a fast source from streaming an arbitrarily large body into
 * memory; axios' default maxContentLength is unlimited.
 */
export const HTTP_LIMITS = {
  maxContentLength: 5 * 1024 * 1024,
  maxRedirects: 3,
} as const;
