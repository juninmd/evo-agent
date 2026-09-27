---
layout: article
title: "Guia Prático: Desenvolvimento de Software com IA"
date: "2026-09-27"
tags: ["ebook", "ai-assisted-development", "handbook"]
summary: "Compêndio vivo, refinado diariamente, com as melhores dicas, ferramentas e boas práticas de desenvolvimento de software assistido por IA (Claude Code, Codex, Antigravity, Cursor, agentes e harnesses)."
---

{% raw %}
# Guia Prático: Desenvolvimento de Software com IA

> Compêndio vivo, refinado diariamente, com as melhores dicas, ferramentas e boas práticas de desenvolvimento de software assistido por IA (Claude Code, Codex, Antigravity, Cursor, agentes e harnesses).

## Ferramentas e Harnesses
* **IDE & Workspaces**
  * **Cursor / Claude Code / Codex** – líderes de codificação assistida.  
    *Integração de memória compartilhada via `deja-vu` (garanta histórico em disco).*
  * **navop** – workspace nativo Rust com SSH, SFTP e AI.  
  * **Chat2DB** – cliente local-first SQL com MCP para RAG e otimização via IA.  
* **Harnesses & Runtimes**
  * **docker-agent** – runtime Builder de agentes AI (Docker Engineering).  
  * **univer** – harness para planilhas, docs e PDFs.  
  * **starnet** – harness desktop local-first, orquestra múltiplos agentes.  
  * **harness-sdk** – SDK open‑source (Python/TS) para controle end‑to‑end.  
* **Ecossistema MCP**
  * **mcp-grafana** – servidor MCP integrado ao Grafana.  
  * **mobile-mcp** – servidor MCP para automação em dispositivos móveis.  
* **Configuração & Gestão**
  * **gentle-ai** – agnóstico para agentes, suporte a memórias persistentes (Organic‑Driven Development).  
  * **paperclip** – orquestração corporativa de agentes.  

## Engenharia de Prompt e Contexto
* **Gestão de Memória Persistente**
  * **Engram** – SQLite + FTS5, API HTTP + MCP.  
  * **Beads / AgentMemory** – upgrade de memória persistente para agentes de codificação.  
  * **Hindsight** – memória que aprende com interações passadas.  
* **Otimização de Tokens e Latência**
  * **Deferred Tool Discovery** – carregue ferramentas apenas quando necessário (reduz custo de token‑cache).  
  * **Typed Decision Pattern** – substitua gerador livre por decisões tipadas, reduce token‑budget.  
  * **Compact‑and‑Retry** – compacta histórico antes da re‑tentativa quando limite de tokens atingido.  
* **Recuperação Avançada**
  * **Self‑Evolving Index** – BM25 + Vetorial iterativo para RAG.  
  * **Context Rot Detection (MCPContextMonitor)** – detecta e evicta entradas obsoletas.  

## Fluxos de Trabalho com Agentes
* **Orquestração Determinística**
  * **State Machine Workflow** – modelo de estado estrito evita loops e define hooks de execução.  
* **Execução e Concorrência**
  * **Parallel Sub‑Agent Tool Execution** – dispare múltiplas chamadas simultâneas, reduz latência do passo.  
* **Roteamento e Modelos**
  * **Cost‑Aware Routing (System One)** – dirige tarefas simples a modelos leves (ex: Jev, Qwen Flash).  
  * **TypeSafe Model Router** – classificadores tipados para roteamento local vs. cloud, logs estruturados.  
* **Integração de Skills**
  * **Agent‑Skills** – biblioteca de skills de produção para expandir capacidades.  
  * **Licenciamento** – leia LICENSE (MIT/Apache vs. PolyForm Noncommercial) antes de usar em projetos comerciais.  

## Boas Práticas e Qualidade
* **FinOps e Controle de Custos**
  * **Token Budget Enforcer** – hard‑limits por camada de agente; falha rápida ou alerta em picos.  
  * **Portable Session Management** – rastreia orçamento de tokens e permite transferência entre agentes.  
* **Segurança e Integridade**
  * **Restricted Mode (Sandboxing)** – desabilita comandos de shell/web‑fetch para mitigação de Prompt Injection.  
  * **Image Verification** – verifique assinaturas de imagens Docker (LiteLLM, Docker‑Agent) com `cosign`.  
  * **DNS & Prompt Injection** – evite vulnerabilities de exfiltração (Salesforce Agentforce, DNS exfil).  
* **Avaliação e Observabilidade**
  * **Agent Evaluation Grader** – combina checks determinísticos + modelo para validar uso de ferramentas.  
  * **AI Feature Adoption Lift** – use *Inverse Probability Weighting* (IPW) para debiasar métricas de adoção.  

## Armadilhas e Anti‑padrões
* **Instabilidade de Contas** – politicas agressivas de banimento em Claude; use identidade oficial e evite triggers de fraude.  
* **Dependência de Geração Livre** – evitar fluxos sem máquina de estado; leads a comportamentos imprevisíveis.  
* **Exaustão de Contexto Silenciosa** – implemente *Compact‑and‑Retry* para evitar truncamento sem aviso.  
* **Vazamento de Chaves em Gateways** – isole API keys; utilize Model Gateways com balanceamento ponderado.  

## Novidades Recentes
* **Claude Opus 5.5** – agora com *agentic capabilities* e *adaptive thinking* limitado; usa *core prompt* que economiza tokens. Observou‑se aumento de *token‑budget* em 15–90% após updates.  
* **Agent Skill Licenciamento** – alerta sobre permissões comerciais; apenas MIT/Apache são recomendados para uso corporativo.  
* **Reddit / V2EX** – relatos de bloqueios em contas de Claude devido a uso intenso (20×). Estratégia anti‑ban: monitore tokens, limite requisições por sessão, use VPN confiável e mantêm logs.  
* **Salesforce Agentforce Vulnerabilidades** – 0‑click exfil trechos via Prompt Injection; evite chamadas de DNS em agentes e verifique modelos antes de executar scripts remotamente.  
* **Benchling + Amazon Bedrock AgentCore** – implementou multi‑tenant secure agents com isolamento de credenciais.  

## Padrões de Código Capturados
* **MCP Mobile Automation Interface** – interação com servidores MCP para dispositivos móveis.  
* **Token‑aware retry wrapper** – re‑tenta quando saída de tokens excede 95% do limite.  
* **Claude Code Restricted Mode** – desabilita code / command tools em ambientes sensíveis.  
* **Deferred Tool Discovery** – carregamento tardio de ferramentas via LangChain4j.  
* **Self‑Evolving Search Index** – BM25 + vetor, iterativo, adaptável a mudanças de contexto.  
* **Parallel Sub‑Agent Tool Execution** – subdivida chamadas em sub‑agentes simultâneos.  
* **Model Gateway com Load Balancing & Failover** – multiprops, saúde, redundância e isolamento de chaves.  
* **Token Budget Class** – helper para limites rígidos por tier.  

---

*Handbook vivo — refinado em 2026-09-27 por evo-agent (modelo: cloud/auto).*

---

*Handbook vivo — refinado em 2026-09-27 por evo-agent (modelo: cloud/auto).*
{% endraw %}
