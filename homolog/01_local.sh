#!/usr/bin/env bash
# homolog/01_local.sh — Fase 1: Homologação local do evo-agent
# Uso: bash homolog/01_local.sh
# Pré-requisito: kubectl configurado e apontando para o cluster
set -euo pipefail

BOLD="\033[1m"; RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"; CYAN="\033[36m"; RESET="\033[0m"
PASS="${GREEN}✅ PASS${RESET}"; FAIL="${RED}❌ FAIL${RESET}"

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${RESET} $*"; }
ok()   { echo -e "  ${PASS} — $*"; }
fail() { echo -e "  ${FAIL} — $*"; exit 1; }
warn() { echo -e "  ${YELLOW}⚠️  WARN${RESET} — $*"; }

echo -e "\n${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  FASE 1 — HOMOLOGAÇÃO LOCAL: evo-agent               ${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}\n"

# ── Preflight ────────────────────────────────────────────────────────────
log "Preflight: LiteLLM cluster service"
PF_PID=""
if [ -z "${LITELLM_API_BASE:-}" ]; then
  kubectl -n ai port-forward svc/litellm 14000:4000 >/tmp/evo-litellm-port-forward.log 2>&1 &
  PF_PID=$!
  trap 'if [ -n "$PF_PID" ]; then kill "$PF_PID" 2>/dev/null || true; fi' EXIT
  sleep 3
  kill -0 "$PF_PID" 2>/dev/null || fail "Port-forward LiteLLM falhou: $(cat /tmp/evo-litellm-port-forward.log)"
  export LITELLM_API_BASE=http://127.0.0.1:14000/v1
fi
ok "LiteLLM API base: $LITELLM_API_BASE"

# ── STEP 1: Extrair credenciais do cluster ───────────────────────────────
log "STEP 1 — Extraindo credenciais do cluster"
extract_secret() {
  kubectl get secret evo-agent-secret -n evo-agent \
    -o jsonpath="{.data.$1}" 2>/dev/null | base64 -d | tr -d '\n\r'
}

export LITELLM_API_KEY=$(extract_secret LITELLM_API_KEY)
if [ -z "$LITELLM_API_KEY" ]; then
  LITELLM_API_KEY=$(extract_secret OPENCODE_API_KEY)
fi
export LITELLM_MODEL=${LITELLM_MODEL:-local/qwen2.5}
export TELEGRAM_BOT_TOKEN=$(extract_secret TELEGRAM_BOT_TOKEN)
export TELEGRAM_CHAT_ID=$(extract_secret TELEGRAM_CHAT_ID)
export GITHUB_TOKEN=$(extract_secret GITHUB_TOKEN)
export GITHUB_OWNER=$(extract_secret GITHUB_OWNER)
export GITHUB_REPO=$(extract_secret GITHUB_REPO)
export GITHUB_BRANCH=gh-pages
export DB_PATH=./homolog/homolog.db
export LOG_LEVEL=info

for var in LITELLM_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID GITHUB_TOKEN GITHUB_OWNER GITHUB_REPO; do
  [ -n "${!var}" ] && ok "$var = ${!var:0:8}..." || fail "Secret $var vazio ou ausente"
done

# ── STEP 2: Telegram ping ────────────────────────────────────────────────
log "STEP 2 — Testando Telegram (ping direto via curl)"
TG_HTTP=$(curl -s -o /tmp/tg_response.json -w "%{http_code}" \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"[HOMOLOG STEP 2] Ping local $(date '+%H:%M:%S')\"}")

[ "$TG_HTTP" = "200" ] \
  && ok "Telegram HTTP $TG_HTTP — $(cat /tmp/tg_response.json | grep -o '"ok":[a-z]*')" \
  || fail "Telegram HTTP $TG_HTTP — $(cat /tmp/tg_response.json)"

# ── STEP 3: GitHub API acessível ─────────────────────────────────────────
log "STEP 3 — Testando acesso ao GitHub"
GH_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}" 2>&1)
[ "$GH_STATUS" = "200" ] \
  && ok "GitHub repo ${GITHUB_OWNER}/${GITHUB_REPO} acessível" \
  || fail "GitHub retornou HTTP $GH_STATUS"

# ── STEP 4: LiteLLM via AI SDK ────────────────────────────────────────────
log "STEP 4 — LiteLLM via AI SDK: seleção de modelo"
npx tsx homolog/steps/step4_provider.ts 2>&1 | tee /tmp/step4.out
grep -q "MODELO_SELECIONADO=" /tmp/step4.out \
  || fail "Nenhum modelo selecionado pelo LiteLLM"
eval $(grep "MODELO_SELECIONADO=" /tmp/step4.out)
ok "Modelo selecionado: $MODELO_SELECIONADO"
export LITELLM_MODEL="$MODELO_SELECIONADO"

# ── STEP 5: Gerar artigo ─────────────────────────────────────────────────
log "STEP 5 — Gerar artigo diário com IA (modelo: $LITELLM_MODEL)"
npx tsx homolog/steps/step5_article.ts 2>&1 | tee /tmp/step5.out
grep -q "ARTICLE_TITLE=" /tmp/step5.out \
  || fail "Artigo não gerado — sem ARTICLE_TITLE no output"
ARTICLE_TITLE=$(grep "ARTICLE_TITLE=" /tmp/step5.out | head -1 | cut -d= -f2-)
ARTICLE_SLUG=$(grep "ARTICLE_SLUG=" /tmp/step5.out | head -1 | cut -d= -f2-)
ok "Artigo gerado: $ARTICLE_TITLE"

# ── STEP 6: Publicar no GitHub ───────────────────────────────────────────
log "STEP 6 — Publicar artigo no GitHub (branch: $GITHUB_BRANCH)"
npx tsx homolog/steps/step6_publish.ts 2>&1 | tee /tmp/step6.out
grep -q "ARTICLE_URL=" /tmp/step6.out \
  || fail "Artigo não publicado — sem ARTICLE_URL no output"
ARTICLE_URL=$(grep "ARTICLE_URL=" /tmp/step6.out | head -1 | cut -d= -f2-)
ok "Publicado: $ARTICLE_URL"

# ── STEP 7: Notificar Telegram com artigo real ───────────────────────────
log "STEP 7 — Enviando notificação Telegram com artigo real"
npx tsx homolog/steps/step7_telegram.ts 2>&1 | tee /tmp/step7.out
grep -q "TELEGRAM_SENT=true" /tmp/step7.out \
  || fail "Notificação Telegram não confirmada"
ok "Telegram notificado com artigo real"

# ── RESULTADO ────────────────────────────────────────────────────────────
echo -e "\n${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  ✅ FASE 1 CONCLUÍDA — TODOS OS STEPS PASSARAM       ${RESET}"
echo -e "  Modelo:  $LITELLM_MODEL"
echo -e "  Artigo:  $ARTICLE_TITLE"
echo -e "  URL:     $ARTICLE_URL"
echo -e "  Verifique o Telegram para confirmar as 2 mensagens     "
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}\n"
