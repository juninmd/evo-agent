# Homologação evo-agent

Dois estágios: **local** (rápido, debugável) → **cluster** (produção real).

## Fase 1 — Local
```bash
bash homolog/01_local.sh
```
Testa: credenciais → OpenCode SDK → provider list → model → artigo → GitHub → Telegram

## Fase 2 — Cluster
```bash
bash homolog/02_cluster.sh
```
Testa: image pull → job run → logs → GitHub commit → Telegram recebido
