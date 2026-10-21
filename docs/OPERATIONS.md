# Operations

## Health contract

Run:

```bash
npm run health
```

The command emits one JSON object and exits non-zero when degraded or critical.

Critical:

- no successful cycle in 24 hours
- any notification in dead-letter
- stale cycle still marked as running after six hours

Degraded:

- failed cycle in 24 hours
- more than five pending notifications
- no article or no primary source collected in 48 hours

## API surface

`RUN_MODE=API` serves the read-only REST API the desktop console consumes. It needs only
`API_TOKEN`, binds to loopback by default, and never writes to the database: on-demand runs
are executed as a child process. The contract is in [`API.md`](API.md); `/healthz` is the
only route outside the bearer token and is what the Kubernetes probes should use.

## Editorial gates

```bash
npm run benchmark:editorial
npm run test:coverage
```

Publication is blocked when article validation fails or quality is below 70.
Each selected claim must preserve source URL, title, and supporting excerpt in
`published_evidence`.

## Prompt recovery

```bash
npm run prompt:rollback
```

Prompt candidates are stored in `prompt_versions`. Rejected candidates never
replace the active prompt.

## Notification recovery

Telegram delivery uses the publication table as an outbox. Failed messages use
exponential backoff from five minutes to six hours. Five failed attempts move
the item to `dead_letter`. Telegram API errors are stored in
`notification_error` without logging bot tokens.

## Edition lifecycle

An edition is identified by `AAAA-MM-DD-titulo`, the same name as its file, so a repeated
title on another day is a separate edition. Every committed Markdown is stored in
`edition_revisions`; republishing identical content adds nothing, changed content adds a
revision and marks the edition `corrected`, and neither re-sends the Telegram notification.

```bash
npm run edition -- list "mcp"                  # search title, summary, tags and evidence
npm run edition -- show <slug>                 # status, score, revisions
npm run edition -- requeue <slug>              # send the notification again (dead_letter, suppressed)
npm run edition -- retract <slug> "<motivo>"   # replace the page with a notice, rebuild home and feed
npm run edition -- rescore                     # fill quality_score for editions published before it existed
npm run edition -- scores 20                   # score and facets of the last 20 editions, for tuning the weights
npm run edition -- reconcile                   # register pages on the branch that the database does not know
```

The commit to GitHub lands before the database write. If the process dies in between, the
next publication reconciles the branch first (`src/publisher/reconcile.ts`): every
`articles/` or `reports/` page without a row is registered as `suppressed` (no Telegram
ping), so it returns to the home, the feed and the daily budget. At most 50 pages per run.
A retracted page is a notice and is never re-registered.

Daily editions do not repeat a story from the last two days: the sources cited by those
editions are excluded from the candidate pool (`DAILY_WINDOW_DAYS` in `writer.ts`).
Retracted pages carry `sitemap: false`. Crawler HTTP calls are capped at 5 MB and 3
redirects (`src/utils/http-limits.ts`).

`retract` commits before it touches the database, like a publication, and keeps the previous
body in `edition_revisions`. The home, the Atom feed and the calendar stop listing it.
`qualityScore` (`src/agent/quality.ts`) weighs primary-source share, evidence per highlight,
breadth and community signals; the last ten editions' average and weakest facet are fed to the
improvement cycle.

## Cycle recovery

On startup, cycles left as `running` for more than six hours are marked failed
with `cycle abandoned by previous process`. This makes pod restarts visible in
`npm run health` instead of hiding old work as still active.

## Metrics

`metric_events` stores:

- crawl totals and failed sources
- primary-source count
- editorial quality and selected-source count
- LLM latency, input/output tokens, and errors
- automatic prompt rollback events

Logs default to JSON. Set `LOG_FORMAT=text` for local interactive output.
Credentials, bearer tokens, and Telegram bot URLs are redacted before logging.
