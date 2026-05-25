# evo-agent

Self-improving AI developer agent in TypeScript. It crawls AI/developer sources, learns from them, writes Portuguese technical articles, and publishes them to GitHub Pages.

## What It Does

- Crawls RSS feeds, Google News keyword searches, and optional community signals.
- Stores articles, snippets, state, and publish history in SQLite.
- Improves its own writing context with source trends and learned TypeScript snippets.
- Generates daily articles and weekly reports in pt-BR.
- Publishes Markdown to the `gh-pages` branch with a readable light/dark article site.
- Sends Telegram notifications after publishing.

## Stack

- Node 24, TypeScript 5, ESM
- SQLite via `better-sqlite3`
- OpenCode SDK for article generation
- `node-cron` for scheduling
- `@octokit/rest` for GitHub Pages publishing
- `rss-parser` and `axios` for source ingestion

## Main Commands

```bash
npm run build
npm run lint
npm run smoke:reddit-comments
```

`npm run smoke:reddit-comments` uses an isolated database by default: `data/reddit-comments-test.db`.

## Runtime Flow

1. `crawlAll()` collects source articles and dynamic search results.
2. `runImprovementCycle()` updates agent state and learned snippets.
3. `generateDailyArticle()` or `generateWeeklyReport()` creates Markdown content.
4. `publishArticle()` or `publishWeeklyReport()` writes Markdown and site files to `gh-pages`.
5. Telegram notifier sends the published URL.

## GitHub Pages

Published content uses generated Jekyll assets:

- `_layouts/default.html`
- `_layouts/home.html`
- `_layouts/article.html`
- `assets/site.css`
- `index.md`
- `README.md`

The article frontend supports:

- light and dark themes with a persisted toggle
- year/month article grouping
- report and article cards
- readable editorial typography
- embedded images/videos
- Markdown download button per article

## Environment

See `.env.example`.

Required values:

```bash
OPENCODE_API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...
```

Optional:

```bash
GITHUB_BRANCH=gh-pages
CRAWL_INTERVAL_MINUTES=40
ARTICLE_CRON=0 8 * * *
DB_PATH=data/knowledge.db
```

## Deployment Notes

The Docker image is expected at:

```text
ghcr.io/juninmd/evo-agent:latest
```

Kubernetes manifests live outside this repo in `app-charts/evo-agent/`. Do not put secrets in this repository.
