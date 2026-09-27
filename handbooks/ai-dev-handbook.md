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
*   **IDE & Workspaces:**
    *   **Cursor / Claude Code / Codex:** Ferramentas líderes de codificação assistida. Use [deja-vu](https://github.com/vshulcz/deja-vu) para compartilhar memória entre esses agentes via histórico de disco (sem LLM/embeddings).
    *   **navop:** Workspace nativo em Rust para bancos de dados, SSH, SFTP e AI [navop](https://github.com/feigeCode/navop).
    *   **Chat2DB:** Cliente de banco de dados local-first com suporte a MCP para geração e otimização de SQL via IA [Chat2DB](https://github.com/OtterMind/Chat2DB).
*   **Harnesses & Runtimes:**
    *   **docker-agent:** Runtime e builder de agentes AI desenvolvido pela Docker Engineering [docker-agent](https://github.com/docker/docker-agent).
    *   **univer:** Harness de "escritório" para agentes, provendo runtime para planilhas, docs e PDFs [univer](https://github.com/dream-num/univer).
    *   **starnet:** Harness desktop local-first para orquestração de múltiplos agentes [starnet](https://github.com/androoAGI/starnet).
    *   **harness-sdk:** SDK open-source para controle end-to-end de agentes em produção (Python/TS) [harness-sdk](https://github.com/strands-agents/harness-sdk).
*   **Ecossistema MCP (Model Context Protocol):**
    *   **mcp-grafana:** Servidor MCP para integração com Grafana [mcp-grafana](https://github.com/grafana/mcp-grafana).
    *   **mobile-mcp:** Servidor MCP para automação e scraping de dispositivos móveis (iOS/Android/Emuladores) [mobile-mcp](https://github.com/mobile-next/mobile-mcp).
*   **Configuração & Gestão:**
    *   **gentle-ai:** Configurador agnóstico para agentes (Claude Code, Cursor, etc.) com suporte a memórias persistentes e Organic-Driven Development [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai).
    *   **paperclip:** Gestão de agentes em ambiente corporativo [paperclip](https://github.com/paperclipai/paperclip).

## Engenharia de Prompt e Contexto
*   **Gestão de Memória Persistente:**
    *   **Engram:** Sistema de memória agnóstico baseado em SQLite + FTS5 com API HTTP e MCP [engram](https://github.com/Gentleman-Programming/engram).
    *   **Beads / AgentMemory:** Implementações de upgrade de memória para agentes de codificação para manter contexto de longo prazo [beads](https://github.com/gastownhall/beads), [agentmemory](https://github.com/rohitg00/agentmemory).
    *   **Hindsight:** Memória de agente que aprende com interações passadas [hindsight](https://github.com/vectorize-io/hindsight).
*   **Otimização de Tokens e Latência:**
    *   **Deferred Tool Discovery:** Carregue ferramentas apenas quando o fluxo da conversa indicar necessidade. Reduz latência de inicialização e custo de token-cache (ex: Vercel AI SDK Workflow).
    *   **Typed Decision Pattern:** Substitua texto generativo por decisões tipadas e calibradas para reduzir drasticamente o custo de tokens de saída e aumentar a confiabilidade.
*   **Recuperação Avançada:**
    *   **Self-Evolving Index:** Use índices híbridos (BM25 + Vetorial) que evoluem iterativamente para RAG agentico.
    *   **Context Rot Detection:** Implemente monitores de contexto (MCPContextMonitor) para detectar e evictar entradas obsoletas, prevenindo a degradação do contexto.

## Fluxos de Trabalho com Agentes
*   **Orquestração Determinística:**
    *   **State Machine Workflow:** Substitua o "deixe o LLM decidir" por máquinas de estado para garantir transições determinísticas, evitar loops e definir hooks claros de execução de ferramentas.
*   **Execução e Concorrência:**
    *   **Parallel Sub-Agent Tool Execution:** Dispare múltiplas chamadas de ferramentas simultaneamente via sub-agentes para reduzir a latência total do passo (Step Latency).
*   **Roteamento e Modelos:**
    *   **Cost-Aware Routing (System One):** Implemente roteadores que direcionam tarefas simples para modelos leves (ex: Jev, Qwen Flash) e reservam modelos caros para complexidade alta.
    *   **TypeSafe Model Router:** Use classificadores tipados para roteamento entre modelos locais (Ollama) e cloud, com logs estruturados para FinOps.
*   **Integração de Skills:**
    *   **Agent-Skills:** Utilize bibliotecas de skills de engenharia de nível de produção para expandir capacidades dos agentes [agent-skills](https://github.com/addyosmani/agent-skills).

## Boas Práticas e Qualidade
*   **FinOps e Controle de Custos:**
    *   **Token Budget Enforcer:** Implemente hard-limits de tokens por tier de agente. O sistema deve "falhar rápido" ou disparar alertas ao detectar picos (ex: saltos de 15% para 90% de uso no Claude).
    *   **Portable Session Management:** Use gerenciadores de sessão que rastreiem o orçamento de tokens e permitam a transferência de sessões entre agentes.
*   **Segurança e Integridade:**
    *   **Restricted Mode (Sandboxing):** Em ambientes sensíveis, instancie agentes em modo restrito, desabilitando ferramentas de comando/web-fetch para evitar prompt injection e vazamento de repositórios.
    *   **Image Verification:** Verifique assinaturas de imagens Docker de gateways de IA (ex: LiteLLM) usando `cosign` antes do deploy.
*   **Avaliação e Observabilidade:**
    *   **Agent Evaluation Grader:** Combine checks determinísticos com gradação via modelo para validar a correção do uso de ferramentas.
    *   **AI Feature Adoption Lift:** Para features opt-in, utilize *Inverse Probability Weighting* (IPW) para debiasar estimativas de impacto e adoção.

## Armadilhas e Anti-padrões
*   **Instabilidade de Contas:** Cuidado com políticas rigorosas de banimento em modelos como Claude (especialmente via VPN/nodes); utilize métodos de assinatura oficiais e evite comportamentos que disparem triggers de fraude.
*   **Dependência de Geração Livre:** Evitar fluxos onde o LLM controla totalmente o estado da aplicação; a falta de uma máquina de estado leva a comportamentos imprevisíveis em produção.
*   **Exaustão de Contexto Silenciosa:** Não confiar apenas no limite do modelo. Implementar wrappers de *Compact-and-Retry* que compactam o histórico quando o limite de tokens de saída é atingido antes de tentar novamente.
*   **Vazamento de Chaves em Gateways:** Evitar o compartilhamento simples de API Keys; utilizar Model Gateways com isolamento de chaves e load balancing ponderado.

---

*Handbook vivo — refinado em 2026-09-27 por evo-agent (modelo: cloud/auto).*
{% endraw %}
