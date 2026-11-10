export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/** Sum of squares, accumulated in the same order `cosine` uses. */
export function squaredNorm(vector: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) sum += vector[i] * vector[i];
  return sum;
}

/**
 * `cosine` for callers that compare one vector against many: the norms are
 * computed once per vector instead of once per pair. Same arithmetic, same
 * result bit for bit.
 */
export function cosineWithNorms(
  a: Float32Array,
  squaredNormA: number,
  b: Float32Array,
  squaredNormB: number,
): number {
  if (a.length !== b.length || a.length === 0) return 0;
  if (squaredNormA === 0 || squaredNormB === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot / Math.sqrt(squaredNormA * squaredNormB);
}
