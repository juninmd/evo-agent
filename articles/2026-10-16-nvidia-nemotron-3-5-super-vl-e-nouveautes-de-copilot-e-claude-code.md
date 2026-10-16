---
layout: article
title: "NVIDIA Nemotron 3.5 Super VL e Nouveautés de Copilot e Claude Code"
date: "2026-10-16"
tags: ["openrouter", "hf-daily-papers", "github", "copilot-cli", "reddit", "launched-1792076662", "launched-1792030434", "papers", "research", "copilot"]
summary: "A nova geração multimodal da NVIDIA amplia o limite de contexto enquanto o GitHub Copilot ganha suporte multi‑repo e o Claude Code revela comportamentos de sessão mais agressivos. Nove anúncios e relatos de usuários ilustram a evolução do ecossistema de agentes."
reading_time: 11
---

{% raw %}
# NVIDIA Nemotron 3.5 Super VL e Nouveautés de Copilot e Claude Code

**Período analisado:** 14/10/2026 a 16/10/2026 · 10 pautas · 6 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Nemotron 3.5 Super VL suporta 1 M tokens** — NVIDIA lançou o Nemotron 3.5 Super VL com 12B parâmetros ativos em um modelo 120B, capaz de lidar com 1 M tokens de contexto e multimodalidade avançada.
- **Any Time, Any Space garante consistência de vídeo** — O framework ATAS transforma roteiros em requisições de shot com referência explícita de localização, câmera e tempo.
- **Player‑1 traz agentes para jogos visuais** — O Player‑1 demonstra agentes capazes de usar teclado e mouse em jogos com mecânicas visualmente ricas, ainda que a cobertura de estados dinâmicos seja limitada.
- **Copilot em Slack e Teams suporta múltiplos repositórios** — A funcionalidade de multi‑repo foi adicionada, permitindo trabalhar em conversas com mais de um repositório simultaneamente.
- **Copilot CLI 1.0.99‑2 corrige falhas de sandbox Linux** — A nova versão incorpora anúncio de configurações de modelo gerenciadas, busca semântica de código por padrão e melhora a confiabilidade de comandos sandboxed.
- **Muse Spark Open foca em workflows de codificação** — Muse Spark Open, um modelo de código aberto otimizado para codificação, foi anunciado com 1 048 576 tokens de contexto e alta precisão em primeira tentativa.
- **VS Code permite dois perfis Claude ao mesmo tempo** — Usuário relata que agora é possível manter dois projetos rodando simultaneamente com diferentes contas Claude, exigindo novo fluxo de login.
- **Bug de caminho WSL no Copilot gera citações erradas** — O Copilot usando o harness padrão cria links com barras invertidas que não funcionam em WSL, dificultando a abertura direta em VS Code.
- **Limit de sessão do Claude Code reduzido dramaticamente** — Usuários relatam que o cache de prompt passa de 1 h para 5 min após ultrapassar o limite de uso, acelerando o esgotamento de créditos.
- **Tibo da Codex mostra número de postagens reduzido** — Tibo, profissional da Codex, afirma que o volume de postagens caiu, sugerindo uma possível limitação de capacidade ou mudanças internas.

## Destaques

### Modelos e pesquisa

#### Nemotron 3.5 Super VL suporta 1 M tokens

NVIDIA lançou o Nemotron 3.5 Super VL, um modelo multimodal de mistura de especialistas com 12 bilhões de parâmetros ativos de um total de 120 bilhões, capaz de processar até 1.048.576 tokens de contexto. O modelo aceita texto, imagens, documentos, capturas de tela de interface e vídeo como entrada.

Quem opera pipelines de geração multimodal precisa de mais memória RAM para carregar o modelo completo e gerenciar sequências longas, mas ainda não há dados públicos sobre o consumo exato de VRAM em carga de trabalho real. A arquitetura permite entradas maiores, porém a eficiência dos especialistas ativados por token varia conforme a modalidade, o que deixa em aberto o trade-off entre precisão e latência em uso prolongado.

*[Fonte: NVIDIA: Nemotron 3.5 Super VL](https://openrouter.ai/nvidia/nemotron-3.5-super-vl) · OpenRouter: New Models · fonte primária*

#### Muse Spark Open foca em workflows de codificação

Muse Spark Open foi anunciado como um modelo de código aberto otimizado para workflows de codificação, com capacidade de 1 048 576 tokens de contexto e alta precisão na primeira tentativa de geração ou correção de código. Ele foi treinado especificamente para auxiliar agentes que interagem com repositórios, melhorando a compreensão de bases de código extensas.

Para desenvolvedores que utilizam agentes de IA em ambientes de produção, isso reduz o risco de introduzir bugs durante alterações automáticas, aumentando a confiabilidade das integrações.

*[Fonte: Meta: Muse Spark Open](https://openrouter.ai/meta/muse-spark-open) · OpenRouter: New Models · fonte primária*

### Engenharia e ecossistema

#### Any Time, Any Space garante consistência de vídeo

O framework Any Time, Any Space transforma roteiros em requisições de cenas com referências explícitas de localização, câmera e tempo. A solução substitui a passagem de comandos ou quadros recentes por um sistema centrado no estado do mundo para garantir a consistência espacial e temporal entre solicitações não consecutivas.

Essa arquitetura de controle permite que desenvolvedores de vídeo generativo re-renderizem cenas e recuperem eventos anteriores com confiabilidade, eliminando a repetição de conteúdo. A evidência não detalha a eficiência do processo de recuperação de dados antes da geração.

*[Fonte: Any Time, Any Space: A World-State-Centric Framework for Agentic Video Generation](https://huggingface.co/papers/2610.20571) · HF Daily Papers · fonte primária*

#### Player‑1 traz agentes para jogos visuais

O Player‑1 demonstra agentes treinados em experiências sintéticas capazes de controlar teclado e mouse em jogos visualmente complexos, marcando um avanço na aplicação prática de controle digital multimídia. A evidência oficial destaca que a cobertura de estados dinâmicos permanece limitada, o que indica um protótipo funcional ainda restrito a cenários específicos e não uma solução pronta para ambientes completamente imprevisíveis.

*[Fonte: Player-1: Learning to Play from Synthetic Experience](https://huggingface.co/papers/2610.20584) · HF Daily Papers · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Copilot em Slack e Teams suporta múltiplos repositórios

O GitHub Copilot em Slack e Microsoft Teams agora suporta multi‑repo, permitindo que a extensão acesse vários repositórios em uma única conversa. Isso foi confirmado no registro oficial de lançamento do GitHub, onde a opção foi descrita como “work across multiple repositories in a single conversation”.

Para equipes que mantêm infraestruturas distribuídas, a nova capacidade reduz a fricção na colaboração, eliminando a necessidade de alternar contextos entre canais ou abrir múltiplas abas. Contudo, a evidência não indica se há limitações de tamanho de repositório ou controle de acesso granular, deixando em aberto possíveis restrições de desempenho em ambientes com dezenas de repositórios ativos ao mesmo tempo.

*[Fonte: Multi-repo support and other improvements for GitHub Copilot in Slack and Microsoft Teams](https://github.blog/changelog/2026-10-15-copilot-in-slack-and-teams-adds-model-and-repository-updates) · GitHub Changelog · fonte primária*

#### Copilot CLI 1.0.99‑2 corrige falhas de sandbox Linux

A versão 1.0.99-2 do Copilot CLI adiciona um aviso claro quando as configurações de modelo definidas por administrador substituem a escolha do usuário. Ativa por padrão a busca semântica de código em sessões online. Corrige falhas intermitentes de inicialização de comandos sandboxed no Linux, evitando loops de loopback durante a configuração.

Isso reduz o risco de falhas inesperadas em ambientes controlados, como pipelines de CI/CD ou terminais corporativos, onde a confiabilidade do sandbox é crítica para segurança. Ainda não há dados sobre o impacto em uso prolongado ou em cargas de trabalho variáveis, deixando em aberto a necessidade de validação em cenários de alta disponibilidade.

*[Fonte: 1.0.99-2](https://github.com/github/copilot-cli/releases/tag/v1.0.99-2) · Copilot CLI Releases · fonte primária*

#### VS Code permite dois perfis Claude ao mesmo tempo

Um usuário relata que agora é possível usar VS Code com duas contas Claude distintas em projetos diferentes, permitindo execução paralela sem conflito. A informação vem de um relato isolado no Reddit, sem confirmação técnica ou replicação por outros usuários. A prática exigiria configurações separadas de autenticação, possivelmente via variáveis de ambiente ou perfis de extensão distintos.

Para quem gerencia ambientes com controle de acesso rígido, isso pode reduzir o risco de vazamento de credenciais entre projetos ao isolar tokens por conta.

*[Fonte: Want to use VS Code with 2 different Claude accounts...](https://www.reddit.com/r/vscode/comments/1x6lctb/want_to_use_vs_code_with_2_different_claude/#community-signals) · Reddit r/vscode · sinal da comunidade*

#### Bug de caminho WSL no Copilot gera citações erradas

Um usuário relatou no Reddit que o Copilot gera links para caminhos `WSL` com barras invertidas após a mudança para o `harness` padrão no VS Code. O problema impede a abertura direta de arquivos clicando nas citações do chat, falha que não ocorria na versão anterior da ferramenta.

Desenvolvedores que utilizam o subsistema Linux no Windows enfrentam interrupções no fluxo de trabalho e riscos de erros de compilação por caminhos inválidos. Como a evidência se resume a um relato individual, ainda não há confirmação se a falha afeta todos os usuários da extensão ou se é um caso isolado de configuração.

*[Fonte: Please fix the backslash bug in WSL paths im VS Code](https://www.reddit.com/r/GithubCopilot/comments/1x71gzg/please_fix_the_backslash_bug_in_wsl_paths_im_vs/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

#### Limit de sessão do Claude Code reduzido dramaticamente

Os usuários do plano 20X relatam que o cache de prompt colapsa de uma hora para cinco minutos imediatamente após o limite de uso ser ultrapassado, acelerando drasticamente o esgotamento de créditos. Essa mudança repentina, ainda não confirmada oficialmente, transforma a experiência de sessões prolongadas em uma corrida contra o tempo, onde o modelo perde o contexto rapidamente e exige reinícios frequentes. A consequência prática concreta para quem opera projetos de longo prazo com Claude Code é a necessidade imediata de fragmentar o trabalho em blocos menores e mais aislados, o que fragmenta a arquitetura do código e aumenta o risco de inconsistências entre as partes.

*[Fonte: Anyone else feel like their session limits are decreasing faster](https://www.reddit.com/r/ClaudeCode/comments/1x6p448/anyone_else_feel_like_their_session_limits_are/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### Tibo da Codex mostra número de postagens reduzido

Tibo, desenvolvedor da Codex, relatou em r/codex que seu volume de postagens caiu para uma ou duas vezes por dia, contrastando com sua habitual frequência diária de comentários e vão de hype. Ele questiona se a equipe percebe as reclamações de usuários e está trabalhando nas correções ou se o sistema está “trancando” para melhorar o modelo atual. O relato não confirma por enquadramento e permanece como observação no momento.

A redução do fluxo de posts pode indicar restrições na infraestrutura da codificação ou ajustes de treinamento do modelo.

*[Fonte: Is open ai actually struggling? Tibo's behavior suggests that..](https://www.reddit.com/r/codex/comments/1x66u5c/is_open_ai_actually_struggling_tibos_behavior/#community-signals) · Reddit r/codex · sinal da comunidade*

## Leitura do conjunto

Neste intervalo, a NVIDIA apresenta o Nemotron 3.5 Super VL, um modelo multimodal com 1 M tokens de contexto, que posiciona a empresa na vanguarda dos processadores de linguagem estendida. Enquanto isso, a Atlântida de algoritmos de vídeo avança com o ATAS, resolvendo problemas de coerência em geração sequencial. O surgimento de agentes mais robustos, como o Player‑1 e o Muse Spark Open, expande o armamento de código aberto para os desenvolvedores que precisam de ambientes seguros e de baixo risco. Paralelamente, o GitHub Copilot consolida a experiência colaborativa, adicionando suporte multi‑repo em Slack e Teams e refinando seu CLI para garantir execuções sandboxed confiáveis. No canto da comunidade, o VS Code demonstra a necessidade de múltiplos perfis Claude, enquanto o bug de caminho WSL e a redução abrupta do limite de sessão no Claude Code signalam desafios operacionais que impactam o orçamento e a adoção. A Montanha de Tibo da Codex, observador ativo, confirma que a queda na frequência de publicações pode refletir ajustes de capacidade. Juntos, esses acontecimentos delineiam um ecossistema onde novas capacidades são rapidamente introduzidas, mas também surgem requisitos de controle de risco, gestão de custos, e de confiança nas operações de agente.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">57.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">Claude Sonnet 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:97.2%"></span></span><span class="value">56.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">Muse Wonder Full</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:96.9%"></span></span><span class="value">55.8</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:92.7%"></span></span><span class="value">53.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.5%"></span></span><span class="value">52.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">Gemini 4 Argon</th><td role="cell" class="creator">Google</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.3%"></span></span><span class="value">52.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">Muse Wonder</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.0%"></span></span><span class="value">52.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">GPT-6.1 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:89.9%"></span></span><span class="value">51.8</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">Grok 4.7</th><td role="cell" class="creator">SpaceXAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.6%"></span></span><span class="value">46.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">MiMo-V2.6-Pro <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span></th><td role="cell" class="creator">Xiaomi</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.4%"></span></span><span class="value">46.3</span></div></td></tr></tbody>
</table>
<figcaption><span class="legend-open">Pesos abertos</span><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [NVIDIA: Nemotron 3.5 Super VL](https://openrouter.ai/nvidia/nemotron-3.5-super-vl) — OpenRouter: New Models
2. [Any Time, Any Space: A World-State-Centric Framework for Agentic Video Generation](https://huggingface.co/papers/2610.20571) — HF Daily Papers
3. [Player-1: Learning to Play from Synthetic Experience](https://huggingface.co/papers/2610.20584) — HF Daily Papers
4. [Multi-repo support and other improvements for GitHub Copilot in Slack and Microsoft Teams](https://github.blog/changelog/2026-10-15-copilot-in-slack-and-teams-adds-model-and-repository-updates) — GitHub Changelog
5. [1.0.99-2](https://github.com/github/copilot-cli/releases/tag/v1.0.99-2) — Copilot CLI Releases
6. [Meta: Muse Spark Open](https://openrouter.ai/meta/muse-spark-open) — OpenRouter: New Models
7. [Want to use VS Code with 2 different Claude accounts...](https://www.reddit.com/r/vscode/comments/1x6lctb/want_to_use_vs_code_with_2_different_claude/#community-signals) — Reddit r/vscode
8. [Please fix the backslash bug in WSL paths im VS Code](https://www.reddit.com/r/GithubCopilot/comments/1x71gzg/please_fix_the_backslash_bug_in_wsl_paths_im_vs/#community-signals) — Reddit r/GithubCopilot
9. [Anyone else feel like their session limits are decreasing faster](https://www.reddit.com/r/ClaudeCode/comments/1x6p448/anyone_else_feel_like_their_session_limits_are/#community-signals) — Reddit r/ClaudeCode
10. [Is open ai actually struggling? Tibo's behavior suggests that..](https://www.reddit.com/r/codex/comments/1x66u5c/is_open_ai_actually_struggling_tibos_behavior/#community-signals) — Reddit r/codex

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-16.*
