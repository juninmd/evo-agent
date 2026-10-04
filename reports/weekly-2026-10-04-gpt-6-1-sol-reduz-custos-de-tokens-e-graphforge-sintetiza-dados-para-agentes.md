---
layout: article
title: "GPT-6.1 Sol reduz custos de tokens e GraphForge sintetiza dados para agentes"
date: "2026-10-04"
tags: ["weekly-report", "openai", "hf-daily-papers", "microsoft-agent-framework", "reddit", "papers", "research", "microsoft", "agents", "codex", "post-signals"]
summary: "A OpenAI lança modelo de codificação com custo reduzido enquanto a pesquisa em agentes foca em estados de crença e síntese de workspaces. Relatos de usuários do Codex e Claude Code apontam instabilidades em IDEs e custos imprevistos após resets."
reading_time: 9
---

{% raw %}
# GPT-6.1 Sol reduz custos de tokens e GraphForge sintetiza dados para agentes

**Período analisado:** 28/09/2026 a 04/10/2026 · 8 pautas · 4 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Lançamento do GPT-6.1 Sol** — A OpenAI introduziu o GPT-6.1 Sol, modelo para codificação e uso de computador com preços de tokens de entrada e saída equivalentes a um quinto do padrão do Astra.
- **Framework GraphForge para agentes** — Foi apresentado o GraphForge, framework baseado em grafos de evidências para sintetizar dados de treinamento de agentes com arquivos reais e verificadores de tarefa.
- **Estados de crença explícitos via PoS** — O framework PoS implementa a manutenção de estados de crença explícitos durante a inferência para organizar o contexto de decisão do agente.
- **Microsoft Agent Framework integra DuckDB** — A versão python-1.20.0 adicionou conectores nativos de vector-store para DuckDB e SQL Server, além do conector TypeSafe AI.
- **Aumento de consumo no plano Pro 200** — Usuários do Codex relataram queda acelerada de saldo (de 100% para 74% em poucas horas) após o reset, utilizando o modelo Sol 6.1 High.
- **Travamentos do Codex no VS Code** — O uso do modelo 5.6 SOL no VS Code causa o enfileiramento de prompts com ícones de delete que nunca são liberados, exigindo o recarregamento da janela.
- **Integração de workflows pstack no Copilot** — Usuários integraram os fluxos de agentes pstack (Lauren Tan) na nova janela de agentes do VS Code, permitindo a reprodução de bugs antes da codificação.
- **Desenvolvimento de jogo com Claude Code** — Um desenvolvedor utilizou o Claude Code para criar o City Defense, um jogo de tower defense que opera sobre dados reais do OpenStreetMap.

## Destaques

### Modelos e pesquisa

#### Lançamento do GPT-6.1 Sol

A OpenAI lançou o modelo GPT-6.1 Sol, treinado para codificação avançada e uso de computador com preço de tokens de entrada e saída equivalente a um quinto do padrão da Astra. A novidade posiciona o modelo como alternativa econômica para pipelines de automação que processam grandes volumes de contexto. Para equipes de desenvolvimento e operações que dependem de API para tarefas rotineiras, a redução de custo operacional permite reallocação de recursos para outras frentes de trabalho sem aumento de orçamento. O registro oficial não detalha limitações de desempenho ou comportamento em casos extremos, deixando em aberto como o modelo se comportará sob cargas extremas de processamento.

*[Fonte: Introducing GPT-6.1 Sol](https://openai.com/index/introducing-gpt-6-1-sol) · OpenAI Blog · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Framework GraphForge para agentes

O GraphForge é um framework baseado em grafos de evidências para sintetizar dados de treinamento de agentes. A ferramenta utiliza arquivos reais e verificadores de tarefas para criar conjuntos de dados verificáveis.

Desenvolvedores de agentes de espaço de trabalho ganham datasets com maior realismo e validação determinística de entregáveis. A solução resolve a falta de diversidade em arquivos gerados por modelos, embora a evidência não detalhe a escala de processamento desses grafos.

*[Fonte: GraphForge: Training Working Agents with Graph-Anchored Workspace Synthesis](https://huggingface.co/papers/2609.38923) · HF Daily Papers · fonte primária*

#### Estados de crença explícitos via PoS

O framework PoS implementa a manutenção de estados de crença explícitos durante a inferência para organizar o contexto de decisão do agente. Cada crença combina uma estimativa do estado atual do mundo com requisitos de tarefa não resolvidos, tornando transparente o que o agente ainda precisa aprender para agir. A abordagem substitui o histórico linear de interações por um mapeamento estruturado de lacunas de conhecimento.

A mudança arquitetural afeta diretamente quem constrói agentes de longo horizonte, pois exige reescrever o módulo de memória para operar sobre crenças atualizadas incrementalmente em vez de acumular contexto bruto.

*[Fonte: Beyond Memory: Harnessing Long-Horizon Agents with Explicit Belief States](https://huggingface.co/papers/2610.01415) · HF Daily Papers · fonte primária*

#### Microsoft Agent Framework integra DuckDB

A versão `python-1.20.0` do Microsoft Agent Framework introduziu conectores nativos de armazenamento de vetores para DuckDB e SQL Server, além da integração com o conector TypeSafe AI. A atualização também implementou isolamento de acesso a arquivos por sessão e portões de fluxo de resposta.

Desenvolvedores de agentes podem migrar bases de conhecimento para arquiteturas de lakehouse local utilizando o DuckDB. Essa mudança reduz a dependência de serviços de vetores externos, mas a evidência não detalha os limites de performance para grandes volumes de dados.

*[Fonte: python-1.20.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.20.0) · Microsoft Agent Framework Releases · fonte primária*

#### Aumento de consumo no plano Pro 200

Um usuário do plano Pro 200 relatou no Reddit que seu saldo de consumo caiu de 100% para 74% em poucas horas após o reset. O incidente ocorreu durante o uso regular do modelo `Sol 6.1 High`.

Assinantes do Codex enfrentam risco de instabilidade no cálculo de quotas ou regressão na eficiência de tokens. Isso compromete a previsibilidade de custos e a operação do plano. Como a evidência baseia-se em um único relato, ainda não se sabe se a falha é generalizada ou isolada.

*[Fonte: Holy usage increase after latest reset](https://www.reddit.com/r/codex/comments/1ww9cf7/holy_usage_increase_after_latest_reset/) · Reddit r/Codex · sinal da comunidade*

#### Travamentos do Codex no VS Code

O uso do modelo 5.6 SOL no VS Code provoca que os pedidos de codificação sejam enfileirados com um ícone de delete e nunca sejam liberados. O prompt permanece bloqueado e, em alguns casos, desaparece. O usuário relata que a solução imediata é executar “Developer: Reload Window” ou reiniciar o VS Code para restaurar o fluxo.

Para quem depende da extensão, esse comportamento significa interrupções recorrentes no ciclo de produção de código, exigindo intervenção manual que interrompe a continuidade do trabalho. A necessidade de reabrir a janela implica no risco de perda de contexto ou dados não salvos e aumenta o tempo de inatividade.

*[Fonte: Codex in VS Code gets stuck](https://www.reddit.com/r/codex/comments/1wvkdx1/codex_in_vs_code_gets_stuck/) · Reddit r/Codex · sinal da comunidade*

#### Integração de workflows pstack no Copilot

Um usuário relatou a integração dos fluxos de agentes `pstack`, de Lauren Tan, na nova janela de agentes do VS Code e no `Copilot CLI`. A implementação permite que a ferramenta reproduza bugs para encontrar a causa raiz e desenhe projetos antes de codificar, validando o resultado final em vez de apenas encerrar a tarefa.

Para desenvolvedores que utilizam a extensão do GitHub Copilot, a medida viabiliza camadas de orquestração externas para aumentar a precisão no diagnóstico de falhas. Como a evidência baseia-se em um relato individual de adaptação de código, a estabilidade da integração e a facilidade de adoção por outros usuários permanecem incertas.

*[Fonte: Got pstack (poteto's agent workflows) working with Copilot in the new VS Code agents window](https://www.reddit.com/r/GithubCopilot/comments/1wveivl/got_pstack_potetos_agent_workflows_working_with/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

#### Desenvolvimento de jogo com Claude Code

Um desenvolvedor reportou na comunidade r/ClaudeCode que utilizou o Claude Code para criar “City Defense”, um jogo de tower defense que emprega dados reais do OpenStreetMap. O jogo permite que inimigos andem pelas ruas autênticas, que torres sejam construídas em telhados de prédios reais – a altura do prédio define o alcance – e que edificações possam ser danificadas, bloqueando vias com destroços.

Para quem deseja integrar dados geográficos em jogos, a prova indica que o Claude Code facilita a consumção de APIs externas e a lógica de jogo complexa via terminal.

*[Fonte: I always loved mobile tower defense games, so I built one that runs on the real map of any city (OpenStreetMap)](https://www.reddit.com/r/ClaudeCode/comments/1wuvufr/i_always_loved_mobile_tower_defense_games_so_i/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

## Leitura do conjunto

A indústria de agentes transita para modelos de custo reduzido e maior rigor técnico. Enquanto a OpenAI lança o GPT-6.1 Sol para baratear operações de codificação, frameworks como GraphForge e PoS buscam resolver a fragilidade de agentes de longo horizonte através de síntese de dados baseada em grafos e estados de crença explícitos. A Microsoft reforça essa tendência ao integrar DuckDB no Agent Framework, facilitando a persistência de vetores em infraestruturas locais.

Contudo, a adoção prática revela gargalos operacionais. Relatos da comunidade Codex contrastam a promessa de eficiência do modelo Sol 6.1 com aumentos inesperados no consumo de quotas e instabilidades de interface no VS Code. Em contrapartida, a extensibilidade do ecossistema é evidenciada pela integração de workflows externos como o pstack no Copilot e a criação de aplicações complexas via Claude Code, indicando que a maturidade dos agentes depende agora da estabilidade do harness e da previsibilidade de custos.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">57.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">Claude Sonnet 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:97.2%"></span></span><span class="value">56.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:92.7%"></span></span><span class="value">53.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.5%"></span></span><span class="value">52.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">Gemini 4 Argon</th><td role="cell" class="creator">Google</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.3%"></span></span><span class="value">52.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">GPT-6.1 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:89.9%"></span></span><span class="value">51.8</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">Muse Spark 1.3</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:83.5%"></span></span><span class="value">48.1</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">Grok 4.7</th><td role="cell" class="creator">SpaceXAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.6%"></span></span><span class="value">46.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">MiMo-V2.6-Pro <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span></th><td role="cell" class="creator">Xiaomi</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.4%"></span></span><span class="value">46.3</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">Qwen3.8 Max</th><td role="cell" class="creator">Alibaba</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:78.8%"></span></span><span class="value">45.4</span></div></td></tr></tbody>
</table>
<figcaption><span class="legend-open">Pesos abertos</span><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [Introducing GPT-6.1 Sol](https://openai.com/index/introducing-gpt-6-1-sol) — OpenAI Blog
2. [GraphForge: Training Working Agents with Graph-Anchored Workspace Synthesis](https://huggingface.co/papers/2609.38923) — HF Daily Papers
3. [Beyond Memory: Harnessing Long-Horizon Agents with Explicit Belief States](https://huggingface.co/papers/2610.01415) — HF Daily Papers
4. [python-1.20.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.20.0) — Microsoft Agent Framework Releases
5. [Holy usage increase after latest reset](https://www.reddit.com/r/codex/comments/1ww9cf7/holy_usage_increase_after_latest_reset/) — Reddit r/Codex
6. [Codex in VS Code gets stuck](https://www.reddit.com/r/codex/comments/1wvkdx1/codex_in_vs_code_gets_stuck/) — Reddit r/Codex
7. [Got pstack (poteto's agent workflows) working with Copilot in the new VS Code agents window](https://www.reddit.com/r/GithubCopilot/comments/1wveivl/got_pstack_potetos_agent_workflows_working_with/#community-signals) — Reddit r/GithubCopilot
8. [I always loved mobile tower defense games, so I built one that runs on the real map of any city (OpenStreetMap)](https://www.reddit.com/r/ClaudeCode/comments/1wuvufr/i_always_loved_mobile_tower_defense_games_so_i/#community-signals) — Reddit r/ClaudeCode

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-04.*
