---
layout: article
title: "Claude Code v2.1.288 e instabilidades de custo no Copilot e Codex"
date: "2026-10-03"
tags: ["claude-code", "mcp-typescript-sdk", "microsoft-agent-framework", "openai-agents-sdk", "reddit", "anthropic", "mcp", "sdk", "microsoft", "agents"]
summary: "Atualizações no ecossistema MCP e Claude Code expandem a automação de terminal. Relatos de usuários apontam anomalias de consumo de tokens e custos elevados em modelos de raciocínio máximo."
reading_time: 9
---

{% raw %}
# Claude Code v2.1.288 e instabilidades de custo no Copilot e Codex

**Período analisado:** 01/10/2026 a 03/10/2026 · 8 pautas · 4 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Claude Code v2.1.288 implementa $.ui.selection()** — A versão 2.1.288 adicionou a função $.ui.selection() para mods, permitindo retornar o texto selecionado em modo tela cheia, além de integrar uma API gh nativa para sessões em…
- **MCP TypeScript SDK v2.3.0 restringe conexões de servidor** — A atualização do SDK do Model Context Protocol agora rejeita chamadas ao Server.connect() caso a instância já esteja conectada, tratando requisições via Streamable HTTP transport…
- **Microsoft Agent Framework v1.20.0 integra DuckDB e SQL Server** — O framework adicionou conectores nativos de vector-store para DuckDB e SQL Server, além de implementar isolamento de acesso a arquivos com escopo de sessão.
- **OpenAI Agents SDK v0.23.0 introduz proteção de Docker** — A versão 0.23.0 implementou a proteção opt-in contra a remoção de Docker no sandbox e a configuração de turnos de consolidação de memória.
- **Aumento de consumo de tokens no Sol 6.1 High** — Usuários do plano Pro 200 relataram que, após o reset de ciclo, o uso de tokens com o modelo Sol 6.1 High reduziu o saldo de 100% para 74% em poucas horas de trabalho habitual.
- **Custos excessivos de Sonnet 5.5 no Copilot** — Desenvolvedores relataram que duas gerações utilizando Sonnet 5.5 com 'max thinking' consumiram toda a cota mensal e geraram custos adicionais de aproximadamente 8 dólares.
- **Opacidade nos limites de uso do OpenAI Codex** — Usuários reportam a ausência de definições claras sobre a cota de uso do Codex, sendo forçados a realizar engenharia reversa através de barras de porcentagem para entender o custo…
- **Geração de sintetizador de voz via Claude Opus 5.5** — Um usuário utilizou o Claude Opus 5.5 para escrever código que gera um sintetizador de voz do zero, sem dependências, para criar um vídeo musical sobre a recorrência do termo…

## Destaques

### Agentes e ferramentas de desenvolvimento

#### Claude Code v2.1.288 implementa $.ui.selection()

A versão 2.1.288 introduz o método $.ui.selection() para modificações, retornando o texto selecionado em tela cheia e, quando a seleção está dentro de uma única linha de transcripto, retornando essa linha completa. Além disso, a atualização inclui uma API gh integrada para sessões em nuvem sem a necessidade de GitHub CLI e corrige o envio de caracteres de controle provenientes de nomes de arquivos, filtros jq ou erros do GitHub para o terminal.

Para desenvolvedores de mods que operam em sessões em nuvem, a nova API nativa elimina a dependência externa do GitHub CLI, reduzindo o custo de integração e simplificando a arquitetura de automação.

*[Fonte: v2.1.288](https://github.com/anthropics/claude-code/releases/tag/v2.1.288) · Claude Code Releases · fonte primária*

#### MCP TypeScript SDK v2.3.0 restringe conexões de servidor

A versão 2.3.0 do MCP TypeScript SDK introduz a cláusula de conexão única da instância de servidor: `Server.connect()` agora resulta em erro se a conexão já estiver estabelecida, enquanto o transportes HTTP “Streamable” funciona sem estado e aceita apenas uma solicitação por vez. O pacote `@modelcontextprotocol/client/2.3.0` acompanha esta mudança na mesma versão.

Essa alteração obriga os desenvolvedores que utilizam o proxy MCP a alterarem a lógica de inicialização, criando um único servidor por fluxo de requisição em vez de manter conexões persistentes.

*[Fonte: 2.3.0](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.3.0) · MCP TypeScript SDK Releases · fonte primária*

#### Microsoft Agent Framework v1.20.0 integra DuckDB e SQL Server

A versão 1.20.0 do Microsoft Agent Framework introduziu conectores nativos de armazenamento de vetores para `agent-framework-duckdb` e `agent-framework-sql-server`. A atualização também implementou o conector `agent-framework-typesafe` e o isolamento de acesso a arquivos com escopo de sessão.

Desenvolvedores de agentes podem migrar bases de conhecimento para infraestruturas de bancos relacionais e lakehouses locais. A mudança simplifica a operação de dados vetoriais em ambientes corporativos, embora o registro oficial não detalhe a performance de latência desses novos conectores.

*[Fonte: python-1.20.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.20.0) · Microsoft Agent Framework Releases · fonte primária*

#### OpenAI Agents SDK v0.23.0 introduz proteção de Docker

A versão 0.23.0 do OpenAI Agents SDK implementou a proteção opcional contra a remoção de Docker no ambiente de sandbox. A atualização também introduziu a configuração de turnos para a consolidação de memória e limites configuráveis na página de listagem do protocolo de contexto de modelo.

Desenvolvedores de sandboxes automatizados reduzem o risco de perda acidental de infraestrutura de execução. O ajuste na consolidação de memória permite refinar a janela de contexto do agente, embora a documentação oficial não detalhe os limites exatos de desempenho para cada configuração de turno.

*[Fonte: v0.23.0](https://github.com/openai/openai-agents-python/releases/tag/v0.23.0) · OpenAI Agents SDK Releases · fonte primária*

#### Aumento de consumo de tokens no Sol 6.1 High

Usuários do plano Pro 200 relataram um aumento inesperado no consumo de tokens do modelo `Sol 6.1 High`. Um relato indica que o saldo de uso caiu de 100% para 74% em poucas horas de trabalho habitual logo após o reset do ciclo.

Essa instabilidade na métrica de custo por tarefa prejudica o planejamento orçamentário de desenvolvedores. A regressão na eficiência de tokens gera risco operacional e incerteza sobre a previsibilidade de gastos, embora a evidência seja baseada em um relato isolado da comunidade.

*[Fonte: Holy usage increase after latest reset](https://www.reddit.com/r/codex/comments/1ww9cf7/holy_usage_increase_after_latest_reset/) · Reddit r/Codex · sinal da comunidade*

#### Custos excessivos de Sonnet 5.5 no Copilot

O usuário do r/GithubCopilot relatou que duas gerações de Sonnet 5.5 com a flag “max thinking” consumiram a cota mensal de uso do Copilot e geraram custos adicionais de quase US$ 8. O custo foi estimado a partir da taxa de uso de cada geração, conforme o relato do autor.

Para quem utiliza a extensão Copilot, a prática de executar fluxos em modo “max thinking” a cada requisição cria risco de encerramento inesperado da cota mensal, aumento de despesa recorrente e necessidade de reconfigurar o workflow para limitar o número de gerações.

*[Fonte: Cancelled my sub today](https://www.reddit.com/r/GithubCopilot/comments/1ww8p8z/cancelled_my_sub_today/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

#### Opacidade nos limites de uso do OpenAI Codex

Os usuários enfrentam um cenário de incerteza ao usar o OpenAI Codex, pois as cotas de consumo permanecem sem definições claras, exigindo a reversão de barras de porcentagem para estimar o custo efetivo de cada tarefa. Essa ambiguidade transforma a experiência em um exercício de inferência, onde o limite real de execução e o custo por operação ficam ocultos atrás de indicadores vagos.

Para quem depende da ferramenta para fluxos de trabalho operacionais, a falta de transparência impede a previsibilidade orçamentária e complica a escalonamento de projetos, pois a ausência de dados precisos sobre o que constitui uma "tarefa" ou quanto resta da cota semanal cria um risco constante de interrupção inesperada.

*[Fonte: OpenAI’s vague usage limits contradict the transparency and user empowerment it claims to value](https://www.reddit.com/r/codex/comments/1ww1w2t/openais_vague_usage_limits_contradict_the/) · Reddit r/Codex · sinal da comunidade*

#### Geração de sintetizador de voz via Claude Opus 5.5

Um usuário postou em r/ClaudeCode que usou Claude Opus 5.5 para escrever um código que gera, do zero, um sintetizador de voz sem dependências externas, e, com ele, cria um vídeo musical baseado no termo “LOAD‑BEARING”. O relato descreve que o código produz o beat, as vozes e cada frame do vídeo exclusivamente pelo próprio Claude, sem modelos de voz, geradores de imagem ou samples.

Essa demonstração mostra que o Opus 5.5 pode gerar implementações de baixo nível que normalmente exigiriam bibliotecas especializadas, reduzindo o custo de integração de componentes de IA. No entanto, como o relato não traz métricas de desempenho, latência ou tamanho do binário, ainda não há confirmação sobre a viabilidade prática em ambientes de produção.

*[Fonte: had claude make a song about how it wont stop saying LOAD-BEARING](https://www.reddit.com/r/ClaudeCode/comments/1wvylt8/had_claude_make_a_song_about_how_it_wont_stop/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

## Leitura do conjunto

A integração de coletores de dados persistentes e locais, como os conectores DuckDB e SQL Server do Microsoft Agent Framework, e as novas APIs adaptativas do Claude Code e do OpenAI Agents SDK, sinaliza a tentativa de consolidar a lógica de sessão em ambientes isolados — o particionamento de arquivos por sessão e o controle de estado em conexão à nuvem mostram um foco na segurança operacional. Contudo, a própria limitação de conexões no MCP TypeScript SDK entra em conflito com a necessidade de múltiplas instâncias coexistirem para microsserviços, gerando dúvidas sobre a escalabilidade horizontal.

O aumento abrupto de consumo de tokens do Sol 6.1 High e os custos elevados do Sonnet 5.5 demonstram que a otimização de custos ainda não acompanha o ganho de performance orientado por esses novos recursos.

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

1. [v2.1.288](https://github.com/anthropics/claude-code/releases/tag/v2.1.288) — Claude Code Releases
2. [2.3.0](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.3.0) — MCP TypeScript SDK Releases
3. [python-1.20.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.20.0) — Microsoft Agent Framework Releases
4. [v0.23.0](https://github.com/openai/openai-agents-python/releases/tag/v0.23.0) — OpenAI Agents SDK Releases
5. [Holy usage increase after latest reset](https://www.reddit.com/r/codex/comments/1ww9cf7/holy_usage_increase_after_latest_reset/) — Reddit r/Codex
6. [Cancelled my sub today](https://www.reddit.com/r/GithubCopilot/comments/1ww8p8z/cancelled_my_sub_today/#community-signals) — Reddit r/GithubCopilot
7. [OpenAI’s vague usage limits contradict the transparency and user empowerment it claims to value](https://www.reddit.com/r/codex/comments/1ww1w2t/openais_vague_usage_limits_contradict_the/) — Reddit r/Codex
8. [had claude make a song about how it wont stop saying LOAD-BEARING](https://www.reddit.com/r/ClaudeCode/comments/1wvylt8/had_claude_make_a_song_about_how_it_wont_stop/#community-signals) — Reddit r/ClaudeCode

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-03.*
