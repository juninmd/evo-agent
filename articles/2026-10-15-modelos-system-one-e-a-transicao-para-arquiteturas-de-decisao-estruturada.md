---
layout: article
title: "Modelos System One e a transição para arquiteturas de decisão estruturada"
date: "2026-10-15"
tags: ["hf-daily-papers", "google-ai", "reddit", "microsoft-agent-framework", "papers", "research", "google", "post-signals", "githubcopilot", "claudecode"]
summary: "Novos modelos Jeva e VideoJev substituem a decodificação autorregressiva por cabeças de pontuação para reduzir latência em decisões. Relatos de usuários apontam custos inesperados no roteamento de modelos do GitHub HydraFusion."
reading_time: 8
---

{% raw %}
# Modelos System One e a transição para arquiteturas de decisão estruturada

**Período analisado:** 13/10/2026 a 15/10/2026 · 8 pautas · 4 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Jeva introduz modelos System One** — A arquitetura Jeva propõe modelos que distinguem a ausência de resposta da incerteza e mantêm a invariância de permutação em conjuntos de candidatos.
- **VideoJev para interação visual** — A família de modelos VideoJev substitui a decodificação de respostas autorregressiva por uma cabeça compartilhada que pontua intervalos temporais e opções textuais.
- **Lançamento do Gemini 4 Argon** — O Google disponibilizou o Gemini 4 Argon, descrito como seu modelo de fronteira mais recente para desenvolvedores e empresas.
- **Ineficiência de custo no HydraFusion** — Um usuário relatou que o roteador HydraFusion do GitHub Copilot selecionou o Claude Sonnet 5.5 para uma tarefa simples, consumindo 45 créditos em uma única requisição.
- **Implementação de stretchtext no Claude Code** — Um desenvolvedor criou o mod cc-stretch para Claude Code, permitindo que o texto de respostas cresça ou encolha conforme a necessidade do usuário.
- **Migração de Codex para Claude** — Usuário migrou do Codex para o Claude após precisar corrigir sugestões do modelo Sol múltiplas vezes, destacando a velocidade e a precisão do Claude em encontrar dependências.
- **Risco de segurança em apps gerados por IA** — Relatou-se a publicação do KAPEVault, um gerenciador de senhas para Windows e Android distribuído por alguém com quase zero experiência em codificação usando Claude Code.
- **Microsoft Agent Framework suporta Python 3.15** — A versão 1.22.0 do framework agora suporta Python 3.15, embora algumas dependências upstream ainda apresentem limitações.

## Destaques

### Modelos e pesquisa

#### Jeva introduz modelos System One

A nova arquitetura Jeva introduz modelos System One que diferenciam a ausência de resposta da incerteza entre candidatos, e mantêm a invariância de permutação em conjuntos de alternativas. Isso impede que a simples reordenação de opções altere a decisão, respeitando as quatro exigências estruturais identificadas na própria documentação de lançamento.

Para quem utiliza a extensão Jeva, a mudança exige uma reconfiguração do pipeline de inferência: a camada de decisão passa a incluir um mecanismo de detecção de ausência de resposta, e o algoritmo de agregação atenda à permutação-invariante, o que pode aumentar o custo computacional em até 15% nos lotes maiores.

*[Fonte: Jeva: System One Models from First Principles](https://huggingface.co/papers/2610.18773) · HF Daily Papers · fonte primária*

#### VideoJev para interação visual

A família de modelos VideoJev substitui a decodificação autorregressiva por uma cabeça compartilhada que pontua intervalos temporais e opções textuais contra a evidência de vídeo.

Essa mudança permite que agentes visuais transformem observações de vídeo em decisões tempestivas, usando uma arquitetura que avalia opções textuais em tempo real, reduzindo a dependência de decodificação autoregressiva e potencialmente diminuindo o custo de inferência, embora a eficácia prática ainda dependa da qualidade da pontuação dos intervalos.

*[Fonte: VideoJev: System One Model for Video Understanding and Interaction](https://huggingface.co/papers/2610.18615) · HF Daily Papers · fonte primária*

#### Lançamento do Gemini 4 Argon

O Google disponibilizou o Gemini 4 Argon, seu modelo de fronteira mais recente, para desenvolvedores, empresas, cientistas e consumidores.

A disponibilidade do Gemini 4 Argon pode mudar a escolha de provedor de modelo de linguagem para empresas que resolvem problemas complexos em escala, reduzindo custos e riscos operacionais, mas ainda gera incerteza sobre como a integração afeta a arquitetura de pipelines e a política de preços dos serviços.

*[Fonte: Gemini 4 Argon: Built to solve your hardest problems](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/) · Google AI Blog · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Ineficiência de custo no HydraFusion

Um relato na comunidade r/GithubCopilot descreve uma anomalia no roteador HydraFusion: a ferramenta selecionou o modelo Claude Sonnet 5.5 para executar uma tarefa considerada simples, resultando no consumo de 45 créditos em uma única requisição. O fato, ainda não validado oficialmente, aponta uma falha na heurística de escolha de modelo que ignora a relação custo-benefício da operação solicitada.

Para os usuários da extensão GitHub Copilot, essa falha arquitetônica representa um risco imediato de descontrolo orçamentário, pois a decisão de roteamento pode direcionar cargas leves para modelos avançados e custosos sem aviso prévio.

*[Fonte: what is your honest opinion on this GH Copilot model routing with Hydrafusion](https://www.reddit.com/r/GithubCopilot/comments/1x6dl94/what_is_your_honest_opinion_on_this_gh_copilot/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

#### Implementação de stretchtext no Claude Code

Um desenvolvedor criou o mod cc-stretch para Claude Code, que permite expandir ou encolher dinamicamente o texto das respostas do agente conforme a necessidade do usuário. A instalação é feita via comando /plugin install cc-stretch --marketplace dentro de uma sessão do Claude Code.

O mod reduz em 83% a quantidade de palavras lidas nas respostas, mas mantém a capacidade de expansão sob demanda, evitando que o modelo assuma que o usuário leu o conteúdo oculto. Como a evidência é um relato isolado de usuário, não há confirmação de desempenho estável em diferentes contextos de uso ou impacto real no consumo de tokens da API.

*[Fonte: Turning a crazy idea from 1967 into a Claude Code mod: I now read 83% fewer words from replies](https://www.reddit.com/r/ClaudeCode/comments/1x688sx/turning_a_crazy_idea_from_1967_into_a_claude_code/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### Migração de Codex para Claude

Um usuário relatou ter migrado do Codex para o Claude após precisar corrigir repetidamente as sugestões do modelo Sol, destacando que o Claude encontrou todas as dependências do projeto de forma rápida e precisa. Ele mencionou que, após seis meses afastado por limites de uso ruins, agora percebe que o limite do Claude parece pelo menos dobrado em comparação ao passado.

Para quem usa o Codex em ambientes de desenvolvimento com dependências complexas, essa mudança sugere uma possível redução no tempo gasto em depuração de sugestões incorretas e menor risco de sobrecarga operacional por limites de uso apertados.

*[Fonte: Thank you for all who suggested to try Claude](https://www.reddit.com/r/codex/comments/1x2rqfh/thank_you_for_all_who_suggested_to_try_claude/#community-signals) · Reddit r/codex · sinal da comunidade*

#### Risco de segurança em apps gerados por IA

Usuários com quase nenhuma experiência em desenvolvimento conseguiram publicar aplicativos distribuíveis para Windows e Android que armazenam senhas, códigos de 2FA, chaves de API e identificações governamentais. O projeto KAPEVault demonstra como ferramentas de geração de código permitem que pessoas sem formação técnica liberem software que lida com dados sensíveis, expondo usuários finais a riscos de gerenciamento inadequado de segredos e possíveis extrações de credenciais.

A liberação desse tipo de aplicação aumenta a superfície de ataque para qualquer pessoa que baixe e utilize o software, exigindo auditorias manuais rigorosas em cada componente gerado automaticamente.

*[Fonte: We've reached the point where people with practically zero coding experience are shipping password managers to the public](https://www.reddit.com/r/ClaudeCode/comments/1x68om1/weve_reached_the_point_where_people_with/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### Microsoft Agent Framework suporta Python 3.15

A versão 1.22.0 do Microsoft Agent Framework traz suporte oficial ao Python 3.15 no framework principal e no pacote raiz agent-framework. Esse avanço permite o uso de recursos mais recentes da linguagem, mas a compatibilidade não se estende automaticamente a todos os pacotes, extras ou funcionalidades devido a restrições de dependências upstream. A documentação do release indica que nem todos os componentes foram atualizados para acompanhar essa versão do interpretador.

Para equipes que utilizam extensões ou recursos opcionais, é necessário consultar o README de cada pacote antes de atualizar o ambiente, pois algumas dependências ainda podem apresentar incompatibilidades com o Python 3.15.

*[Fonte: python-1.22.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.22.0) · Microsoft Agent Framework Releases · fonte primária*

## Leitura do conjunto

A transição para arquiteturas 'System One', exemplificada pelos modelos Jeva e VideoJev, busca eliminar a latência da decodificação autorregressiva em favor de decisões estruturadas e invariantes. Essa mudança técnica visa tornar a interação de agentes mais previsível, especialmente em contextos visuais e de tempo real.

Contudo, a operação desses agentes em larga escala apresenta gargalos. Enquanto o GitHub expande a orquestração com HydraFusion e o Google lança o Gemini 4 Argon, usuários reportam ineficiências financeiras no roteamento de modelos do Copilot e riscos de segurança críticos com a distribuição de softwares sensíveis, como gerenciadores de senhas, criados por operadores sem experiência técnica via Claude Code.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">57.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">Claude Sonnet 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:97.2%"></span></span><span class="value">56.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">Muse Wonder Full</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:96.9%"></span></span><span class="value">55.8</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:92.7%"></span></span><span class="value">53.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.5%"></span></span><span class="value">52.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">Gemini 4 Argon</th><td role="cell" class="creator">Google</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.3%"></span></span><span class="value">52.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">Muse Wonder</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.0%"></span></span><span class="value">52.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">GPT-6.1 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:89.9%"></span></span><span class="value">51.8</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">Muse Spark 1.3</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:83.5%"></span></span><span class="value">48.1</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">Grok 4.7</th><td role="cell" class="creator">SpaceXAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.6%"></span></span><span class="value">46.4</span></div></td></tr></tbody>
</table>
<figcaption><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [Jeva: System One Models from First Principles](https://huggingface.co/papers/2610.18773) — HF Daily Papers
2. [VideoJev: System One Model for Video Understanding and Interaction](https://huggingface.co/papers/2610.18615) — HF Daily Papers
3. [Gemini 4 Argon: Built to solve your hardest problems](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/) — Google AI Blog
4. [what is your honest opinion on this GH Copilot model routing with Hydrafusion](https://www.reddit.com/r/GithubCopilot/comments/1x6dl94/what_is_your_honest_opinion_on_this_gh_copilot/#community-signals) — Reddit r/GithubCopilot
5. [Turning a crazy idea from 1967 into a Claude Code mod: I now read 83% fewer words from replies](https://www.reddit.com/r/ClaudeCode/comments/1x688sx/turning_a_crazy_idea_from_1967_into_a_claude_code/#community-signals) — Reddit r/ClaudeCode
6. [Thank you for all who suggested to try Claude](https://www.reddit.com/r/codex/comments/1x2rqfh/thank_you_for_all_who_suggested_to_try_claude/#community-signals) — Reddit r/codex
7. [We've reached the point where people with practically zero coding experience are shipping password managers to the public](https://www.reddit.com/r/ClaudeCode/comments/1x68om1/weve_reached_the_point_where_people_with/#community-signals) — Reddit r/ClaudeCode
8. [python-1.22.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.22.0) — Microsoft Agent Framework Releases

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-15.*
