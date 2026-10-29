import { type Article, getDb } from "./store.js";

// Below SQLite's default 999-variable limit.
const CHUNK = 500;

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK)
    out.push(items.slice(i, i + CHUNK));
  return out;
}

export function getCachedVectors(
  urls: string[],
  model: string,
): Map<string, Float32Array> {
  const found = new Map<string, Float32Array>();
  for (const part of chunks(urls)) {
    const rows = getDb()
      .prepare(
        `SELECT url, vector FROM article_embeddings
         WHERE model = ? AND url IN (${part.map(() => "?").join(",")})`,
      )
      .all(model, ...part) as Array<{ url: string; vector: Buffer }>;
    for (const row of rows) {
      // Copy: a Buffer's backing store can be shared and unaligned for Float32.
      const bytes = new Uint8Array(row.vector);
      found.set(row.url, new Float32Array(bytes.buffer));
    }
  }
  return found;
}

export function saveVectors(
  model: string,
  entries: Array<[url: string, vector: Float32Array]>,
) {
  const insert = getDb().prepare(
    `INSERT OR REPLACE INTO article_embeddings (url, model, vector)
     VALUES (?, ?, ?)`,
  );
  getDb().transaction(() => {
    for (const [url, vector] of entries) {
      insert.run(
        url,
        model,
        Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength),
      );
    }
  })();
}

export function getArticlesByUrls(urls: string[]): Article[] {
  return chunks(urls).flatMap(
    (part) =>
      getDb()
        .prepare(
          `SELECT * FROM articles WHERE url IN (${part.map(() => "?").join(",")})`,
        )
        .all(...part) as Article[],
  );
}
