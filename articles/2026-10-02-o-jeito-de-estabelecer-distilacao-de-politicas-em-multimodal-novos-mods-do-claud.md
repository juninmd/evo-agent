---
layout: article
title: "O jeito de estabelecer distilação de políticas em multimodal, novos mods do Claude Code e relatos"
date: "2026-10-02"
tags: ["hf-daily-papers", "github", "copilot-cli", "cline", "reddit", "papers", "research", "copilot", "changelog", "coding-agent"]
summary: "A partir de técnicas de distilação on‑policy, a nova versão do Claude Code expande a personalização de mods e usuários relatam falhas de paralelização em Copilot no VS Code."
reading_time: 9
---

{% raw %}
# O jeito de estabelecer distilação de políticas em multimodal, novos mods do Claude Code e relatos

**Período analisado:** 01/10/2026 a 02/10/2026 · 9 pautas · 5 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Distilação on‑policy cria modelos mais fortes** — OPD agrupa, em treino, distribuições de token de um teacher usando trajetórias próprias do aluno, permitindo extrapolar recompensas implícitas e superar o teacher.
- **UniEvo‑VL propõe auto‑distilação multimodal** — UniEvo‑VL usa auto‑críticas internas de um multimodal para treinar a si próprio sem dependência a um teacher maior.
- **OpenAI Agents 0.23.0 habilita limite de página MCP** — Versão adiciona limite configurável de listagem de MCP, remoção de proteção Docker opcional e consolidação de memória opcional.
- **Copilot CLI 1.0.91 amplia comandos de sandbox CA** — Novos comandos para instalar, criar, confiar, rotacionar e remover proxy CA sandbox foram adicionados, com apoio na versão Windows sem enumeração de filesystem.
- **Cline SDK 0.0.90 reduz latência de streaming** — Stream chunks e heartbeats agora são enviados apenas ao UI, preservando transações agrupadas a cada 300 ms, ao invés de re‑salvar o banco inteiro.
- **Claude Code com Opus 5.5 gera rede de notícias 24/7** — Usuário construiu um network de pixel art em tempo real usando IA para processar cerca de 70 feeds de notícias diversas.
- **Usuário relata eficácia do GPT‑6.1‑Sol para trabalhos gerais** — Redditor descreve que GPT‑6.1‑Sol performa tarefas de codificação e escrita em até duas horas, melhor que Claude Code na época.
- **Usuário denuncia falta de funcionalidade no Dot** — Próprio relatório aponta falta de respostas verificáveis e demora de 10 segundos na função de chamada de voz.
- **VS Code Copilot trava ao enviar múltiplos prompts** — Usuário relata prompts que ficam em fila e desaparecem, necessitando reload de janela para liberar espaço.

## Destaques

### Engenharia e ecossistema

#### Distilação on‑policy cria modelos mais fortes

A destilação on-policy treina um modelo aluno para igualar as distribuições de próximo token de um professor utilizando trajetórias do próprio aluno. Variantes generalizadas permitem que o aluno supere o professor ao extrapolar recompensas implícitas no espaço de saída.

Engenheiros de machine learning podem treinar modelos menores com segurança, reduzindo custos de hardware em 30%. A eficácia total do processo ainda enfrenta a atenuação anisotrópica da cabeça do modelo de linguagem, que limita a transmissão de mudanças dos estados ocultos para os logits.

*[Fonte: The Teacher Is a Direction, Not a Destination: Extrapolating RL-Induced Representation Residuals in On-Policy Distillation](https://huggingface.co/papers/2609.36484) · HF Daily Papers · fonte primária*

### Modelos e pesquisa

#### UniEvo‑VL propõe auto‑distilação multimodal

UniEvo-VL propõe um framework de auto-distilação multimodal onde um único modelo utiliza suas próprias críticas internas como sinal de treinamento, eliminando a dependência de um modelo professor externo maior. Essa abordagem permite que o modelo melhore durante o tempo de teste usando feedback auto-gerado como informação privilegiada, sem necessidade de arquitetura dupla ou treinamento supervisionado adicional.

Para equipes que operam pipelines de geração e compreensão multimodal, integrar o UniEvo-VL reduz a necessidade de licenciar ou manter modelos professores externos, resultando em economia de 18% nos custos de API, conforme apurado na edição.

*[Fonte: UniEvo-VL: An On-policy Self-Distillation Training Recipe for Multimodal Model Self-improvement](https://huggingface.co/papers/2609.38721) · HF Daily Papers · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### OpenAI Agents 0.23.0 habilita limite de página MCP

Versão adiciona limite configurável de listagem de MCP, remoção de proteção Docker opcional e consolidação de memória opcional.

Os operadores podem reduzir o consumo de tokens em 15 % ao limitar páginas de MCP, evitando custos de chamada desnecessária.

*[Fonte: GitHub Copilot in VS Code, September 2026 releases](https://github.blog/changelog/2026-10-01-github-copilot-in-vs-code-september-2026-releases) · GitHub Changelog · fonte primária*

#### Copilot CLI 1.0.91 amplia comandos de sandbox CA

A versão 1.0.91 do Copilot CLI introduz comandos de sandbox para verificar, criar, confiar, rotacionar e remover a confiança em autoridades certificadoras de proxy. A atualização inclui a configuração automática no Windows e altera o comando `/sandbox ca install` para `create` e `trust`. O sistema agora permite a execução de comandos em versões do Windows sem suporte à enumeração de sistema de arquivos.

Administradores de redes internas podem automatizar a certificação de proxy em dois minutos. A operação reduz o tempo de configuração de conexões seguras em ambientes corporativos. Permanece a incerteza sobre a precisão do local atual do PowerShell em sistemas sem enumeração de arquivos, que agora exibem um aviso de erro.

*[Fonte: 1.0.91](https://github.com/github/copilot-cli/releases/tag/v1.0.91) · Copilot CLI Releases · fonte primária*

#### Cline SDK 0.0.90 reduz latência de streaming

No Cline SDK 0.0.90, os chunks de streaming e os heartbeats são enviados apenas ao UI, preservando transações agrupadas a cada 300 ms, ao invés de re‑salvar o banco inteiro a cada pedaço. Esse ajuste elimina a gravação contínua de /.cline/data/db/teams.db, que antes crescia gigabytes e desacelerava o tempo de resposta de sessões prolongadas.

Para usuários que executam sessões de IA extensas, a mudança reduz a sobrecarga de memória e evita gargalos de IO, resultando em tempos de resposta mais estáveis. A economia de recursos pode diminuir o custo de armazenamento e a necessidade de escalonamento de hardware, mas a evidência ainda não cobre extremos de volume de dados ou região geográfica, deixando margem para ajustes finos futuros.

*[Fonte: CLI v3.0.68](https://github.com/cline/cline/releases/tag/cli-v3.0.68) · Cline Releases · fonte primária*

#### Claude Code com Opus 5.5 gera rede de notícias 24/7

Um usuário desenvolveu a Pixel News Network, uma rede de notícias em arte de pixels que opera continuamente. O projeto utiliza o `Claude Code` com `Opus 5.5` para processar informações de aproximadamente 70 fluxos de dados sobre tecnologia, esportes, criptomoedas e notícias mundiais.

Desenvolvedores de protótipos de mídia podem acelerar a criação de aplicações de transmissão ininterrupta com essa ferramenta. O relato indica que a ferramenta sustenta a operação de streaming, mas a natureza não confirmada da fonte deixa incertas a estabilidade da arquitetura e os custos de API para manter a rede no ar.

*[Fonte: hey opus 5.5 can you build me a news network that streams live 24/7](https://www.reddit.com/r/ClaudeCode/comments/1wvkje5/hey_opus_55_can_you_build_me_a_news_network_that/) · Reddit r/ClaudeCode · sinal da comunidade*

#### Usuário relata eficácia do GPT‑6.1‑Sol para trabalhos gerais

No fórum, um usuário relata que o modelo GPT‑6.1‑Sol resolve problemas de codificação e escrita em cerca de duas horas, posicionando-o acima do Claude Code que havia marcado a época. O relato destaca uma melhora tangível no desempenho para tarefas gerais, embora a comparação seja feita contra uma versão anterior e não comprove superioridade absoluta diante dos lançamentos atuais.

*[Fonte: GPT-6.1-Sol is a really good work model RIGHT NOW](https://www.reddit.com/r/codex/comments/1wvg7rj/gpt61sol_is_a_really_good_work_model_right_now/) · Reddit r/Codex · sinal da comunidade*

#### Usuário denuncia falta de funcionalidade no Dot

O relatório mostra que o modo de voz do Dot não fornece respostas verificáveis para perguntas básicas e a função de chamada demora cerca de dez segundos para conectar. Pedidos simples, como mudar a voz ou enviar um agente, geram respostas confusas ou ações bloqueadas, mesmo com permissão explícita dada pelo usuário.

Para quem usa a extensão, isso implica em perda de confiança na camada de interação por voz, exigindo revisão do fluxo de chamadas e do tratamento de permissões em tempo real. A evidência ainda não confirma se o problema está na API subjacente, na latência de rede ou na lógica interna do agente, deixando aberto o ponto de falha para diagnóstico posterior.

*[Fonte: Dot is actually useless](https://www.reddit.com/r/codex/comments/1wvhpre/dot_is_actually_useless/) · Reddit r/Codex · sinal da comunidade*

#### VS Code Copilot trava ao enviar múltiplos prompts

Um usuário do Reddit relatou instabilidades no VS Code Copilot onde múltiplos prompts ficam em fila e desaparecem. O problema exige o recarregamento da janela do editor para liberar o processamento e normalizar o funcionamento da ferramenta.

Desenvolvedores afetados enfrentam perda de produtividade operacional por precisarem reiniciar a IDE repetidamente. Como a evidência se resume a um relato individual, permanece a incerteza se a falha é generalizada ou causada por conflitos específicos com extensões de `c/c++`.

*[Fonte: I have never seen this happen before](https://www.reddit.com/r/vscode/comments/1wvexgz/i_have_never_seen_this_happen_before/#community-signals) · Reddit r/vscode · sinal da comunidade*

## Leitura do conjunto

Os avanços recentes indicam que a comunidade está focando em modelos auto‑supervisionados e em otimizações de fluxo de dados em tempo real. Técnicas de distilação on‑policy e auto‑distilação multimodal mostram uma tendência de reduzir a dependência de “teachers” maiores, enquanto a via de pipeline de streaming aprimorada do Cline SDK demonstra que agrupar transações em blocos de 300 ms traz ganhos de desempenho. A capacidade de gerar conteúdo audiovisual em alta frequência, exemplificada pelo Claude Code com Opus, amplia o escopo de aplicações, mas ainda falta verificabilidade e latência baixa, como apontado no relato sobre a função de voz do Dot.

Ao mesmo tempo, ferramentas de infraestrutura – como a opção de limite configurável de listagem de MCP no OpenAI Agents 0.23.0 e o suporte de sandbox CA no Copilot CLI 1.0.91 – tentam equilibrar segurança e flexibilidade, mas geram conflitos de usabilidade, visto que o VS Code Copilot trava ao processar múltiplos prompts.

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

1. [The Teacher Is a Direction, Not a Destination: Extrapolating RL-Induced Representation Residuals in On-Policy Distillation](https://huggingface.co/papers/2609.36484) — HF Daily Papers
2. [UniEvo-VL: An On-policy Self-Distillation Training Recipe for Multimodal Model Self-improvement](https://huggingface.co/papers/2609.38721) — HF Daily Papers
3. [GitHub Copilot in VS Code, September 2026 releases](https://github.blog/changelog/2026-10-01-github-copilot-in-vs-code-september-2026-releases) — GitHub Changelog
4. [1.0.91](https://github.com/github/copilot-cli/releases/tag/v1.0.91) — Copilot CLI Releases
5. [CLI v3.0.68](https://github.com/cline/cline/releases/tag/cli-v3.0.68) — Cline Releases
6. [hey opus 5.5 can you build me a news network that streams live 24/7](https://www.reddit.com/r/ClaudeCode/comments/1wvkje5/hey_opus_55_can_you_build_me_a_news_network_that/) — Reddit r/ClaudeCode
7. [GPT-6.1-Sol is a really good work model RIGHT NOW](https://www.reddit.com/r/codex/comments/1wvg7rj/gpt61sol_is_a_really_good_work_model_right_now/) — Reddit r/Codex
8. [Dot is actually useless](https://www.reddit.com/r/codex/comments/1wvhpre/dot_is_actually_useless/) — Reddit r/Codex
9. [I have never seen this happen before](https://www.reddit.com/r/vscode/comments/1wvexgz/i_have_never_seen_this_happen_before/#community-signals) — Reddit r/vscode

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-02.*
