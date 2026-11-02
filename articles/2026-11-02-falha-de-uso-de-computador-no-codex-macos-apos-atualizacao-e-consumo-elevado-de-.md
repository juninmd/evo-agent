---
layout: article
title: "Falha de uso de computador no Codex macOS após atualização e consumo elevado de tokens no pi agent"
date: "2026-11-02"
tags: ["reddit", "v2ex-tech", "google-deepmind", "codex", "openai", "claudecode", "copilot", "v2ex", "chinese"]
summary: "Relato de regressão do Codex na versão 26.1027.61615 desativa prompts de permissão no macOS; usuário do V2EX compara pi agent com Codex e registra consumo de pelo menos 350 dólares por dia contra até 150 dólares no Codex."
reading_time: 7
---

{% raw %}
# Falha de uso de computador no Codex macOS após atualização e consumo elevado de tokens no pi agent

**Período analisado:** 01/11/2026 a 02/11/2026 · 5 pautas · 1 fonte primária · 3 sinais da comunidade

## Em 30 segundos

- **Codex Computer Use perde permissões após atualização 26.1027.61615 no macOS** — Após atualizar para a versão 26.1027.61615, liberada em 1º de novembro de 2026, o Codex deixou de exibir prompts de permissão para uso do computador e não consegue abrir arquivos…
- **Usuário do V2EX registra consumo de 350 dólares por dia com pi agent versus até 150 dólares com Codex** — Após migrar fluxos de trabalho do Codex para o pi agent e configurar plugins incluindo code mode, sub agent e context mode, o usuário relatou execução mais lenta, chamadas…
- **Comunidade cria shaders de cursor para Ghostty no Claude Code** — Um post do Reddit em r/ClaudeCode descreve shaders customizados para Ghostty com 13 efeitos de cursor, incluindo raios que soltam faíscas por tecla, criptografia cibernética de…
- **TokenMasterX reduz envio de prompt e definições de ferramentas no Copilot CLI** — O Copilot CLI reenvia o prompt do sistema e todas as definições de ferramenta a cada chamada, com cerca de 13,5 mil tokens de entrada apenas na primeira chamada; o TokenMasterX…
- **DeepMind e governo britânico reduzem prazos de avaliação de planejamento com IA** — Google DeepMind e o governo do Reino Unido colaboram para diminuir o tempo de avaliação de decisões de planejamento usando inteligência artificial.

## Destaques

### Agentes e ferramentas de desenvolvimento

#### Codex Computer Use perde permissões após atualização 26.1027.61615 no macOS

Usuários do Codex enfrentam perda de funcionalidades de uso de computador após a atualização `26.1027.61615` no macOS, cessando prompts de permissão e impossibilitando a abertura de arquivos, apesar da funcionalidade de navegação no `chrome`.

A operação de engenharia que depende de automação local sofre risco de interrupção imediata, necessitando de revisão urgente da versão do ambiente de execução, visto que o relato é isolado e não confirmado por fontes oficiais.

*[Fonte: Issue with Codex Running Computer-Use on Mac OSX after update - No prompts for permissions/use anymore, for anything related to Computer Use](https://www.reddit.com/r/codex/comments/1xlpw43/issue_with_codex_running_computeruse_on_mac_osx/) · Reddit r/Codex · sinal da comunidade*

#### Usuário do V2EX registra consumo de 350 dólares por dia com pi agent versus até 150 dólares com Codex

Após configurar o pi agent com plugins code mode, sub agent e context mode e migrar o fluxo de trabalho, o usuário observou chamadas repetidas e menos eficientes, resultando em um consumo de token consideravelmente maior. O agente apresentou desempenho mais lento em tarefas semelhantes, com um número elevado de interações de ferramentas, consumindo recursos de inferência que superaram em muito o esperado para a complexidade da atividade.

A decisão de manter o agente passou a ser pautada pelo custo operacional imediato, pois o consumo diário de 350 dólares usando Astra, somado ao uso intensivo de subagent com 6.1sol, coloca em xeque a viabilidade econômica da substituição do Codex.

*[Fonte: pi agent 太费 token 了！](https://www.v2ex.com/t/1253745#reply16) · V2EX Tech*

#### Comunidade cria shaders de cursor para Ghostty no Claude Code

Um post do Reddit em r/ClaudeCode descreve shaders customizados para Ghostty com 13 efeitos de cursor, incluindo raios que soltam faíscas por tecla, criptografia cibernética de letras, cortes de glitch no cursor, thrusters de mecha no backspace e piscar neon após cada tecla.

A adoção de personalizações de terminal influencia a experiência do desenvolvedor com agentes CLI e pode afetar a percepção de usabilidade em ferramentas de codificação agentica.

*[Fonte: Made typing in Claude Code a lot more fun with Ghostty shaders](https://www.reddit.com/r/ClaudeCode/comments/1xkfvpr/made_typing_in_claude_code_a_lot_more_fun_with/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### TokenMasterX reduz envio de prompt e definições de ferramentas no Copilot CLI

Um relato no Reddit aponta que o Copilot CLI reenvia o prompt do sistema e todas as definições de ferramentas a cada chamada, consumindo cerca de 13,5 mil tokens de entrada já na primeira interação. O projeto comunitário TokenMasterX propõe mitigar esse desperdício com roteamento dinâmico de ferramentas opcional, navegação de grafos de chamadas limitada a uma resposta única e corte de saídas longas para preservar o cache de prompt do provedor.

A abordagem reduz o custo de inferência e melhora a eficiência de contexto para quem opera o CLI em pipelines automatizados ou sessões longas, mas depende de heurísticas que podem omitir ferramentas necessárias se o roteamento falhar.

*[Fonte: Tool routing, graph navigation and cache optimization for Copilot CLI: up to half the tokens, built with proof-driven development](https://www.reddit.com/r/GithubCopilot/comments/1xln866/tool_routing_graph_navigation_and_cache/) · Reddit r/GithubCopilot · sinal da comunidade*

### Engenharia e ecossistema

#### DeepMind e governo britânico reduzem prazos de avaliação de planejamento com IA

O Google DeepMind colabora com o governo britânico para reduzir o tempo de avaliação de decisões de planejamento usando inteligência artificial. A parceria oficial registra o objetivo de acelerar processos públicos de planejamento por meio de agentes de IA.

A adoção de agentes de IA em fluxos de planejamento público depende de evidências de redução de tempo de avaliação e de governança de decisões automatizadas. A evidência disponível não especifica quais agentes serão usados, como a governança será estruturada ou se os ganhos de tempo serão suficientes para justificar a mudança operacional nas prefeituras.

*[Fonte: Speeding up planning decisions with AI](https://deepmind.google/blog/speeding-up-planning-decisions-with-ai/) · Google DeepMind · fonte primária*

## Leitura do conjunto

O regresso do Codex Computer Use na versão 26.1027.61615 remove prompts de permissão no macOS e bloqueia operações básicas, forçando equipes a revisar versões de runtime antes de implantar automações locais. Em paralelo, relato do V2EX mostra que a substituição do Codex pelo pi agent elevou o consumo diário de 150 dólares para 350 dólares, com chamadas repetidas e falta de clareza sobre subagentes, o que coloca o orçamento de inferência como critério central na escolha de agentes. Esses sinais comunitários se somam à redução de prazos de planejamento com DeepMind e ao esforço de otimização de tokens no Copilot CLI, ilustrando que ganhos de automação dependem tanto de estabilidade de runtime quanto de controle de custo de contexto.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Gemini 4 Carbon</th><td role="cell" class="creator">Google</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">59.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:98.3%"></span></span><span class="value">58.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:95.8%"></span></span><span class="value">56.9</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">GPT-6.1 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.8%"></span></span><span class="value">54.5</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">Claude Sonnet 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.2%"></span></span><span class="value">54.2</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">GPT-6.1 Terra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:85.9%"></span></span><span class="value">51.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">Muse Wonder Full</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:83.7%"></span></span><span class="value">49.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:82.5%"></span></span><span class="value">49.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">Kimi K3.1 Pro</th><td role="cell" class="creator">Kimi</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:77.4%"></span></span><span class="value">46.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">Muse Wonder</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:72.9%"></span></span><span class="value">43.3</span></div></td></tr></tbody>
</table>
<figcaption><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [Issue with Codex Running Computer-Use on Mac OSX after update - No prompts for permissions/use anymore, for anything related to Computer Use](https://www.reddit.com/r/codex/comments/1xlpw43/issue_with_codex_running_computeruse_on_mac_osx/) — Reddit r/Codex
2. [pi agent 太费 token 了！](https://www.v2ex.com/t/1253745#reply16) — V2EX Tech
3. [Made typing in Claude Code a lot more fun with Ghostty shaders](https://www.reddit.com/r/ClaudeCode/comments/1xkfvpr/made_typing_in_claude_code_a_lot_more_fun_with/#community-signals) — Reddit r/ClaudeCode
4. [Tool routing, graph navigation and cache optimization for Copilot CLI: up to half the tokens, built with proof-driven development](https://www.reddit.com/r/GithubCopilot/comments/1xln866/tool_routing_graph_navigation_and_cache/) — Reddit r/GithubCopilot
5. [Speeding up planning decisions with AI](https://deepmind.google/blog/speeding-up-planning-decisions-with-ai/) — Google DeepMind

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-11-02.*
