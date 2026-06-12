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

Degraded:

- failed cycle in 24 hours
- more than five pending notifications
- no article or no primary source collected in 48 hours

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
the item to `dead_letter`.

## Metrics

`metric_events` stores:

- crawl totals and failed sources
- primary-source count
- editorial quality and selected-source count
- LLM latency, input/output tokens, and errors
- automatic prompt rollback events

Logs default to JSON. Set `LOG_FORMAT=text` for local interactive output.
Credentials and bearer tokens are redacted before logging.
