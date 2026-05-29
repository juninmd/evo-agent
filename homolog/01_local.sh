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
log "Preflight: porta 4096 e processos opencode"
if netstat -ano 2>/dev/null | grep -q ":4096"; then
  PID=$(netstat -ano 2>/dev/null | grep ":4096" | awk '{print $NF}' | head -1 | tr -d ' ')
  warn "Porta 4096 ocupada pelo PID $PID — matando..."
  if [ -n "$PID" ] && [ "$PID" -gt 0 ] 2>/dev/null; then
    powershell.exe Stop-Process -Id "$PID" -Force 2>/dev/null || taskkill //PID "$PID" //F 2>/dev/null || true
  fi
  sleep 2
fi
ok "Porta 4096 livre"

# ── STEP 1: Extrair credenciais do cluster ───────────────────────────────
log "STEP 1 — Extraindo credenciais do cluster"
extract_secret() {
  kubectl get secret evo-agent-secret -n evo-agent \
    -o jsonpath="{.data.$1}" 2>/dev/null | base64 -d
}

export OPENCODE_API_KEY=$(extract_secret OPENCODE_API_KEY)
export TELEGRAM_BOT_TOKEN=$(extract_secret TELEGRAM_BOT_TOKEN)
export TELEGRAM_CHAT_ID=$(extract_secret TELEGRAM_CHAT_ID)
export GITHUB_TOKEN=$(extract_secret GITHUB_TOKEN)
export GITHUB_OWNER=$(extract_secret GITHUB_OWNER)
export GITHUB_REPO=$(extract_secret GITHUB_REPO)
export GITHUB_BRANCH=gh-pages
export DB_PATH=./homolog/homolog.db
export LOG_LEVEL=info

for var in OPENCODE_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID GITHUB_TOKEN GITHUB_OWNER GITHUB_REPO; do
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

# ── STEP 4: OpenCode SDK — provider list ─────────────────────────────────
log "STEP 4 — OpenCode SDK: provider list e seleção de modelo"
npx tsx homolog/steps/step4_provider.ts 2>&1 | tee /tmp/step4.out
grep -q "MODELO_SELECIONADO=" /tmp/step4.out \
  || fail "Nenhum modelo selecionado pelo OpenCode SDK"
eval $(grep "MODELO_SELECIONADO=" /tmp/step4.out)
ok "Modelo selecionado: $MODELO_SELECIONADO"
export OPENCODE_MODEL="$MODELO_SELECIONADO"

# ── STEP 5: Gerar artigo ─────────────────────────────────────────────────
log "STEP 5 — Gerar artigo diário com IA (modelo: $OPENCODE_MODEL)"
npx tsx homolog/steps/step5_article.ts 2>&1 | tee /tmp/step5.out
grep -q "ARTICLE_TITLE=" /tmp/step5.out \
  || fail "Artigo não gerado — sem ARTICLE_TITLE no output"
eval $(grep "ARTICLE_TITLE=" /tmp/step5.out)
eval $(grep "ARTICLE_SLUG=" /tmp/step5.out)
ok "Artigo gerado: $ARTICLE_TITLE"

# ── STEP 6: Publicar no GitHub ───────────────────────────────────────────
log "STEP 6 — Publicar artigo no GitHub (branch: $GITHUB_BRANCH)"
npx tsx homolog/steps/step6_publish.ts 2>&1 | tee /tmp/step6.out
grep -q "ARTICLE_URL=" /tmp/step6.out \
  || fail "Artigo não publicado — sem ARTICLE_URL no output"
eval $(grep "ARTICLE_URL=" /tmp/step6.out)
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
echo -e "  Modelo:  $OPENCODE_MODEL"
echo -e "  Artigo:  $ARTICLE_TITLE"
echo -e "  URL:     $ARTICLE_URL"
echo -e "  Verifique o Telegram para confirmar as 2 mensagens     "
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}\n"
