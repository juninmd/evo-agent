---
layout: article
title: "Qwen 3.8 roda por padrão em MLX no Apple Silicon"
date: "2026-10-06"
tags: ["ollama", "hf-daily-papers", "github", "langgraph", "reddit", "local-ai", "papers", "research", "copilot", "changelog"]
summary: "O Rho desejado agora se dá em dispositivos Apple Silicon com MLX, simplificando a execução de modelos de maior escala. Junto com novidades em Claude Code, Copiloto e benchmarks de long‑conversation, o cenário se expande."
reading_time: 8
---

{% raw %}
# Qwen 3.8 roda por padrão em MLX no Apple Silicon

**Período analisado:** 05/10/2026 a 06/10/2026 · 8 pautas · 5 fontes primárias · 3 sinais da comunidade

## Em 30 segundos

- **Molde MLX no Apple Silicon** — O Rho permite que os modelos de linguagem rodem em MLX por padrão em dispositivos Apple Silicon, incluindo Qwen3.8, Gemma4, Qwen3.6 e Qwen3.5.
- **Benchmark RealCompanion** — Foi lançado RealCompanion com 27 218 mensagens em até 120 dias, simulando relações humanas entre um usuário e um AI companion.
- **Proteína como teste de raciocínio** — O FoldingCorpus guiou modelos a aprender dobra de proteínas, avaliando se isso generaliza para raciocínio espacial e topológico.
- **Visualização de AI Scan no GitHub** — Administradores agora podem ver o status de habilitação de AI Scan em pull requests na visão de cobertura de segurança.
- **Correções de Workflow no LangGraph** — Fixes incluem a preservação de counters DeltaChannel e a correção de fork de branch abandonado.
- **Codex perde consistência nas tarefas agendadas** — Um usuário relatou que Codex era extremamente inconsistentes e esquecia de executar tarefas programadas regularmente.
- **Migração para Claude Desktop App** — Um utilizador mudou-se para o aplicativo de desktop do Claude Code, alegando maior conveniência.
- **Copiloto pede permissão em cada edição de arquivo** — O Copiloto atualizou seu fluxo de permissão, exigindo autorização para cada alteração de arquivo em pull requests.

## Destaques

### Infraestrutura e eficiência

#### Molde MLX no Apple Silicon

O Rho permite que modelos de linguagem sejam executados via MLX em dispositivos Apple Silicon, configurando automaticamente os modelos Qwen3.8, Gemma4, Qwen3.6 e Qwen3.5 para rodarem sem intervenção. `ollama pull qwen3.8` e `ollama run qwen3.8` já ativam o runtime MLX por padrão, e versões de decisão como Nimble, tev1, clef e clef-flash também suportam essa execução nativa.

Para quem opera infra‑estrutura em Macs, isso significa reduzir a dependência de servidores remotos, diminuindo custos de conectividade e melhorando a latência local. A arquitetura passa a usar o acelerador nativo do Apple Silicon, eliminando a camada de rede e simplificando a implantação.

*[Fonte: v0.40.0](https://github.com/ollama/ollama/releases/tag/v0.40.0-rc5) · Ollama Releases · fonte primária*

### Engenharia e ecossistema

#### Benchmark RealCompanion

O RealCompanion lançou com 27.218 mensagens em até 120 dias, simulando relações humanas entre um usuário e um AI companion. Esse volume de dados em um período prolongado estabelece um parâmetro novo para medir retenção e inferência em diálogos estendidos.

A consequência prática imediata reside na necessidade de arquiteturas de memória persistente e janelas de contexto ampliadas, pois manter coerência em centenas de turnos exige mais do que padrão atual de janelas deslizantes. Isso eleva o custo computacional e de armazenamento para quem desenvolve ou opera serviços similares, além de introduzir risco de deriva de personalidade ao longo de meses de interação.

*[Fonte: RealCompanion: Benchmarking Human Understanding from Reasoning over Longitudinal Real-World Conversations](https://huggingface.co/papers/2610.01780) · HF Daily Papers · fonte primária*

#### Proteína como teste de raciocínio

O FoldingCorpus mostrou que modelos treinados para prever dobramento de proteínas conseguem responder milhares de questões espaciais precisamente, reforçando que a estrutura molecular fornece evidências rigorosas para teste de raciocínio. Esse método prova que aprender dobramento exige inferências topológicas que podem ser reaproveitadas em outros domínios.

Os resultados implicam que arquiteturas LLM, ao incorporar conjuntos estruturais detalhados, podem reduzir a necessidade de dados textuais extenso, diminuindo o custo de pré‑treino. Entretanto, a generalização ainda depende de que o modelo consiga transferir a lógica de estrutura para problemas fora do escopo de proteínas.

*[Fonte: Does Learning Protein Folding Generalize to Broader Reasoning?](https://huggingface.co/papers/2609.38879) · HF Daily Papers · fonte primária*

### Segurança e confiança

#### Visualização de AI Scan no GitHub

Administradores de organizações e empresas agora visualizam o status de habilitação do `AI Scan` para solicitações de pull request na visão de cobertura da visão geral de segurança. O resumo de varredura de código detalha quais repositórios possuem o recurso ativado ou desativado.

Essa visibilidade facilita auditorias de segurança e acelera a adoção da ferramenta em fluxos de integração e entrega contínuas. A atualização remove a opacidade operacional sobre a cobertura da funcionalidade, embora a evidência não especifique se há novos controles de automação para habilitar o recurso em massa.

*[Fonte: Code scanning AI Scan enablement status in security overview](https://github.blog/changelog/2026-10-06-code-scanning-ai-scan-enablement-status-in-security-overview) · GitHub Changelog · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Correções de Workflow no LangGraph

Fixes incluem a preservação de counters DeltaChannel e a correção de fork de branch abandonado.

Melhora a robustez de fluxos de trabalho de Agentes, reduzindo erros de replay em ambientes de produção.

*[Fonte: langgraph==1.2.13](https://github.com/langchain-ai/langgraph/releases/tag/1.2.13) · LangGraph Releases · fonte primária*

#### Codex perde consistência nas tarefas agendadas

Um usuário do r/codex relatou que Codex, ao executar tarefas agendadas, demonstrou alta inconsistência e frequente esquecimento de cumprir seus compromissos programados. O relato menciona que, apesar de ser bem-sucedido em tarefas pontuais, o sistema falhava ao executar atualizações de notícias e ao limpar caixas de e‑mail quando configurado com as instruções de um outro membro. O autor expressou extrema decepção e apontou erros recorrentes no log de “dots”.

Para quem depende do agente Cadex em ambientes de produção, a falha de tarefas agendadas gera risco de dados desatualizados e de processos críticos não concluídos dentro dos prazos.

*[Fonte: Wow. Lucky me!](https://www.reddit.com/r/codex/comments/1wxpqnh/wow_lucky_me/#community-signals) · Reddit r/codex · sinal da comunidade*

#### Migração para Claude Desktop App

Um usuário do Reddit relatou ter migrado do uso do `claude code` no terminal para o aplicativo de desktop, citando maior conveniência no fluxo de trabalho. A publicação busca entender quantos desenvolvedores mantêm a configuração baseada em linha de comando versus os que adotaram a interface gráfica, sem apresentar métricas de desempenho ou comparação de recursos técnicos.

A evidência permanece restrita a um relato individual, sem confirmação de suporte oficial ou dados de adoção em larga escala que justifiquem mudança de estratégia. Equipes que avaliam padronizar ambientes devem tratar a preferência por GUI como sinal qualitativo, e não como indicador de maturidade do aplicativo de desktop para produção.

*[Fonte: How many of you still use Claude code from terminal vs the claude desktop app?](https://www.reddit.com/r/ClaudeCode/comments/1wy9mju/how_many_of_you_still_use_claude_code_from/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### Copiloto pede permissão em cada edição de arquivo

O Copiloto atualizou seu fluxo de permissão, exigindo autorização para cada alteração de arquivo em pull requests.

Impacta a produtividade e a política de segurança, exigindo novos fluxos de aprovação para equipes de desenvolvimento.

*[Fonte: Copilot Update asks Permission for every file edit?](https://www.reddit.com/r/GithubCopilot/comments/1wvfmpt/copilot_update_asks_permission_for_every_file_edit/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

## Leitura do conjunto

A infraestrutura de IA avança para a execução local e a validação de raciocínio complexo. O uso do `MLX` em dispositivos Apple Silicon para modelos como `Qwen3.8` e `Gemma4` reduz a dependência de nuvem. Simultaneamente, o `FoldingCorpus` utiliza a dobra de proteínas para testar a capacidade espacial dos modelos, enquanto o `RealCompanion` mensura a consistência de interações humanas a longo prazo. Essas movimentações indicam a busca por modelos mais autônomos e cognitivamente precisos.

A operação prática, porém, enfrenta atritos de usabilidade e falhas de confiabilidade. Enquanto administradores do GitHub ganham visibilidade do `AI Scan`, desenvolvedores lidam com a fricção de permissões repetitivas do Copiloto e instabilidades de agendamento no Codex. Ajustes no `LangGraph` para `DeltaChannel` tentam estabilizar fluxos de trabalho, mas a migração de usuários para o aplicativo de desktop do Claude revela que a conveniência da interface ainda supera a eficiência de certas extensões.

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

1. [v0.40.0](https://github.com/ollama/ollama/releases/tag/v0.40.0-rc5) — Ollama Releases
2. [RealCompanion: Benchmarking Human Understanding from Reasoning over Longitudinal Real-World Conversations](https://huggingface.co/papers/2610.01780) — HF Daily Papers
3. [Does Learning Protein Folding Generalize to Broader Reasoning?](https://huggingface.co/papers/2609.38879) — HF Daily Papers
4. [Code scanning AI Scan enablement status in security overview](https://github.blog/changelog/2026-10-06-code-scanning-ai-scan-enablement-status-in-security-overview) — GitHub Changelog
5. [langgraph==1.2.13](https://github.com/langchain-ai/langgraph/releases/tag/1.2.13) — LangGraph Releases
6. [Wow. Lucky me!](https://www.reddit.com/r/codex/comments/1wxpqnh/wow_lucky_me/#community-signals) — Reddit r/codex
7. [How many of you still use Claude code from terminal vs the claude desktop app?](https://www.reddit.com/r/ClaudeCode/comments/1wy9mju/how_many_of_you_still_use_claude_code_from/#community-signals) — Reddit r/ClaudeCode
8. [Copilot Update asks Permission for every file edit?](https://www.reddit.com/r/GithubCopilot/comments/1wvfmpt/copilot_update_asks_permission_for_every_file_edit/#community-signals) — Reddit r/GithubCopilot

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-06.*
