---
layout: article
title: "Liquid AI lança LFM3 para agentes locais e GitHub Copilot implementa autenticação"
date: "2026-10-28"
tags: ["ollama", "github", "claude-code", "reddit", "hf-daily-papers", "local-ai", "copilot", "changelog", "anthropic", "codex"]
summary: "Novas arquiteturas de modelos compactos visam reduzir a dependência de nuvem para agentes de ferramenta. A integração de autenticação em apps do Copilot e relatos de orquestração multi-agente no Codex redefinem a governança de infraestrutura."
reading_time: 9
---

{% raw %}
# Liquid AI lança LFM3 para agentes locais e GitHub Copilot implementa autenticação

**Período analisado:** 27/10/2026 a 28/10/2026 · 8 pautas · 4 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Lançamento da família LFM3 da Liquid AI** — A Liquid AI disponibilizou a família de modelos LFM3 baseada em arquitetura tri-híbrida, incluindo o modelo de texto de 1.7B com janela de 256K tokens, versões VL, Audio e Omni…
- **Autenticação servidor-a-servidor no GitHub Copilot** — O GitHub Copilot agora suporta autenticação servidor-a-servidor para GitHub Apps instalados em organizações, permitindo que serviços e agentes via SDK façam requisições.
- **Atualização v2.1.312 do Claude Code** — A versão 2.1.312 adicionou o claim oidc.user_id_claim ao gateway de apps para identificação via Microsoft Entra ID e corrigiu a sobrescrita de arquivos CLAUDE.md volumosos.
- **Intercomunicação entre chats do Codex** — Usuários relatam a capacidade de chats do Codex localizarem e enviarem mensagens uns aos outros, permitindo que agentes coordenem versões de aplicações entre Windows e Mac via Git.
- **Hand-off de tarefas entre agentes no Moonfold** — Foi desenvolvido o Moonfold, um workspace open-source que monitora limites de uso de CLIs como Codex e Claude Code, transferindo a tarefa para outro agente via resumo de estado…
- **Ausência de hosts de agentes customizados no Copilot CLI** — Usuários do r/GithubCopilot reportam que, ao contrário do VS Code, o Copilot CLI não suporta a conexão a um agent host customizado fora de recursos experimentais.
- **Dilema de roteamento multi-LLM no Claude Code** — Desenvolvedores discutem a viabilidade de rotear tarefas simples para Gemini ou DeepSeek para reduzir custos, contrapondo isso ao esforço de manter múltiplas chaves e…
- **Benchmark TraceTrial para harnesses de agentes** — Foi introduzido o TraceTrial-Bench, focado na confiabilidade de harnesses de agentes em sete componentes: contexto, execução, governança, ciclo de vida, observabilidade, entre…

## Destaques

### Infraestrutura e eficiência

#### Lançamento da família LFM3 da Liquid AI

Liquid AI lançou a família de modelos LFM3, baseada em arquitetura tri‑híbrida, com um modelo de texto de 1,7 bilhões de parâmetros e janela de contexto de 256 k tokens. A linha inclui versões VL, Audio e Omni, além dos modelos de decisão d1 de 2 bilhões de parâmetros, todos disponíveis via Ollama.

A migração para execução local de lógica de interceptação e tool calling reduz significativamente a latência e o custo de inferência em nuvem, embora a necessidade de recursos de hardware local permaneça, e a compatibilidade com fluxos de trabalho existentes ainda dependa da adaptação específica de cada aplicação.

*[Fonte: v0.40.12](https://github.com/ollama/ollama/releases/tag/v0.40.12) · Ollama Releases · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Autenticação servidor-a-servidor no GitHub Copilot

O GitHub Copilot agora permite autenticação servidor-a-servidor para GitHub Apps instalados em organizações, possibilitando que serviços e agentes construídos com o SDK façam requisições usando credenciais de aplicação em vez de tokens de usuário. Esta mudança está disponível em pré‑visualização pública e vem acompanhada da documentação oficial que detalha o suporte ao fluxo de autenticação baseado em JWT do próprio GitHub.

Para equipes que gerenciam agentes corporativos ou infraestruturas automatizadas, a consequência prática é a eliminação da necessidade de gerir tokens de usuário individualizados. Isso simplifica o ciclo de vida de segurança, reduz a superfície de ataque e elimina vulnerabilidades associadas a tokens de longa duração.

*[Fonte: GitHub Copilot supports server-to-server authentication](https://github.blog/changelog/2026-10-27-github-copilot-supports-server-to-server-authentication) · GitHub Changelog · fonte primária*

#### Atualização v2.1.312 do Claude Code

A versão 2.1.312 do Claude Code acrescenta \`oidc.user_id_claim\` ao gateway de aplicações, permitindo identificar usuários através de um claim do token id, como \`oid\` do Microsoft Entra ID. Também corrige a sobrescrita de arquivos \`CLAUDE.md\) volumosos, assegura o recebimento de configurações gerenciadas e políticas de organização após login via extensão do VS Code, e adiciona a funcionalidade de enviar uma mensagem em tela cheia ao clicar no indício “to send now”.

Para quem utiliza a extensão do VS Code ou possui um gateway em produção, a adoção dessa atualização elimina o risco de perda de dados em arquivos de configuração críticos e possibilita a integração de identidade corporativa com Azure AD sem intervenção manual no código.

*[Fonte: v2.1.312](https://github.com/anthropics/claude-code/releases/tag/v2.1.312) · Claude Code Releases · fonte primária*

#### Intercomunicação entre chats do Codex

Relatos de usuários indicam que chats do Codex conseguem localizar e enviar mensagens entre si. Um usuário descreveu agentes coordenando o desenvolvimento de versões para Windows e Mac, utilizando ramificações de projeto no `git` para trocar contratos de API e capturas de tela de interface.

Essa operação de enxame altera a gestão de projetos para desenvolvedores ao automatizar a sincronia técnica sem intervenção humana constante. Como a evidência baseia-se em um relato isolado da comunidade, a estabilidade e a disponibilidade geral dessa função permanecem incertas.

*[Fonte: Did you know Codex chats can find and message one another?](https://www.reddit.com/r/codex/comments/1xhhiwe/did_you_know_codex_chats_can_find_and_message_one/) · Reddit r/Codex · sinal da comunidade*

#### Hand-off de tarefas entre agentes no Moonfold

Moonfold é um workspace open-source que integra CLIs como Codex e Claude Code. Quando um agente atinge seu limite de uso, o Moonfold interrompe a interação, gera uma síntese curta do estado da tarefa (planejamento, arquivos alterados, status do git) e encaminha esse resumo para outro agente, permitindo que a execução continue independentemente da quota esgotada.

Para programadores que dependem de chamadas de API, isso reduz o tempo de espera por horas e evita a perda manual de contexto. A arquitetura permanece semelhante ao uso tradicional de CLIs, mas adiciona um layer de monitoramento de quota e de transição automática de agentes, exigindo apenas a configuração das credenciais do logon.

*[Fonte: I built an open-source app that hands a coding task to another agent when one hits its usage limit](https://www.reddit.com/r/codex/comments/1xhikip/i_built_an_opensource_app_that_hands_a_coding/) · Reddit r/Codex · sinal da comunidade*

#### Ausência de hosts de agentes customizados no Copilot CLI

Usuários do r/GithubCopilot relataram que, ao contrário do VS Code, o Copilot CLI não permite conexão a um *agent host* customizado fora de recursos experimentais. O autor do post afirma que, enquanto a extensão do VS Code funciona com um *agent host* configurado, a CLI não suporta essa funcionalidade no momento, sem planos confirmados de inclusão.

Para quem executa o Copilot CLI em seu ambiente local, essa limitação impõe a necessidade de manter a execução do agente na infraestrutura própria da Microsoft, limitando a portabilidade das sessões entre a IDE e o terminal.

*[Fonte: Support for custom agent hosts](https://www.reddit.com/r/GithubCopilot/comments/1xhk8s6/support_for_custom_agent_hosts/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

#### Dilema de roteamento multi-LLM no Claude Code

O relato sugere que, apesar do bom desempenho e preço dos modelos Claude, a ideia de rotear tarefas simples para Gemini ou DeepSeek ainda não vale a complicação de manter várias chaves e configurações em toda a equipe de desenvolvimento. O usuário demonstra que a prática de usar um roteador multi‑LLM parece custar mais em termos de esforço operacional que de custo de chamadas de API.

Para quem adota um proxy ou plugin de roteamento, a consequência prática é a necessidade de rotinas de manutenção de ambientes simulando credenciais segregadas, além da sobrecarga administrativa de atualizar e monitorar cada serviço.

*[Fonte: Claude-only vs multi-LLM setup? Recommended tools for each setup?](https://www.reddit.com/r/ClaudeCode/comments/1xhaqrh/claudeonly_vs_multillm_setup_recommended_tools/) · Reddit r/ClaudeCode · sinal da comunidade*

#### Benchmark TraceTrial para harnesses de agentes

O TraceTrial-Bench foi introduzido para avaliar a confiabilidade de harnesses de agentes de inteligência artificial. O framework organiza a análise em sete componentes que abrangem contexto, execução, governança, ciclo de vida e observabilidade.

Arquitetos de sistemas de agentes agora podem deslocar a métrica de sucesso da capacidade do modelo para a estabilidade da infraestrutura de suporte. Isso reduz riscos operacionais ao isolar falhas de execução de limitações do modelo, embora a evidência não detalhe a pontuação exata para cada componente.

*[Fonte: Trial by Trace: Benchmarking AI Agent Harnesses for Reliability and Failure Attribution](https://huggingface.co/papers/2610.32285) · HF Daily Papers · fonte primária*

## Leitura do conjunto

A indústria migra para ecossistemas de agentes autônomos que coordenam tarefas entre sistemas operacionais e transferem estados para contornar limites de cotas. O lançamento da família LFM3 e a integração do `oidc.user_id_claim` no Claude Code reforçam a busca por modelos multimodais eficientes e identidades corporativas rigorosas. O foco agora recai sobre a confiabilidade da governança e observabilidade, medida por benchmarks como o TraceTrial.

Persiste um conflito entre a automação de fluxos e a fragmentação das ferramentas. Enquanto o GitHub Copilot expande a autenticação servidor-a-servidor, a ausência de hospedeiros de agentes customizados no Copilot CLI limita a flexibilidade operacional. Desenvolvedores ainda hesitam entre a redução de custos via roteamento para Gemini ou DeepSeek e a complexidade de gerir múltiplas chaves de API.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">58.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:97.4%"></span></span><span class="value">56.9</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">GPT-6.1 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:93.3%"></span></span><span class="value">54.5</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">Claude Sonnet 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:92.8%"></span></span><span class="value">54.2</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">GPT-6.1 Terra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:87.3%"></span></span><span class="value">51.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">Gemini 4 Argon</th><td role="cell" class="creator">Google</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:86.3%"></span></span><span class="value">50.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">Muse Wonder Full</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:85.1%"></span></span><span class="value">49.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:83.9%"></span></span><span class="value">49.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">Kimi K3.1 Pro</th><td role="cell" class="creator">Kimi</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:78.8%"></span></span><span class="value">46.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">Muse Wonder</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:74.1%"></span></span><span class="value">43.3</span></div></td></tr></tbody>
</table>
<figcaption><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [v0.40.12](https://github.com/ollama/ollama/releases/tag/v0.40.12) — Ollama Releases
2. [GitHub Copilot supports server-to-server authentication](https://github.blog/changelog/2026-10-27-github-copilot-supports-server-to-server-authentication) — GitHub Changelog
3. [v2.1.312](https://github.com/anthropics/claude-code/releases/tag/v2.1.312) — Claude Code Releases
4. [Did you know Codex chats can find and message one another?](https://www.reddit.com/r/codex/comments/1xhhiwe/did_you_know_codex_chats_can_find_and_message_one/) — Reddit r/Codex
5. [I built an open-source app that hands a coding task to another agent when one hits its usage limit](https://www.reddit.com/r/codex/comments/1xhikip/i_built_an_opensource_app_that_hands_a_coding/) — Reddit r/Codex
6. [Support for custom agent hosts](https://www.reddit.com/r/GithubCopilot/comments/1xhk8s6/support_for_custom_agent_hosts/#community-signals) — Reddit r/GithubCopilot
7. [Claude-only vs multi-LLM setup? Recommended tools for each setup?](https://www.reddit.com/r/ClaudeCode/comments/1xhaqrh/claudeonly_vs_multillm_setup_recommended_tools/) — Reddit r/ClaudeCode
8. [Trial by Trace: Benchmarking AI Agent Harnesses for Reliability and Failure Attribution](https://huggingface.co/papers/2610.32285) — HF Daily Papers

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-28.*
