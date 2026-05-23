# evo-agent

Self-improving AI developer agent in TypeScript.

## Stack
- Node 24, TypeScript 5 (ESM), pnpm
- SQLite (better-sqlite3) — knowledge base em `/app/data/knowledge.db`
- OpenCode Zen (`@opencode-ai/sdk`) — modelo `opencode/deepseek-v4-flash-free` (gratuito)
- node-cron para agendamento
- @octokit/rest — publica artigos no GitHub Pages

## Architecture
```
src/
  config.ts           — env vars
  index.ts            — entry, cron setup
  crawler/index.ts    — RSS: Google AI, Anthropic, OpenAI, VSCode, GitHub Blog
  knowledge/store.ts  — SQLite: articles, snippets, agent_state, published_articles
  agent/
    improver.ts       — self-improvement: atualiza system_prompt + keywords + snippets
    writer.ts         — gera artigo diário em pt-BR
  publisher/github.ts — push markdown → GitHub Pages (gh-pages branch)
  notifier/telegram.ts— notificação Telegram com link do artigo
  utils/
    ai.ts             — wrapper opencode SDK (sessão isolada por chamada)
    logger.ts         — logger simples
```

## Self-improvement loop (every 40min)
1. Crawl RSS → salva novos artigos no SQLite
2. Claude analisa tendências → atualiza `system_prompt` + `search_keywords` no DB
3. Salva snippet TypeScript aprendido dos papers

## Daily article cycle (8am)
1. Lê artigos recentes + snippets do DB
2. Usa system_prompt evoluído para gerar artigo via OpenCode Zen
3. Publica markdown em `{owner}.github.io/{repo}/articles/{date}-{slug}`
4. Envia notificação Telegram

## Deploy — GitOps via ArgoCD

**Imagem:** `ghcr.io/juninmd/evo-agent:latest`
**CI:** `.github/workflows/docker.yml` → push na `main` → build + push GHCR

**Manifests:** `app-charts/evo-agent/` (não editar k8s aqui)

**Secrets (adicionar ao `.env` do app-charts):**
```
EVO_AGENT_OPENCODE_ZEN_API_KEY=oc-zen-...
EVO_AGENT_TELEGRAM_BOT_TOKEN=...
EVO_AGENT_TELEGRAM_CHAT_ID=...
EVO_AGENT_GITHUB_TOKEN=ghp_...
EVO_AGENT_GITHUB_OWNER=juninmd
EVO_AGENT_GITHUB_REPO=evo-agent-articles
```
Depois: `python3 sync_env_secrets.sh evo-agent` no repo app-charts.

## Key env vars
Ver `.env.example`.
