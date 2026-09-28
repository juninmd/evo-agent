---
layout: article
title: "Copilot CLI integra regras do Claude Code e GPT-6 Sol gera críticas de 'slop'"
date: "2026-09-28"
tags: ["copilot", "opencode", "reddit", "coding-agent", "post-signals", "codex", "claude", "coding"]
summary: "A versão 1.0.89-5 do Copilot CLI expande a compatibilidade com instruções personalizadas via .claude/rules. Usuários de Codex relatam regressões de qualidade e aumento de custos nos modelos GPT-6 Sol e Luna 5.6."
reading_time: 10
---

{% raw %}
# Copilot CLI integra regras do Claude Code e GPT-6 Sol gera críticas de 'slop'

**Período analisado:** 27/09/2026 a 28/09/2026 · 10 pautas · 2 fontes primárias · 8 sinais da comunidade

## Em 30 segundos

- **Copilot CLI 1.0.89-5** — A atualização adicionou suporte a arquivos de regras do Claude Code em .claude/rules como instruções personalizadas e corrigiu falhas de carregamento de extensões em configurações…
- **OpenCode v1.18.33** — A versão implementou redação de credenciais no output de configuração e ajustou os padrões de 'thinking' e opções de esforço para Gemini, alinhando-os aos controles de diferentes…
- **Feedback do GPT-6 Sol** — Assinantes do Codex relatam que o GPT-6 Sol apresenta sintomas similares ao GPT-5.6 Terra, incluindo preguiça, falhas no seguimento de instruções e entrega de código incompleto…
- **Inflação de custo no Luna 5.6** — Usuários reportaram que o custo de créditos por prompt no modelo Luna 5.6 saltou de uma média de 0.5-1.5 para 6-14, sem a instalação de novas ferramentas ou MCPs.
- **Monitoramento de quotas via QuotaBubble** — Foi desenvolvido um widget de desktop open source para rastreio em tempo real de requisições premium e uso de chat do GitHub Copilot para Windows, macOS e Linux.
- **Conflito de contexto no Copilot SDK** — Desenvolvedores relatam a incapacidade de desativar arquivos de contexto específicos do Claude, como o CLAUDE.md, quando utilizam o Copilot SDK / Agent Host.
- **Travamento de execução no terminal** — Usuários de MacBook com GitHub Copilot + reportaram que a ferramenta fica presa no estado 'Run in terminal', apesar de haver atividade visível via comando 'top bash'.
- **Busca por alternativas ao Copilot Pro** — Usuários relatam migração para ferramentas mais baratas devido ao aumento expressivo de preços do Copilot Pro, buscando modelos com performance igual ou superior ao Claude Sonnet…
- **Redução de limites no Codex** — O plano de US$ 100 do Codex removeu as promessas de uso 5x ou 20x superior ao plano Plus, alterando a descrição para 'Mais uso que o Plus' para abrir espaço para o plano Pro Max.
- **Over-refusal no Claude Opus 5.5** — Usuários reportam que o Claude Opus 5.5 bloqueia consultas básicas de endurecimento (hardening) de aplicações C/Rust por interpretá-las como violações de segurança, enquanto…

## Destaques

### Agentes e ferramentas de desenvolvimento

#### Copilot CLI 1.0.89-5

A atualização adicionou suporte a arquivos de regras do Claude Code em .claude/rules como instruções personalizadas e corrigiu falhas de carregamento de extensões em configurações gerenciadas por empresas.

Permite a unificação de prompts de sistema entre diferentes assistentes de código, reduzindo a fragmentação de regras de arquitetura no repositório.

*[Fonte: 1.0.89-5](https://github.com/github/copilot-cli/releases/tag/v1.0.89-5) · Copilot CLI Releases · fonte primária*

#### OpenCode v1.18.33

A versão implementou redação de credenciais no output de configuração e ajustou os padrões de 'thinking' e opções de esforço para Gemini, alinhando-os aos controles de diferentes gerações do modelo.

Mitiga riscos de vazamento de segredos em logs de depuração e padroniza a inferência de modelos de raciocínio.

*[Fonte: v1.18.33](https://github.com/anomalyco/opencode/releases/tag/v1.18.33) · OpenCode Releases · fonte primária*

#### Feedback do GPT-6 Sol

Assinantes do Codex relatam que o GPT‑6 Sol apresenta sintomas de preguiça, falha no seguimento de instruções e entrega de código incompleto, lembrando o GPT‑5.6 Terra. Isso implica maior esforço de revisão humana do código gerado, elevando custos de qualidade e aumentando a probabilidade de introduzir bugs nas aplicações. A evidência é um relato de usuário, portanto não confirma uma regressão sistêmica, mas sinaliza risco imediato na produção das equipes que dependem da extensão do Codex.

*[Fonte: How does GPT-6 Sol feel so far?](https://www.reddit.com/r/GithubCopilot/comments/1wptkkq/how_does_gpt6_sol_feel_so_far/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Inflação de custo no Luna 5.6

Um relato no Reddit indica que o custo de créditos por prompt no modelo `luna 5.6` saltou de uma média de 0.5-1.5 para 6-14. O usuário afirma que a alteração ocorreu sem a instalação de novas ferramentas ou protocolos de contexto de modelo.

Essa inflação de custo compromete a viabilidade financeira de fluxos automatizados de longa duração. Administradores de orçamento de tokens precisam revisar a previsão de gastos por tarefa. Permanece a incerteza se o aumento é generalizado ou um caso isolado.

*[Fonte: Did they 10x the cost of luna 5.6 since the release of 6?](https://www.reddit.com/r/GithubCopilot/comments/1wq39rv/did_they_10x_the_cost_of_luna_56_since_the/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Monitoramento de quotas via QuotaBubble

Desenvolvedores que usam o GitHub Copilot agora têm uma forma simples de acompanhar seu consumo de requisições premium e uso de chat em tempo real, sem precisar acessar as configurações da conta. O widget de desktop open source QuotaBubble exibe esses dados de forma ambientar, funcionando em Windows, macOS e Linux.

O impacto direto é a redução de interrupções inesperadas por excedente de quota, permitindo que o usuário ajuste seu uso antes de atingir o limite. Ainda assim, a evidência não mostra se o widget lida com limites variáveis por plano ou se há risco de imprecisão na contagem devido a atrasos na sincronização com a API do GitHub.

*[Fonte: I built a lightweight floating desktop widget to track GitHub Copilot and other AI quotas in real time (Open Source)](https://www.reddit.com/r/GithubCopilot/comments/1wq6xm6/i_built_a_lightweight_floating_desktop_widget_to/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Conflito de contexto no Copilot SDK

Um desenvolvedor relatou a impossibilidade de desativar arquivos de contexto específicos do Claude, como o `CLAUDE.md`, ao utilizar o Copilot SDK / Agent Host. Diferente do que ocorre no Agente Local, a ferramenta não oferece opção para ignorar essas instruções e habilidades sem a modificação direta do repositório.

Essa limitação gera poluição de contexto e instruções conflitantes para quem opera múltiplas ferramentas de agentes no mesmo projeto. O problema compromete a precisão das respostas da IA e a eficiência operacional do fluxo de trabalho, embora permaneça a incerteza sobre a existência de alguma configuração oculta para resolver a falha sem alterar o código-fonte.

*[Fonte: GitHub Copilot SDK / Agent Host: How can I disable Claude Code context files like CLAUDE.md?](https://www.reddit.com/r/GithubCopilot/comments/1wr1vm1/github_copilot_sdk_agent_host_how_can_i_disable/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Travamento de execução no terminal

Usuários de MacBook com GitHub Copilot + relataram que a ferramenta fica travada no estado "Run in terminal", mesmo quando o comando bash mostra atividade visível via top. O problema ocorre sem alterações aparentes na configuração e afeta usuários com experiência prévia na ferramenta.

O travamento impede a execução automática de comandos assistidos, forçando a cópia e colagem manual no terminal externo, o que aumenta o tempo de desenvolvimento e o risco de erro humano. A evidência, baseada em um único relato, não permite confirmar se trata de um bug isolado ou de uma falha recorrente em versões específicas da extensão ou do ambiente macOS.

*[Fonte: Stuck on “Run in terminal”](https://www.reddit.com/r/GithubCopilot/comments/1wr56qh/stuck_on_run_in_terminal/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Busca por alternativas ao Copilot Pro

Um usuário do Reddit relatou a busca por alternativas mais baratas ao Copilot Pro após o aumento de preços da ferramenta. O relato indica a intenção de migrar para soluções com desempenho igual ou superior ao modelo Claude Sonnet 5.

Essa movimentação pressiona a adoção de modelos de pesos abertos ou o uso de APIs diretas para reduzir custos operacionais. A mudança gera incerteza sobre qual ferramenta mantém a mesma força técnica do Copilot Pro sem elevar o gasto mensal.

*[Fonte: Best cheaper alternative](https://www.reddit.com/r/GithubCopilot/comments/1wr5io2/best_cheaper_alternative/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Redução de limites no Codex

O plano de US$ 100 do Codex não menciona mais limites de uso 5x ou 20x em relação ao plano Plus, passando a descrever apenas 'Mais uso que o Plus'. Essa alteração foi feita para liberar capacidade para o novo plano Pro Max, segundo o relato do autor no Reddit.

Quem depende de previsibilidade para execuções em massa de tarefas de codificação agora enfrenta incerteza sobre o throughput real disponível, sem saber até que ponto o limite foi reduzido ou como isso afeta a escalabilidade de suas cargas de trabalho atuais. A ausência de números concretos deixa em aberto se a mudança implica um ajuste fino ou uma restrição relevante para usuários de alta intensidade.

*[Fonte: Plans are no longer x5 or x20 - Overall Limit Decrease To Make Room For Pro Max Plans](https://www.reddit.com/r/codex/comments/1wrr1z8/plans_are_no_longer_x5_or_x20_overall_limit/#community-signals) · Reddit r/codex · sinal da comunidade*

#### Over-refusal no Claude Opus 5.5

Usuários reportam que o Claude Opus 5.5 bloqueia consultas básicas de endurecimento (hardening) de aplicações C/Rust por interpretá-las como violações de segurança, enquanto outros modelos executam a tarefa.

Cria atrito em fluxos de cibersegurança defensiva, onde o modelo falha em distinguir entre análise de vulnerabilidade legítima e ataque.

*[Fonte: Terrible experience with personal cybersecurity work. Opus 5.5](https://www.reddit.com/r/ClaudeCode/comments/1ws6962/terrible_experience_with_personal_cybersecurity/) · Reddit r/ClaudeCode · sinal da comunidade*

## Leitura do conjunto

O ecossistema de assistentes de código apresenta uma tendência de convergência técnica, exemplificada pelo Copilot CLI 1.0.89-5 ao aceitar regras do Claude Code (.claude/rules). Entretanto, essa integração coexiste com conflitos operacionais, como a dificuldade de isolar contextos específicos do Claude dentro do Copilot SDK, gerando ruído nas instruções de agentes.

Paralelamente, observa-se uma degradação na percepção de valor e qualidade. Enquanto o OpenCode v1.18.33 foca em governança e segurança de logs, usuários de Codex e Copilot Pro relatam a entrega de código incompleto ('slop') pelo GPT-6 Sol, aumento inesperado de custos no Luna 5.6 e redução de limites de uso nos planos de assinatura para acomodar novas categorias 'Pro Max'.

Esses sinais comunitários contrastam com as atualizações oficiais, revelando que a estabilidade dos modelos de raciocínio e a transparência de custos são gargalos críticos para a adoção em escala, levando desenvolvedores a buscarem ferramentas de monitoramento externo, como o QuotaBubble, para gerir a incerteza financeira e técnica.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">57.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:92.7%"></span></span><span class="value">53.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.5%"></span></span><span class="value">52.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">Muse Spark 1.3</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:83.5%"></span></span><span class="value">48.1</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">GPT-6 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:82.5%"></span></span><span class="value">47.5</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">Grok 4.7</th><td role="cell" class="creator">SpaceXAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.6%"></span></span><span class="value">46.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">MiMo-V2.6-Pro <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span></th><td role="cell" class="creator">Xiaomi</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.4%"></span></span><span class="value">46.3</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">Qwen3.8 Max</th><td role="cell" class="creator">Alibaba</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:78.8%"></span></span><span class="value">45.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">GLM-5.3 <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span></th><td role="cell" class="creator">Z AI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:77.8%"></span></span><span class="value">44.8</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">Grok 4.6</th><td role="cell" class="creator">SpaceXAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:76.9%"></span></span><span class="value">44.3</span></div></td></tr></tbody>
</table>
<figcaption><span class="legend-open">Pesos abertos</span><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [1.0.89-5](https://github.com/github/copilot-cli/releases/tag/v1.0.89-5) — Copilot CLI Releases
2. [v1.18.33](https://github.com/anomalyco/opencode/releases/tag/v1.18.33) — OpenCode Releases
3. [How does GPT-6 Sol feel so far?](https://www.reddit.com/r/GithubCopilot/comments/1wptkkq/how_does_gpt6_sol_feel_so_far/) — Reddit r/GithubCopilot
4. [Did they 10x the cost of luna 5.6 since the release of 6?](https://www.reddit.com/r/GithubCopilot/comments/1wq39rv/did_they_10x_the_cost_of_luna_56_since_the/) — Reddit r/GithubCopilot
5. [I built a lightweight floating desktop widget to track GitHub Copilot and other AI quotas in real time (Open Source)](https://www.reddit.com/r/GithubCopilot/comments/1wq6xm6/i_built_a_lightweight_floating_desktop_widget_to/) — Reddit r/GithubCopilot
6. [GitHub Copilot SDK / Agent Host: How can I disable Claude Code context files like CLAUDE.md?](https://www.reddit.com/r/GithubCopilot/comments/1wr1vm1/github_copilot_sdk_agent_host_how_can_i_disable/) — Reddit r/GithubCopilot
7. [Stuck on “Run in terminal”](https://www.reddit.com/r/GithubCopilot/comments/1wr56qh/stuck_on_run_in_terminal/) — Reddit r/GithubCopilot
8. [Best cheaper alternative](https://www.reddit.com/r/GithubCopilot/comments/1wr5io2/best_cheaper_alternative/) — Reddit r/GithubCopilot
9. [Plans are no longer x5 or x20 - Overall Limit Decrease To Make Room For Pro Max Plans](https://www.reddit.com/r/codex/comments/1wrr1z8/plans_are_no_longer_x5_or_x20_overall_limit/#community-signals) — Reddit r/codex
10. [Terrible experience with personal cybersecurity work. Opus 5.5](https://www.reddit.com/r/ClaudeCode/comments/1ws6962/terrible_experience_with_personal_cybersecurity/) — Reddit r/ClaudeCode

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-09-28.*
