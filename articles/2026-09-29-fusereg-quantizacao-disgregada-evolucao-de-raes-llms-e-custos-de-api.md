---
layout: article
title: "FuseReg & Quantização Disgregada: evolução de RAEs, LLMs e custos de API"
date: "2026-09-29"
tags: ["hf-daily-papers", "microsoft-agent-framework", "reddit", "papers", "research", "microsoft", "agents", "codex", "openai", "copilot"]
summary: "RAEs incorporam novas camadas de latentes, LLMs ganham quantização direcionada e usuários relatam mudanças bruscas nos planos de API e na qualidade dos modelos."
reading_time: 9
---

{% raw %}
# FuseReg & Quantização Disgregada: evolução de RAEs, LLMs e custos de API

**Período analisado:** 28/09/2026 a 29/09/2026 · 9 pautas · 4 fontes primárias · 5 sinais da comunidade

## Em 30 segundos

- **FuseReg regula fusão de camadas** — O método FuseReg regulariza a fusão de camadas de encoders em RAEs, escolhendo entre camadas rasas para detalhes de pixel e profundas para métricas de geração.
- **Quantização disgregada acelera LLMs** — A quantização disgregada permite usar aritmética de baixa precisão no prefill e pesos compactos no decode, aumentando a eficiência de Qwen 3 e Gemma 3.
- **RayOrch estrutura fluxos de dados** — RayOrch oferece pipelines multi-grão que transformam documentos e vídeos heterogêneos em registros estruturados, mantendo relações parent-escrita em GPU.
- **dotnet-1.23 adiciona pinning de origem** — O .NET 1.23.0 introduziu origin pinning no Foundry toolbox MCP client e correções em variáveis HTTP declarativas, melhorando a estabilidade dos fluxos.
- **Pro plan $200 reajusta custos a metade** — A OpenAI redefiniu o cálculo de uso do plano Pro $200, resultando em um gasto de API praticamente metade do valor histórico.
- **Curtos de bugs em Codex aumentam** — Um usuário analisou todos os 30.746 issues em Codex e observou crescimento contínuo de bugs em cada nova versão.
- **Reembolso automático na UE** — Usuários na UE podem solicitar reembolso por meio do chatbot do help.openai.com, recebendo valor prorrateado.
- **Codex sofre degradação de desempenho** — Usuários relataram lentidão extrema e perda de qualidade na Codex após atualização recente, com demonstrações de UI inutilizáveis.
- **GHCP oferece $19 licença mensal**

## Destaques

### Engenharia e ecossistema

#### FuseReg regula fusão de camadas

O método FuseReg regulariza a fusão de camadas de encoders em RAEs, escolhendo entre camadas rasas para detalhes de pixel e profundas para métricas de geração.

Ajuda engenheiros de IA a balancear qualidade visual e desempenho em pipelines de geração de imagens.

*[Fonte: FuseReg: Regularizing Layer Fusion Mitigates the Reconstruction-Generation Gap in Representation Autoencoders](https://huggingface.co/papers/2609.31620) · HF Daily Papers · fonte primária*

### Modelos e pesquisa

#### Quantização disgregada acelera LLMs

A quantização disgregada permite usar aritmética de baixa precisão no prefill e pesos compactos no decode, aumentando a eficiência de Qwen 3 e Gemma 3.

Reduz custos de infraestrutura sem prejudicar a qualidade em tarefas de decodificação pesada.

*[Fonte: Disaggregated Quantization: Specializing LLM Prefill and Decode](https://huggingface.co/papers/2609.26333) · HF Daily Papers · fonte primária*

#### RayOrch estrutura fluxos de dados

RayOrch oferece pipelines multi-grão que transformam documentos e vídeos heterogêneos em registros estruturados, mantendo relações parent-escrita em GPU.

Facilita a preparação de dados de alta qualidade para treinamento de modelos de base.

*[Fonte: RayOrch: Programming and Executing Lineage-Controlled Multi-Grain Dataflows for Foundation-Model Data Preparation](https://huggingface.co/papers/2609.18703) · HF Daily Papers · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### dotnet-1.23 adiciona pinning de origem

O .NET 1.23.0 adiciona origin pinning ao Foundry toolbox MCP client e corrige o tratamento de variáveis HTTP declarativas em fluxos de trabalho, conforme registrado no release oficial. Também inclui ajustes na comparação de multiplicidade de arestas de topologia e armazenamento de mensagens de entrada externas criadas.

Para desenvolvedores que usam o cliente MCP em orquestradores de agentes, o origin pinning reduz riscos de spoofing ao fixar a origem confiável das chamadas, enquanto a correção nas variáveis HTTP evita falhas silenciosas em fluxos declarativos, embora a evidência não especifique se há impactos de desempenho ou compatibilidade com versões anteriores do Foundry.

*[Fonte: dotnet-1.23.0](https://github.com/microsoft/agent-framework/releases/tag/dotnet-%24(VersionPrefix)) · Microsoft Agent Framework Releases · fonte primária*

#### Pro plan $200 reajusta custos a metade

A OpenAI anunciou que reabrirá as inscrições do plano Pro $200 e alterará a forma de cálculo de uso, de modo que o custo de API será reduzido a quase metade em comparação ao plano anterior. O ajuste afeta quem paga pela quantia fixa mensal, pois o consumo será contabilizado de forma diferente.

Para usuários atuais, isso implica rever os orçamentos mensais e a projeção de gastos em LLM. Se a mudança não for refletida nos relatórios de uso, o orçamento pode ficar subestimado. A comunidade ainda não confirmou a mudança em larga escala, portanto, é prudente monitorar a documentação oficial e ajustar as métricas de consumo apenas depois de a nova política ser publicada.

*[Fonte: $200 Pro Plan Returning at less than 20x - Tibo](https://www.reddit.com/r/codex/comments/1wt2y1g/200_pro_plan_returning_at_less_than_20x_tibo/) · Reddit r/Codex · sinal da comunidade*

#### Curtos de bugs em Codex aumentam

Um usuário analisou 30 746 issues abertas no repositório openai/codex, observando crescimento contínuo de bugs em cada nova versão.  O relato indica que os defeitos aumentam a cada release de modelo.

Para quem utiliza Codex, isso implica risco operacional, já que o volume de bugs não decresce com melhorias de modelo.  A arquitetura de testes e QA precisa ser revisada, e o custo de correção pode subir, mascarando benefícios de adoções mais recentes.  A evidência permanece um relato de comunidade, sem confirmação formal, e pode não refletir a situação global dos projetos.

*[Fonte: Happy DevDay! Codex is celebrating with a new ATH: 19,260 open issues on GitHub](https://www.reddit.com/r/codex/comments/1wt3kkx/happy_devday_codex_is_celebrating_with_a_new_ath/) · Reddit r/Codex · sinal da comunidade*

#### Reembolso automático na UE

Usuários na União Europeia podem solicitar reembolso por meio do chatbot do help.openai.com, recebendo um valor prorrateado equivalente ao período restante da assinatura. O processo elimina a necessidade de formulários manuais ou contato direto com suporte, permitindo a devolução automática com base nos dias não utilizados.

Para quem paga API ou mantém assinatura no período de 14 dias após a ativação, a consequência prática é a redução da barreira para desistência ou troca de serviço, já que o risco financeiro está minimizado. Aevidência deixa em aberto se esse fluxo automático se expandirá para outras regiões ou se mantém limitação geográfica e temporal estrita baseada nas regras locais de proteção ao consumidor.

*[Fonte: FYI: If you're in the EU, you can easily receive a refund for your subscription if you paid within the last 14 days!](https://www.reddit.com/r/codex/comments/1wt4x3u/fyi_if_youre_in_the_eu_you_can_easily_receive_a/) · Reddit r/Codex · sinal da comunidade*

#### Codex sofre degradação de desempenho

Usuários do Codex relataram lentidão extrema e queda na qualidade das respostas após atualização recente. Um relato no Reddit indica que demonstrações de interface de usuário tornaram-se inutilizáveis.

Quem paga pela API enfrenta perda de produtividade e riscos na entrega de código autogerado. A instabilidade afeta a confiança na operação, embora a evidência seja um relato isolado de comunidade e ainda careça de confirmação oficial.

*[Fonte: Service Degradation?](https://www.reddit.com/r/codex/comments/1wt5q4v/service_degradation/) · Reddit r/Codex · sinal da comunidade*

#### GHCP oferece $19 licença mensal

O GitHub Copilot anunciou um plano de licença individual chamado GHCP ao preço de $19 por mês. Essa oferta surgiu a partir de um relato de usuário que buscava alternativas dentro de um orçamento limitado de $10 para uso de modelos de IA como o Opus 5.5 da Anthropic.

O relato indica que o limite de $10 foi rapidamente atingido após apenas algumas tarefas moderadas, sugerindo que o GHCP pode não garantir o controle de custos prometido, principalmente para usuários que dependem de modelos pesados. A incerteza permanece sobre como o uso é medido e se o plano realmente evita surpresas na fatura, já que a evidência é um caso isolado e não reflete comportamento geral.

*[Fonte: What does a GHCP seat give to the dev?](https://www.reddit.com/r/GithubCopilot/comments/1wsnnnr/what_does_a_ghcp_seat_give_to_the_dev/) · Reddit r/GithubCopilot · sinal da comunidade*

## Leitura do conjunto

As novidades de hoje mostraram duas linhas de evolução no ecossistema de IA. Por um lado, pesquisadores trazem técnicas avançadas de compactação e modelagem, como FuseReg e a quantização disgregada, que aprimoram a relação entre qualidade visual e custo computacional de modelos generativos e de linguagem. Por outro lado, usuários e desenvolvedores reportam impactos reais sobre custos e desempenho: a OpenAI redefiniu o plano Pro $200, o GitHub Copilot introduziu o produto GHCP, e a Codex enfrentou degradação de performance e crescimento contínuo de bugs. Esses sinais cruzam a teoria e a prática, evidenciando a necessidade de ajustamentos de orçamento, rigor em processos de QA e atenção contínua a mudanças de política de uso em serviços baseados em IA.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">57.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">Claude Sonnet 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:97.2%"></span></span><span class="value">56.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:92.7%"></span></span><span class="value">53.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.5%"></span></span><span class="value">52.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">Muse Spark 1.3</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:83.5%"></span></span><span class="value">48.1</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">GPT-6 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:82.5%"></span></span><span class="value">47.5</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">Grok 4.7</th><td role="cell" class="creator">SpaceXAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.6%"></span></span><span class="value">46.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">MiMo-V2.6-Pro <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span></th><td role="cell" class="creator">Xiaomi</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.4%"></span></span><span class="value">46.3</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">Qwen3.8 Max</th><td role="cell" class="creator">Alibaba</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:78.8%"></span></span><span class="value">45.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">GLM-5.3 <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span></th><td role="cell" class="creator">Z AI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:77.8%"></span></span><span class="value">44.8</span></div></td></tr></tbody>
</table>
<figcaption><span class="legend-open">Pesos abertos</span><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [FuseReg: Regularizing Layer Fusion Mitigates the Reconstruction-Generation Gap in Representation Autoencoders](https://huggingface.co/papers/2609.31620) — HF Daily Papers
2. [Disaggregated Quantization: Specializing LLM Prefill and Decode](https://huggingface.co/papers/2609.26333) — HF Daily Papers
3. [RayOrch: Programming and Executing Lineage-Controlled Multi-Grain Dataflows for Foundation-Model Data Preparation](https://huggingface.co/papers/2609.18703) — HF Daily Papers
4. [dotnet-1.23.0](https://github.com/microsoft/agent-framework/releases/tag/dotnet-%24(VersionPrefix)) — Microsoft Agent Framework Releases
5. [$200 Pro Plan Returning at less than 20x - Tibo](https://www.reddit.com/r/codex/comments/1wt2y1g/200_pro_plan_returning_at_less_than_20x_tibo/) — Reddit r/Codex
6. [Happy DevDay! Codex is celebrating with a new ATH: 19,260 open issues on GitHub](https://www.reddit.com/r/codex/comments/1wt3kkx/happy_devday_codex_is_celebrating_with_a_new_ath/) — Reddit r/Codex
7. [FYI: If you're in the EU, you can easily receive a refund for your subscription if you paid within the last 14 days!](https://www.reddit.com/r/codex/comments/1wt4x3u/fyi_if_youre_in_the_eu_you_can_easily_receive_a/) — Reddit r/Codex
8. [Service Degradation?](https://www.reddit.com/r/codex/comments/1wt5q4v/service_degradation/) — Reddit r/Codex
9. [What does a GHCP seat give to the dev?](https://www.reddit.com/r/GithubCopilot/comments/1wsnnnr/what_does_a_ghcp_seat_give_to_the_dev/) — Reddit r/GithubCopilot

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-09-29.*
