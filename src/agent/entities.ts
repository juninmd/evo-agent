// GLiNER (https://github.com/urchade/GLiNER) is a zero-shot NER model: given
// free-text labels, it extracts spans without task-specific fine-tuning. Used
// here to pull real topical tags (products, companies, tech names) out of
// article text instead of the generic source-bucket tags in
// editorial-renderer.ts (buildTagsFromGroups).

const ENTITY_LABELS = [
  "empresa",
  "produto",
  "tecnologia",
  "linguagem de programacao",
  "modelo de ia",
];

const MAX_TAGS = 6;
const MIN_SCORE = 0.4;
const REQUEST_TIMEOUT_MS = 8000;

interface GlinerEntity {
  text: string;
  label: string;
  score: number;
}

function slugifyEntity(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface GlinerConfig {
  apiKey: string;
  model: string;
}

/**
 * Extracts entity-based tags from text via a hosted GLiNER model. Returns []
 * on missing config, timeout, or any API/parse error — callers must treat
 * this as a best-effort enrichment, never a required step.
 */
export async function extractEntityTags(
  text: string,
  config: GlinerConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  if (!config.apiKey || !text.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(
      `https://api-inference.huggingface.co/models/${config.model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text.slice(0, 2000),
          parameters: { labels: ENTITY_LABELS },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return [];

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];

    const entities = payload as GlinerEntity[];
    const tags = [
      ...new Set(
        entities
          .filter((entity) => entity.score >= MIN_SCORE)
          .map((entity) => slugifyEntity(entity.text))
          .filter((tag) => tag.length > 1),
      ),
    ];
    return tags.slice(0, MAX_TAGS);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
