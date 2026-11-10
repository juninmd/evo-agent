/**
 * Tolerant readers for the JSON columns of the knowledge base. A row written
 * by an older version, or hand-edited, must degrade to an empty value instead
 * of failing the cycle or the API response that reads it.
 */
export function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function parseJsonArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Keeps only the string items: tags are free text typed by a crawler. */
export function parseJsonStringArray(value: string): string[] {
  return parseJsonArray<unknown>(value).filter(
    (item): item is string => typeof item === "string",
  );
}
