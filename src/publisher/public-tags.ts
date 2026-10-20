// Crawler bookkeeping that rides in `tags`: the launch epoch (see utils/launch.ts)
// and the Reddit post marker. Useful to the pipeline, noise to a reader.
const INTERNAL_TAG = /^(launched-\d+|post-signals)$/;

export function publicTags(tags: readonly string[] = []): string[] {
  return tags.filter((tag) => !INTERNAL_TAG.test(tag));
}
