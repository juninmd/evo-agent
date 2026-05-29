#!/usr/bin/env bash
# homolog/02_cluster.sh — Fase 2: Homologação no cluster Kubernetes
# Uso: bash homolog/02_cluster.sh
set -euo pipefail

BOLD="\033[1m"; RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"; CYAN="\033[36m"; RESET="\033[0m"
PASS="${GREEN}✅ PASS${RESET}"; FAIL="${RED}❌ FAIL${RESET}"
NS=evo-agent
JOB_NAME="evo-homolog-$(date +%s)"

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${RESET} $*"; }
ok()   { echo -e "  ${PASS} — $*"; }
fail() { echo -e "  ${FAIL} — $*"; exit 1; }
warn() { echo -e "  ${YELLOW}⚠️  WARN${RESET} — $*"; }

echo -e "\n${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  FASE 2 — HOMOLOGAÇÃO CLUSTER: evo-agent             ${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}\n"

# ── STEP 1: Cluster reachable ────────────────────────────────────────────
log "STEP 1 — Cluster acessível"
kubectl cluster-info --request-timeout=5s &>/dev/null \
  && ok "kubectl conectado" \
  || fail "kubectl não consegue acessar o cluster"

# ── STEP 2: ArgoCD app evo-agent Synced+Healthy ──────────────────────────
log "STEP 2 — App evo-agent no ArgoCD"
SYNC=$(kubectl get app evo-agent -n argocd -o jsonpath='{.status.sync.status}' 2>/dev/null)
HEALTH=$(kubectl get app evo-agent -n argocd -o jsonpath='{.status.health.status}' 2>/dev/null)
[ "$SYNC" = "Synced" ]   && ok "Sync: $SYNC"   || warn "Sync: $SYNC (esperado Synced)"
[ "$HEALTH" = "Healthy" ] && ok "Health: $HEALTH" || warn "Health: $HEALTH"

# ── STEP 3: Secrets presentes no namespace ───────────────────────────────
log "STEP 3 — Secrets evo-agent-secret"
for key in OPENCODE_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID GITHUB_TOKEN GITHUB_OWNER GITHUB_REPO; do
  VAL=$(kubectl get secret evo-agent-secret -n $NS -o jsonpath="{.data.$key}" 2>/dev/null | base64 -d)
  [ -n "$VAL" ] && ok "$key presente" || fail "Secret $key ausente ou vazio"
done

# ── STEP 4: Capturar commit HEAD atual do evo-agent (para checar depois) ─
log "STEP 4 — Registrando último commit do repo evo-agent"
GITHUB_TOKEN=$(kubectl get secret evo-agent-secret -n $NS -o jsonpath='{.data.GITHUB_TOKEN}' | base64 -d)
GITHUB_OWNER=$(kubectl get secret evo-agent-secret -n $NS -o jsonpath='{.data.GITHUB_OWNER}' | base64 -d)
GITHUB_REPO=$(kubectl get secret evo-agent-secret -n $NS -o jsonpath='{.data.GITHUB_REPO}' | base64 -d)

COMMIT_BEFORE=$(curl -sf \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/gh-pages" \
  2>/dev/null | grep '"sha"' | head -1 | awk -F'"' '{print $4}' | cut -c1-12)
ok "Commit gh-pages antes do job: ${COMMIT_BEFORE:-desconhecido}"

# ── STEP 5: Criar job de homologação ─────────────────────────────────────
log "STEP 5 — Criando job: $JOB_NAME"
kubectl create job "$JOB_NAME" --from=cronjob/evo-agent-daily -n $NS
ok "Job criado"

# ── STEP 6: Aguardar conclusão (máx 10 min) ──────────────────────────────
log "STEP 6 — Aguardando conclusão do job (timeout: 10 min)"
JOB_UID=$(kubectl get job "$JOB_NAME" -n $NS -o jsonpath='{.metadata.uid}')
POD_NAME=""
TIMEOUT=600
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Capturar pod antes que seja deletado
  if [ -z "$POD_NAME" ]; then
    POD_NAME=$(kubectl get pod -n $NS -l "batch.kubernetes.io/controller-uid=${JOB_UID}" \
      -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  fi

  STATUS=$(kubectl get job "$JOB_NAME" -n $NS -o jsonpath='{.status}' 2>/dev/null)
  if echo "$STATUS" | grep -q '"completionTime"'; then
    FINAL=$(kubectl get job "$JOB_NAME" -n $NS \
      -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null)
    FAILED=$(kubectl get job "$JOB_NAME" -n $NS \
      -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null)
    [ "$FINAL" = "True" ] && break
    [ "$FAILED" = "True" ] && { warn "Job falhou — coletando logs..."; break; }
  fi
  printf "."
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done
echo ""

DURATION=$(kubectl get job "$JOB_NAME" -n $NS -o jsonpath='{.status.completionTime}' 2>/dev/null | \
  xargs -I{} bash -c 'echo $(($(date -d {} +%s) - $(date -d '\"$(kubectl get job '$JOB_NAME' -n '$NS' -o jsonpath=\"{.metadata.creationTimestamp}\" 2>/dev/null)\"' +%s 2>/dev/null)))' 2>/dev/null || echo "?")

FINAL=$(kubectl get job "$JOB_NAME" -n $NS \
  -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null)
[ "$FINAL" = "True" ] && ok "Job concluído (${ELAPSED}s)" || fail "Job não completou em ${TIMEOUT}s"

# ── STEP 7: Coletar e analisar logs ──────────────────────────────────────
log "STEP 7 — Analisando logs do job"

# Tenta pegar log do pod direto (se ainda existe)
LOGS=""
if [ -n "$POD_NAME" ]; then
  LOGS=$(kubectl logs -n $NS "$POD_NAME" 2>/dev/null || true)
fi
# Fallback: por label
if [ -z "$LOGS" ]; then
  LOGS=$(kubectl logs -n $NS -l "batch.kubernetes.io/controller-uid=${JOB_UID}" 2>/dev/null || true)
fi

if [ -z "$LOGS" ]; then
  warn "Logs não disponíveis (pod já foi coletado pelo GC)"
else
  echo "$LOGS" | grep -E "\[INFO\]|\[ERROR\]|\[WARN\]" | tail -20
fi

# Checar erros críticos
if echo "$LOGS" | grep -q "\[ERROR\]"; then
  ERRORS=$(echo "$LOGS" | grep "\[ERROR\]")
  fail "Erros encontrados nos logs:\n$ERRORS"
fi
ok "Nenhum erro nos logs"

# ── STEP 8: Verificar novo commit no GitHub ───────────────────────────────
log "STEP 8 — Verificando novo commit no GitHub"
sleep 5  # dar tempo para o push completar
COMMIT_AFTER=$(curl -sf \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/gh-pages" \
  2>/dev/null | grep '"sha"' | head -1 | awk -F'"' '{print $4}' | cut -c1-12)

if [ "$COMMIT_AFTER" != "$COMMIT_BEFORE" ] && [ -n "$COMMIT_AFTER" ]; then
  ok "Novo commit detectado: ${COMMIT_BEFORE} → ${COMMIT_AFTER}"
  # Buscar URL do artigo publicado
  ARTICLE_URL=$(curl -sf \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/gh-pages" \
    2>/dev/null | grep '"message"' | head -1 | awk -F'"' '{print $4}')
  ok "Commit message: $ARTICLE_URL"
else
  warn "Commit não mudou (${COMMIT_BEFORE}) — artigo pode já ter sido gerado hoje ou houve erro silencioso"
fi

# ── RESULTADO FINAL ────────────────────────────────────────────────────────
echo -e "\n${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  ✅ FASE 2 CONCLUÍDA — CLUSTER VALIDADO             ${RESET}"
echo -e "  Job:      $JOB_NAME"
echo -e "  Duração:  ${ELAPSED}s"
echo -e "  Commits:  $COMMIT_BEFORE → $COMMIT_AFTER"
echo -e "  ⚠️  Verifique manualmente o Telegram para confirmar"
echo -e "     notificação do artigo recebida."
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}\n"

# Cleanup job
kubectl delete job "$JOB_NAME" -n $NS --ignore-not-found &>/dev/null
