import { TECHLEAD_SOURCE_PREFIX } from "../knowledge/store.js";

const feed = (name: string, url: string, tags: string[]) => ({
  name: `${TECHLEAD_SOURCE_PREFIX}${name}`,
  url,
  tags: ["techlead", ...tags],
});

/** Stack the owner runs (Bun, Hono, React, k3s, ArgoCD, Traefik, Postgres) plus leadership. */
export const TECHLEAD_SOURCES = [
  feed("Bun Releases", "https://github.com/oven-sh/bun/releases.atom", [
    "bun",
    "runtime",
  ]),
  feed("Hono Releases", "https://github.com/honojs/hono/releases.atom", [
    "hono",
    "backend",
  ]),
  feed("React Blog", "https://react.dev/rss.xml", ["react", "frontend"]),
  feed("TypeScript Blog", "https://devblogs.microsoft.com/typescript/feed/", [
    "typescript",
  ]),
  feed("Node.js Blog", "https://nodejs.org/en/feed/blog.xml", [
    "node",
    "runtime",
  ]),
  feed("k3s Releases", "https://github.com/k3s-io/k3s/releases.atom", [
    "k3s",
    "kubernetes",
  ]),
  feed("Kubernetes Blog", "https://kubernetes.io/feed.xml", ["kubernetes"]),
  feed(
    "Argo CD Releases",
    "https://github.com/argoproj/argo-cd/releases.atom",
    ["argocd", "gitops"],
  ),
  feed("Traefik Releases", "https://github.com/traefik/traefik/releases.atom", [
    "traefik",
    "ingress",
  ]),
  feed("PostgreSQL News", "https://www.postgresql.org/news.rss", [
    "postgres",
    "database",
  ]),
  feed("Irrational Exuberance", "https://lethain.com/feeds.xml", [
    "leadership",
  ]),
  feed("charity.wtf", "https://charity.wtf/feed/", [
    "leadership",
    "observability",
  ]),
  feed(
    "The Pragmatic Engineer",
    "https://newsletter.pragmaticengineer.com/feed",
    ["leadership"],
  ),
  feed("LeadDev", "https://leaddev.com/rss.xml", ["leadership"]),
];
