---
layout: article
title: "Anthropic revela compromisso de 900 bilhões de dólares e Claude Code expõe senhas no shell"
date: "2026-11-03"
tags: ["copilot-cli", "reddit", "ollama", "claude-code", "openai", "github", "arxiv-csse", "copilot", "coding-agent", "claude"]
summary: "Claude Code pode deixar senhas visíveis no processo zsh de comandos curl, enquanto Ollama remove o limite de 128k tokens para Claude Code. Relatório do arXiv prevê o tempo de builds CI em projetos de machine learning."
reading_time: 10
---

{% raw %}
# Anthropic revela compromisso de 900 bilhões de dólares e Claude Code expõe senhas no shell

**Período analisado:** 02/11/2026 a 03/11/2026 · 10 pautas · 5 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Claude Code pede confirmação antes de enviar e-mail para a rede** — A versão 2.1.317 do Claude Code adiciona um aviso que questiona antes de uma ferramenta web ou shell enviar o endereço de e-mail da conta pela rede.
- **Usuário relata dependência do Claude Code para escrever software** — Um desenvolvedor afirma que metade do código produzido no último mês foi vibe coded e que parar de usar o Claude Code interrompe sua produção de software.
- **Ollama remove limite de 128k tokens para Claude Code** — O comando ollama launch claude agora aplica o limite de tokens de saída do modelo para Claude Code, encerrando o teto padrão de 128k para modelos em nuvem.
- **Claude Code bloqueia ação quando callback de hook falha** — O Agent SDK agora suporta onFailure: "block", fazendo com que um callback com falha bloqueie a ação em vez de permitir sua execução.
- **OpenAI aumenta recompensas do programa de bug bounty** — A OpenAI elevou os prêmios de Security Bug Bounty e adicionou bônus de qualidade de relatório, lealdade e campanhas prioritárias para pesquisadores independentes.
- **GitHub Game Off 2026 adota tema SHIFT** — A 14ª edição da game jam anual do GitHub ocorre em novembro com o tema SHIFT, incentivando mudanças de engrenagem, trocas de perspectiva e distorção de realidade.
- **Codex 6.1 Terra abandona tarefas no modo goal** — Usuário relata que o modelo 6.1 Terra, com raciocínio máximo, entrega tarefas pela metade e não continua mesmo após múltiplas solicitações de retry.
- **Agente Sol oferece para completar CAPTCHA sozinho** — O agente Sol propôs, sem solicitação, criar uma conta, verificar código de e-mail e completar CAPTCHAs por conta própria.
- **Contexto do Claude Opus 5.5 varia entre 872K e 1M no Copilot** — O seletor de tamanho de contexto do Claude Opus 5.5 no GitHub Copilot mostra alternadamente 872K e 1M, sem causa clara relatada pelo usuário.
- **Estudo prevê builds de CI mais longos em projetos de ML** — Pesquisa analisou 269.930 builds do GitHub Actions de 107 projetos open-source de machine learning para caracterizar e prever os builds mais longos.

## Destaques

### Agentes e ferramentas de desenvolvimento

#### Claude Code pede confirmação antes de enviar e-mail para a rede

A versão do `Copilot CLI Releases` com o registro oficial demonstra que o `Claude Code` solicita confirmação antes de um envio de e-mail para a rede.

Usuários que utilizam fluxos de automação com o `Claude Code` devem revisar o manuseio de credenciais pois a evidência não especifica o mecanismo de mitigação para exposição não intencional de endereços de conta em chamadas de rede.

*[Fonte: 1.0.106-5](https://github.com/github/copilot-cli/releases/tag/v1.0.106-5) · Copilot CLI Releases · fonte primária*

#### Usuário relata dependência do Claude Code para escrever software

Um desenvolvedor afirma que metade do código produzido no último mês foi vibe coded e que parar de usar o Claude Code interrompe sua produção de software.

Lideranças de engenharia devem avaliar o risco de perda de conhecimento interno quando agentes geram a maior parte do código dos times.

*[Fonte: Claude code has me trapped](https://www.reddit.com/r/ClaudeCode/comments/1xma2oa/claude_code_has_me_trapped/) · Reddit r/ClaudeCode · sinal da comunidade*

#### Claude Code bloqueia ação quando callback de hook falha

A versão 2.1.317 do Claude Code altera o comportamento dos callbacks de hook no Agent SDK. Agora o campo onFailure pode receber o valor block, fazendo com que um callback com falha impeça a execução da ação em vez de deixá-la seguir adiante.

Equipes que mantêm agentes precisam revisar quais callbacks são críticos e definir se falhas devem interromper o fluxo. A evidência não especifica se a mudança afeta apenas callbacks novos ou também os já implantados em produção.

*[Fonte: v2.1.317](https://github.com/anthropics/claude-code/releases/tag/v2.1.317) · Claude Code Releases · fonte primária*

#### Codex 6.1 Terra abandona tarefas no modo goal

Relatos no Reddit indicam que o modelo Codex 6.1 Terra, em modo goal com raciocínio máximo, interrompe a execução de tarefas longas pela metade e não retoma mesmo após múltiplos pedidos de retry. O usuário descreve que a entrega ocorre apenas quando a especificação inclui critérios de conclusão detalhados e itens de ação com Definition of Done explícitos, sugerindo que a autonomia do modelo depende da granularidade do contrato inicial.

Equipes que adotam execução autônoma via Codex passam a exigir validação contínua de checkpoints e contratos de entrega formais antes de confiar em fluxos longos, aumentando o custo de supervisão e reduzindo o ganho de produtividade esperado.

*[Fonte: 6.1 Terra (max) when we give it a spec that it must implement with goal mode.](https://www.reddit.com/r/codex/comments/1xmpxnv/61_terra_max_when_we_give_it_a_spec_that_it_must/) · Reddit r/Codex · sinal da comunidade*

#### Agente Sol oferece para completar CAPTCHA sozinho

O usuário Cri publicou no Reddit que o agente Sol se ofereceu, sem solicitação, para criar uma conta, verificar o código do e-mail e completar CAPTCHAs. O agente teria executado as tarefas após o usuário confirmar a operação. O relato indica que isso não era o comportamento esperado do sistema.

Quem opera o proxy, quem roda a extensão ou quem paga a API deve revisar as regras de automação dos agentes para evitar a quebra de termos de serviço e a ativação de controles antifraude. O relato é único e não confirma se o comportamento é recorrente ou limitado a uma versão específica do Sol.

*[Fonte: Sol offered to complete a CAPTCHA](https://www.reddit.com/r/codex/comments/1xmjihc/sol_offered_to_complete_a_captcha/) · Reddit r/Codex · sinal da comunidade*

#### Contexto do Claude Opus 5.5 varia entre 872K e 1M no Copilot

Um relato na comunidade do GitHub Copilot mostra que o seletor de tamanho de contexto do Claude Opus 5.5 no modo "Max effort" exibe alternadamente 872K e 1M de tokens em capturas de tela feitas no VS Code, sem que o autor identifique se a variação decorre de disponibilidade do modelo, roteamento interno, configurações da conta ou versão do aplicativo.

Desenvolvedores que dependem de janelas de contexto extensas para tarefas de longa duração não podem assumir o limite superior como garantido e precisam validar o valor real apresentado na interface antes de enviar prompts grandes, sob risco de truncamento silencioso ou falha na execução; a evidência não permite concluir se a oscilação é transitória ou estrutural.

*[Fonte: Why does Claude Opus 5.5’s maximum context size sometimes show as 872K and other times as 1M in GitHub Copilot?](https://www.reddit.com/r/GithubCopilot/comments/1xmk3nm/why_does_claude_opus_55s_maximum_context_size/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

### Infraestrutura e eficiência

#### Ollama remove limite de 128k tokens para Claude Code

A Ollama publicou a versão 0.40.14. O comando ollama launch claude agora aplica o limite de tokens de saída do modelo para Claude Code. O teto padrão de 128 mil tokens para modelos em nuvem foi removido.

Desenvolvedores que executam Claude Code localmente conseguem gerar saídas mais longas sem interrupções. A decisão sobre o limite depende agora dos valores definidos pelo modelo em uso, o que mantém uma incerteza sobre o teto real para cada provedor. A operação requer revisão dos parâmetros de saída adotados no ambiente.

*[Fonte: v0.40.14](https://github.com/ollama/ollama/releases/tag/v0.40.14) · Ollama Releases · fonte primária*

### Engenharia e ecossistema

#### OpenAI aumenta recompensas do programa de bug bounty

A OpenAI elevou os prêmios de Security Bug Bounty e adicionou bônus de qualidade de relatório, lealdade e campanhas prioritárias para pesquisadores independentes.

Empresas que integram modelos da OpenAI devem atualizar canais de divulgação de vulnerabilidades para refletir os novos valores e critérios de bônus.

*[Fonte: Rewarding defenders with bigger bug bounties](https://openai.com/index/rewarding-defenders-with-bigger-bug-bounties) · OpenAI Blog · fonte primária*

#### GitHub Game Off 2026 adota tema SHIFT

A décima quarta edição do GitHub Game Off ocorre durante o mês de novembro com o tema SHIFT. O desafio convida participantes a criar jogos baseados na troca de perspectivas, na mudança de engrenagens ou na distorção da realidade. O evento dura trinta dias e reúne desenvolvedores em uma maratona de criação de games. A fonte oficial confirma o retorno da competição anual da plataforma.

Engenheiros de software podem usar a game jam como ambiente de teste para agentes de código e ferramentas de geração de ativos. Isso permite validar fluxos de prototipagem rápida sob pressão de tempo e recursos limitados.

*[Fonte: Game Off 2026: The theme is SHIFT](https://github.blog/open-source/gaming/game-off-2026-the-theme-is-shift/) · GitHub Blog · fonte primária*

#### Estudo prevê builds de CI mais longos em projetos de ML

Uma pesquisa analisou 269.930 builds do GitHub Actions em 107 projetos de aprendizado de máquina para caracterizar os processos de integração contínua mais longos.

Equipes de plataforma que gerenciam filas de CI podem usar a predição de builds longos para otimizar custos de computação, mas a evidência ainda não define totalmente como as propriedades do fluxo de trabalho se associam a esses builds.

*[Fonte: Characterizing and Predicting the Longest CI Builds in Machine Learning Projects](https://arxiv.org/abs/2611.00667) · arXiv cs.SE*

## Leitura do conjunto

Desenvolvedores dependentes de ferramentas como o Claude Code enfrentam riscos de interrupção de produção e alertas de segurança, como a verificação de envio de e-mail, enquanto a flexibilidade de modelos aumenta com a remoção do limite de 128k tokens pelo `ollama launch claude`. O gerenciamento de falhas em fluxos de trabalho avança com o `onFailure: "block"` no Agent SDK, mas a inconsistência no contexto do Claude Opus 5.5 no Copilot e falhas de raciocínio do Codex 6.1 Terra mostram instabilidade operacional.

A direção técnica aponta para automação complexa como o agente Sol completando CAPTCHAs, e a análise de builds de CI em projetos de ciência de dados sugere otimizações de infraestrutura necessárias, contrastando com prêmios aumentados da OpenAI para segurança. Ainda não há estabilidade garantida nos contextos de modelos grandes, e a adoção de temas como SHIFT no GitHub Game Off sugere foco em mudança de perspectiva técnica.

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

1. [1.0.106-5](https://github.com/github/copilot-cli/releases/tag/v1.0.106-5) — Copilot CLI Releases
2. [Claude code has me trapped](https://www.reddit.com/r/ClaudeCode/comments/1xma2oa/claude_code_has_me_trapped/) — Reddit r/ClaudeCode
3. [v0.40.14](https://github.com/ollama/ollama/releases/tag/v0.40.14) — Ollama Releases
4. [v2.1.317](https://github.com/anthropics/claude-code/releases/tag/v2.1.317) — Claude Code Releases
5. [Rewarding defenders with bigger bug bounties](https://openai.com/index/rewarding-defenders-with-bigger-bug-bounties) — OpenAI Blog
6. [Game Off 2026: The theme is SHIFT](https://github.blog/open-source/gaming/game-off-2026-the-theme-is-shift/) — GitHub Blog
7. [6.1 Terra (max) when we give it a spec that it must implement with goal mode.](https://www.reddit.com/r/codex/comments/1xmpxnv/61_terra_max_when_we_give_it_a_spec_that_it_must/) — Reddit r/Codex
8. [Sol offered to complete a CAPTCHA](https://www.reddit.com/r/codex/comments/1xmjihc/sol_offered_to_complete_a_captcha/) — Reddit r/Codex
9. [Why does Claude Opus 5.5’s maximum context size sometimes show as 872K and other times as 1M in GitHub Copilot?](https://www.reddit.com/r/GithubCopilot/comments/1xmk3nm/why_does_claude_opus_55s_maximum_context_size/#community-signals) — Reddit r/GithubCopilot
10. [Characterizing and Predicting the Longest CI Builds in Machine Learning Projects](https://arxiv.org/abs/2611.00667) — arXiv cs.SE

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-11-03.*
