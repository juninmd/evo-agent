# ADR 0001: Guarded self-improvement

## Status

Accepted.

## Context

The improvement cycle previously replaced the active system prompt directly
with LLM output. A malformed or weaker candidate could silently reduce
editorial quality for every later publication.

## Decision

- Score every candidate against mandatory editorial and prompt-injection
  controls.
- Promote only candidates that meet the minimum score and do not regress
  against the active prompt.
- Persist promoted and rejected versions in `prompt_versions`.
- Roll back automatically when the publication quality gate rejects generated
  content.
- Keep `npm run prompt:rollback` as an explicit operational recovery path.

## Consequences

Prompt evolution is slower but auditable and reversible. The deterministic
policy benchmark is intentionally conservative; changes to its rules require
tests and review.
