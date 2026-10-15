---
layout: article
title: "Relatório Quinzenal: Paradigmas System One, Modelos de Decisão Rápida e Segurança de Agentes MCP"
date: "2026-10-15"
tags: ["biweekly-report", "ai-agents", "llm"]
summary: "Jeva: System One Models from First Principles — Artigo propõe modelos \"System One\" para decisão direta e baixa latência, argumentando que designs atuais falham em quatro requisitos estruturais: nullaware, grounded, compositional e verifiable Jeva: System One Models from First Principleshttps://huggingface.co/papers/2610.18773."
reading_time: 10
---

{% raw %}
**Periodo:** 01/10/2026 a 15/10/2026

## Destaques do período

- **Jeva: System One Models from First Principles** — Artigo propõe modelos "System One" para decisão direta e baixa latência, argumentando que designs atuais falham em quatro requisitos estruturais: *null-aware*, *grounded*, *compositional* e *verifiable* [Jeva: System One Models from First Principles](https://huggingface.co/papers/2610.18773).

- **VideoJev: System One para Entendimento de Vídeo** — Extensão da família Jeva que transforma observação de vídeo em decisões estruturadas e oportunas, adaptando modelos multimodais pré-treinados para interação em tempo real [VideoJev: System One Model for Video Understanding and Interaction](https://huggingface.co/papers/2610.18615).

- **GroundingPI: Grounding Físico para Inteligência Incorporada** — Modelo de fundação focado em *grounding* preciso (qual objeto, onde está) mesmo em cenas complexas e objetos minúsculos, com latência compatível com controle em malha fechada [GroundingPI](https://huggingface.co/papers/2609.39601).

- **Agent-Reflex: Agentes que Refletem sobre Falhas** — Método para ensinar agentes de linguagem a agir reflexivamente diante de ruído em ferramentas MCP e intervenções de usuários, preenchendo lacuna de supervisão para aprendizado de reflexão [Agent-Reflex](https://huggingface.co/papers/2610.17953).

- **Thinking Inertia: LLMs Continuam Pensando quando Instruídos a Não Pensar** — Estudo revela que modos "no-thinking" são mal definidos; modelos mantêm computação interna latente mesmo com instrução explícita de não raciocinar, impactando custo e latência [Thinking Inertia](https://huggingface.co/papers/2610.11765).

- **AgentSWE: Agentes Codificadores Construindo Agentes** — Investiga se agentes de código conseguem construir agentes que de fato servem aos requisitos do usuário, expondo risco de desalinhamento silencioso na delegação de desenvolvimento [AgentSWE](https://huggingface.co/papers/2610.13361).

- **Claude Opus 5.5 Lidera Índice de Inteligência; Muse Wonder entra no Top 10** — Atualização do Artificial Analysis mostra Claude Opus 5.5 (57,6) na liderança; MiMo-V2.6-Pro (46,3) melhor peso aberto; Muse Wonder Full e Muse Wonder (Max) estreiam no top 10 [Artificial Analysis](https://artificialanalysis.ai/models#intelligence#2026-10-12).

- **Google lança Gemini 4 Argon (flagship reasoning)** — Modelo com 1M tokens de contexto, otimizado para engenharia de software complexa, resolução matemática/científica profunda e agentes multi-passo autônomos [OpenRouter: Gemini 4 Argon](https://openrouter.ai/google/gemini-4-argon).

- **Meta lança Muse Wonder (frontier reasoning multimodal)** — Aceita texto, imagem, vídeo, áudio e PDF; retorna texto; projetado para tarefas agenticas complexas pessoais e profissionais [OpenRouter: Muse Wonder](https://openrouter.ai/meta/muse-wonder).

- **OpenAI Agents SDK v0.24.0: Anotações MCP e Formatação de Exceções** — Expõe anotações MCP em ferramentas convertidas; suporta formatação de exceções de ferramentas no nível da execução (*run-wide*); corrige escrita em lote de sessões e adiamento de compactação para aprovações pendentes [OpenAI Agents SDK v0.24.0](https://github.com/openai/openai-agents-python/releases/tag/v0.24.0).

- **Microsoft Agent Framework Python 1.22.0: Suporte a Python 3.15** — Core e pacote raiz agora suportam Python 3.15 (com ressalvas de dependências upstream); .NET 1.25.0 traz considerações de reuso de aprovação, terminação SSE com `data: [DONE]`, citações e detalhes de erro em verificações Purview [MS Agent Framework Python 1.22.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.22.0) | [MS Agent Framework .NET 1.25.0](https://github.com/microsoft/agent-framework/releases/tag/dotnet-1.25.0).

- **LangGraph 1.2.15 + Checkpoints Postgres/SQLite 3.1.x** — Corrige IDs em mensagens no `DeltaChannel`, salvamento de escritas de nós em cache, parada em `interrupt_before` antes de dreno; checkpoints tratam `checkpoint_id` vazio como *latest* no histórico delta e validam labels de namespace [LangGraph 1.2.15](https://github.com/langchain-ai/langgraph/releases/tag/1.2.15) | [Checkpoint Postgres 3.1.3](https://github.com/langchain-ai/langgraph/releases/tag/checkpointpostgres%3D%3D3.1.3) | [Checkpoint SQLite 3.1.2](https://github.com/langchain-ai/langgraph/releases/tag/checkpointsqlite%3D%3D3.1.2).

- **Vercel AI SDK: Decision Models com Upload Multipart (Imagens PNG/JPEG)** — `@ai-sdk/typesafe-ai@3.0.19` adiciona suporte a entrada de imagem via multipart, *headers* obrigatórios e `typesafe.reference` para referenciar imagens em instruções/critérios; `typesafe.longContext` habilita contextos longos [Vercel AI SDK typesafe-ai 3.0.19](https://github.com/vercel/ai/releases/tag/%40ai-sdk%2Ftypesafe-ai%403.0.19).

- **Vercel AI SDK Workflow: Contexto de Runtime e Validação de Inputs** — `@ai-sdk/workflow@2.0.73` passa contexto de runtime permitido por `telemetry.includeRuntimeContext`; valida/normaliza inputs de ferramentas com schema original no `WorkflowAgent` (defaults, transforms, coercion, refinamentos, unknown-key handling) [Vercel AI SDK Workflow 2.0.73](https://github.com/vercel/ai/releases/tag/%40ai-sdk%2Fworkflow%402.0.73).

- **HydraFusion Max: Novo Modelo de Routing no GitHub Copilot** — Pool de modelos atualizado, orquestração melhorada e opção "Max" disponível no VS Code, app Copilot e GitHub Copilot [GitHub Changelog: HydraFusion Max](https://github.blog/changelog/2026-10-14-hydrafusion-updates-and-new-max-option).

- **Claude Code v2.1.300: virtualText, Telemetria de Cache e UI Programática** — Adiciona `virtualText` (texto no prompt que não entra no rascunho/submissão); separa tokens de criação de cache em 5min/1h no OpenTelemetry; `$.ui.view({...})` para controle de visualização [Claude Code v2.1.300](https://github.com/anthropics/claude-code/releases/tag/v2.1.300).

- **Claude Code v2.1.299: Desabilitar Menções de Arquivo e Compactação Ociosa** — `CLAUDE_CODE_DISABLE_FILE_MENTIONS` faz o modelo receber apenas paths de `@`; compactação automática em conversas 200K+ tokens ociosas por ~54 min [Claude Code v2.1.299](https://github.com/anthropics/claude-code/releases/tag/v2.1.299).

- **Copilot CLI 1.0.99/1.0.98/1.0.97/1.0.96: UX de Compartilhamento, Sandbox, Hooks e Secrets** — `/share` full-screen; `/sandbox` persistente por sessão; plugins trusted auto-install/update; hooks declarativos por agente; marketplace remoto com retry autenticado; sugestão de secrets no sandbox interativo; IDs de modelo case-insensitive [Copilot CLI 1.0.99](https://github.com/github/copilot-cli/releases/tag/v1.0.99-0) | [1.0.98](https://github.com/github/copilot-cli/releases/tag/v1.0.98) | [1.0.97](https://github.com/github/copilot-cli/releases/tag/v1.0.97) | [1.0.96](https://github.com/github/copilot-cli/releases/tag/v1.0.96).

- **Gemini CLI v0.64.0: Migração A2A V1→V2 e Correções ACP** — Implementa migração de settings V1→V2 no servidor A2A; corrige bridge `PromptResponse.usage` e emissão de `usage_update` [Gemini CLI v0.64.0](https://github.com/google-gemini/gemini-cli/releases/tag/v0.64.0).

- **Ollama v0.40.4: llama.cpp Atualizado para Decision Models e EmbeddingGemma 2** — Atualização do llama.cpp (b11521) para modelos de decisão e EmbeddingGemma 2; reuso de manifests verificados e modelos carregados nas rotas de inferência; compactação de estado recorrente após rollback especulativo no MLX [Ollama v0.40.4](https://github.com/ollama/ollama/releases/tag/v0.40.4).

- **LiteLLM v1.105.x: Verificação de Assinatura Cosign Obrigatória** — Todas as imagens Docker assinadas com cosign; verificação via hash de commit fixado (imutável) recomendada para garantir integridade da cadeia de suprimentos [LiteLLM v1.105.1](https://github.com/BerriAI/litellm/releases/tag/v1.105.1) | [v1.105.0](https://github.com/BerriAI/litellm/releases/tag/v1.105.0) | [v1.104.3](https://github.com/BerriAI/litellm/releases/tag/v1.104.3).

- **GitHub Actions Workflow Lockfiles em Public Preview** — Lockfiles de dependências de workflows agora em preview para GitHub Enterprise Cloud (com data residency); tags/branches podem mudar após revisão [GitHub Changelog: Workflow Lockfiles](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview).

- **GitHub Apps: Melhorias para Menor Privilégio e Gestão** — Facilita migração de PATs clássicos, melhora gestão de Apps e reduz permissões sensíveis solicitadas [GitHub Changelog: GitHub Apps Improvements](https://github.blog/changelog/2026-10-13-github-app-improvements-for-least-privilege-and-management).

- **Secret Scanning: Bloqueio Padrão de Chaves Anthropic + Salesforce/Cloudsmith** — Novos tipos de segredos detectados; chaves Anthropic bloqueadas com *push protection* por padrão [GitHub Changelog: Secret Scanning](https://github.blog/changelog/2026-10-13-secret-scanning-blocks-anthropic-keys-by-default-adds-salesforce).

- **Enterprise: Enforcement de Settings Gerenciados no Copilot** — Admins podem exigir que clientes suportados busquem settings gerenciados no servidor no *startup* (não cache); adição de versão mínima de cliente [GitHub Changelog: Enterprise Managed Settings](https://github.blog/changelog/2026-10-13-enterprise-managed-settings-enforcement-updates).

- **Cline v4.1.24 / SDK v0.0.93 / CLI v3.0.71: Provedor Padrão, Plugins In-Process** — Sem modelo escolhido, usa Claude Sonnet 5.5; provedor `ai&` mostra própria API key/picker; plugins carregam in-process (sem subprocesso node/bun); falha de load de plugin emite aviso com nome/erro [Cline v4.1.24](https://github.com/cline/cline/releases/tag/v4.1.24) | [SDK v0.0.93](https://github.com/cline/cline/releases/tag/sdk%2Fsdk%2Fv0.0.93) | [CLI v3.0.71](https://github.com/cline/cline/releases/tag/cli-v3.0.71).

- **LangGraph CLI 0.4.35: Deploy via Registry Privado** — `--image-pull-secret` para deploy através de registry privado; login com username do control plane; preservação de logs de build falhados [LangGraph CLI 0.4.35](https://github.com/langchain-ai/langgraph/releases/tag/cli%3D%3D0.4.35).

- **Engenharia GitHub: De 2.500 Requests para 24 no Star History** — Nova API de histórico de stars fornece tendências sem identidades individuais nem trabalho de DB não limitados; tradeoffs de arquitetura documentados [GitHub Blog: Star History Optimization](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/).

- **Reddit Codex: Migração para Opus, Capacidade de Modelos, Dot/Cloud** — Relatos de shadow-ban, capacidade limitada (GPT-6.1 Sol ruim, Astra instável em horário comercial), utilidade do Dot para revisão não-código e *spin up* de ambientes cloud quando recursos baixos [Reddit Codex: Migrating to Opus](https://www.reddit.com/r/codex/comments/1x5dd8g/sadly_migrating_to_opus/) | [Dot Helpful](https://www.reddit.com/r/codex/comments/1x5gaik/my_dot_has_been_really_helpful/) | [Dot Tricks](https://www.reddit.com/r/codex/comments/1x5kr1w/sharing_some_dot_tricks_i_was_using_recently/) | [Model Capacity](https://www.reddit.com/r/codex/comments/1x5lz67/selected_model_is_at_capacity_please_try_a/).

- **Reddit Claude Code: Segurança (Password Managers), Assinatura Max/Pro, Mod StretchText** — Alerta sobre inexperientes publicando gerenciadores de senha; relato de downgrade Max→Pro com queda imediata de uso; mod inspirado em *stretchtext* (1967) reduz leitura em 83% [Reddit ClaudeCode: Password Managers](https://www.reddit.com/r/ClaudeCode/comments/1x68om1/weve_reached_the_point_where_people_with/#community-signals) | [Max/Pro Usage](https://www.reddit.com/r/ClaudeCode/comments/1x62sro/max_subscription_but_only_pro_usage/#community-signals) | [StretchText Mod](https://www.reddit.com/r/ClaudeCode/comments/1x688sx/turning_a_crazy_idea_from_1967_into_a_claude_code/#community-signals).

- **Reddit GitHub Copilot: Opinião sobre Routing HydraFusion** — Discussão comunitária sobre roteamento de modelos via HydraFusion [Reddit Copilot: HydraFusion Routing](https://www.reddit.com/r/GithubCopilot/comments/1x6dl94/what_is_your_honest_opinion_on_this_gh_copilot/#community-signals).

## Tendências

O período consolida a transição de **LLMs generativos para modelos de decisão estruturada (System One)**. Jeva e VideoJev estabelecem requisitos arquiteturais — *null-aware, grounded, compositional, verifiable* — que endereçam a latência e a confiabilidade necessárias para controle em malha fechada e interação com vídeo em tempo real. GroundingPI complementa essa direção ao resolver *grounding* físico preciso (objeto + localização) com velocidade para robótica e VLA/WAMs. Em paralelo, o estudo **Thinking Inertia** expõe risco oculto: modos "no-thinking" não eliminam computação latente, impactando custo/latência mesmo quando desativados — reforçando a necessidade de *decision models* com comportamento determinístico e mensurável.

No ecossistema de **modelos frontier**, a liderança do Claude Opus 5.5 e a entrada de **Gemini 4 Argon** (1M ctx, reasoning profundo) e **Muse Wonder** (multimodal nativo, 1M ctx) no top 10 sinalizam convergência para *context windows massivos + raciocínio nativo + modalidades mistas* como padrão para agentes autônomos multi-passo. O **HydraFusion Max** no Copilot operacionaliza isso via routing inteligente de modelos, validado pela discussão comunitária no Reddit.

Na **camada de infraestrutura e segurança para agentes**, três vetores se destacam: (1) **MCP hardening** — SDK TypeScript 1.32.0 impõe *same-origin redirect policy*; Copilot CLI 1.0.92+ persiste OAuth; Microsoft Foundry adiciona *origin pinning*; (2) **Supply-chain integrity** — LiteLLM exige verificação **cosign** de imagens Docker (hash de commit imutável); GitHub Actions *workflow lockfiles* entram em preview para travar dependências; (3) **Governança enterprise** — Secret scanning bloqueia chaves Anthropic por padrão; GitHub Apps reduzem permissões; settings gerenciados do Copilot tornam-se obrigatórios no *startup*. Ferramentas de desenvolvimento (Claude Code, Copilot CLI, Cline, Gemini CLI, LangGraph) evoluem para **observabilidade (OTel cache tokens, virtualText, usage_update), controle de sessão (compactação ociosa, disable file mentions, continue-once), UX de compartilhamento (/share, artifacts) e plugins in-process** — reduzindo superfície de ataque e dependências de runtime.

## Fontes e Referências

1. [Jeva: System One Models from First Principles](https://huggingface.co/papers/2610.18773) — HF Daily Papers
2. [Artificial Analysis: Muse Wonder Full, Muse Wonder entram no top 10 do Índice de Inteligência](https://artificialanalysis.ai/models#intelligence#2026-10-12) — Artificial Analysis
3. [Agent-Reflex: Teaching Language Agents to Act Reflectively](https://huggingface.co/papers/2610.17953) — HF Daily Papers
4. [VideoJev: System One Model for Video Understanding and Interaction](https://huggingface.co/papers/2610.18615) — HF Daily Papers
5. [GroundingPI: A Grounding Foundation Model towards Physical Intelligence with Visual Primitives](https://huggingface.co/papers/2609.39601) — HF Daily Papers
6. [Thinking Inertia: LLMs Keep Thinking When Told Not To](https://huggingface.co/papers/2610.11765) — HF Daily Papers
7. [AgentSWE: Can Coding Agents Build the Agent You Actually Want?](https://huggingface.co/papers/2610.13361) — HF Daily Papers
8. [python-1.22.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.22.0) — Microsoft Agent Framework Releases
9. [@ai-sdk/typesafe-ai@3.0.19](https://github.com/vercel/ai/releases/tag/%40ai-sdk%2Ftypesafe-ai%403.0.19) — Vercel AI SDK Releases
10. [@ai-sdk/workflow@2.0.73](https://github.com/vercel/ai/releases/tag/%40ai-sdk%2Fworkflow%402.0.73) — Vercel AI SDK Releases
11. [v0.24.0](https://github.com/openai/openai-agents-python/releases/tag/v0.24.0) — OpenAI Agents SDK Releases
12. [1.0.99-0](https://github.com/github/copilot-cli/releases/tag/v1.0.99-0) — Copilot CLI Releases
13. [dotnet-1.25.0](https://github.com/microsoft/agent-framework/releases/tag/dotnet-1.25.0) — Microsoft Agent Framework Releases
14. [1.0.98](https://github.com/github/copilot-cli/releases/tag/v1.0.98) — Copilot CLI Releases
15. [v2.1.300](https://github.com/anthropics/claude-code/releases/tag/v2.1.300) — Claude Code Releases
16. [HydraFusion updates and new Max option](https://github.blog/changelog/2026-10-14-hydrafusion-updates-and-new-max-option) — GitHub Changelog
17. [langgraph-cli==0.4.35](https://github.com/langchain-ai/langgraph/releases/tag/cli%3D%3D0.4.35) — LangGraph Releases
18. [v1.105.1](https://github.com/BerriAI/litellm/releases/tag/v1.105.1) — LiteLLM Releases
19. [GitHub Actions workflow lockfiles in public preview](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview) — GitHub Changelog
20. [v2.1.299](https://github.com/anthropics/claude-code/releases/tag/v2.1.299) — Claude Code Releases
21. [GitHub App improvements for least privilege and management](https://github.blog/changelog/2026-10-13-github-app-improvements-for-least-privilege-and-management) — GitHub Changelog
22. [v0.40.4](https://github.com/ollama/ollama/releases/tag/v0.40.4) — Ollama Releases
23. [Release v0.64.0](https://github.com/google-gemini/gemini-cli/releases/tag/v0.64.0) — Gemini CLI Releases
24. [1.0.97](https://github.com/github/copilot-cli/releases/tag/v1.0.97) — Copilot CLI Releases
25. [Secret scanning blocks Anthropic keys by default, adds Salesforce](https://github.blog/changelog/2026-10-13-secret-scanning-blocks-anthropic-keys-by-default-adds-salesforce) — GitHub Changelog
26. [Enterprise managed settings enforcement updates](https://github.blog/changelog/2026-10-13-enterprise-managed-settings-enforcement-updates) — GitHub Changelog
27. [Google: Gemini 4 Argon](https://openrouter.ai/google/gemini-4-argon) — OpenRouter: New Models
28. [langgraph-checkpoint-postgres==3.1.3](https://github.com/langchain-ai/langgraph/releases/tag/checkpointpostgres%3D%3D3.1.3) — LangGraph Releases
29. [langgraph==1.2.15](https://github.com/langchain-ai/langgraph/releases/tag/1.2.15) — LangGraph Releases
30. [langgraph-checkpoint-sqlite==3.1.2](https://github.com/langchain-ai/langgraph/releases/tag/checkpointsqlite%3D%3D3.1.2) — LangGraph Releases
31. [1.0.96](https://github.com/github/copilot-cli/releases/tag/v1.0.96) — Copilot CLI Releases
32. [v4.1.24](https://github.com/cline/cline/releases/tag/v4.1.24) — Cline Releases
33. [v1.104.3](https://github.com/BerriAI/litellm/releases/tag/v1.104.3) — LiteLLM Releases
34. [v1.105.0](https://github.com/BerriAI/litellm/releases/tag/v1.105.0) — LiteLLM Releases
35. [Sadly migrating to opus](https://www.reddit.com/r/codex/comments/1x5dd8g/sadly_migrating_to_opus/) — Reddit r/Codex
36. [My dot has been really helpful](https://www.reddit.com/r/codex/comments/1x5gaik/my_dot_has_been_really_helpful/) — Reddit r/Codex
37. [Sharing some Dot tricks I was using recently](https://www.reddit.com/r/codex/comments/1x5kr1w/sharing_some_dot_tricks_i_was_using_recently/) — Reddit r/Codex
38. [Selected model is at capacity. Please try a different model.](https://www.reddit.com/r/codex/comments/1x5lz67/selected_model_is_at_capacity_please_try_a/) — Reddit r/Codex
39. [SDK v0.0.93](https://github.com/cline/cline/releases/tag/sdk%2Fsdk%2Fv0.0.93) — Cline Releases
40. [CLI v3.0.71](https://github.com/cline/cline/releases/tag/cli-v3.0.71) — Cline Releases
41. [Meta: Muse Wonder](https://openrouter.ai/meta/muse-wonder) — OpenRouter: New Models
42. [what is your honest opinion on this GH Copilot model routing with Hydrafusion](https://www.reddit.com/r/GithubCopilot/comments/1x6dl94/what_is_your_honest_opinion_on_this_gh_copilot/#community-signals) — Reddit r/GithubCopilot
43. [We've reached the point where people with practically zero coding experience are shipping password managers to the public](https://www.reddit.com/r/ClaudeCode/comments/1x68om1/weve_reached_the_point_where_people_with/#community-signals) — Reddit r/ClaudeCode
44. [Max subscription but only Pro usage](https://www.reddit.com/r/ClaudeCode/comments/1x62sro/max_subscription_but_only_pro_usage/#community-signals) — Reddit r/ClaudeCode
45. [Turning a crazy idea from 1967 into a Claude Code mod: I now read 83% fewer words from replies](https://www.reddit.com/r/ClaudeCode/comments/1x688sx/turning_a_crazy_idea_from_1967_into_a_claude_code/#community-signals) — Reddit r/ClaudeCode
46. [From 2,500 requests to 24: Rebuilding star history without the stargazers](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/) — GitHub Blog

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-15.*
