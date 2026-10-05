---
layout: article
title: "Ollama 0.40.0 adota MLX padrão no Apple Silicon; Copilot CLI 1.0.92-4 melhora MCP e config"
date: "2026-10-05"
tags: ["ollama", "copilot-cli", "openai", "reddit", "marktechpost", "arxiv-csse", "tabnews", "github-trending", "local-ai", "copilot"]
summary: "Ollama muda runtime padrão para MLX em Macs com Apple Silicon e expande suporte a Qwen 3.8. Copilot CLI ganha subcomandos de configuração e corrige travamento em conexões HTTP+SSE legadas."
reading_time: 19
---

{% raw %}
# Ollama 0.40.0 adota MLX padrão no Apple Silicon; Copilot CLI 1.0.92-4 melhora MCP e config

**Período analisado:** 04/10/2026 a 05/10/2026 · 19 pautas · 4 fontes primárias · 9 sinais da comunidade

## Em 30 segundos

- **Ollama 0.40.0 roda modelos em MLX por padrão no Apple Silicon** — A versão 0.40.0 do Ollama faz com que arquiteturas suportadas pelo runtime MLX executem automaticamente via MLX em dispositivos Apple Silicon, incluindo modelos como qwen3.8…
- **Copilot CLI 1.0.92-4 adiciona gerenciamento de config e corrige MCP legacy** — A versão 1.0.92-4 introduz subcomandos 'copilot config' para listar, ler, definir e remover configurações, melhora inicialização extraindo pacote CLI em processo filho, aprimora…
- **Ollama 0.40.0-rc1 alinha tokenizador MLX à semântica do publisher** — O release candidate 1 da versão 0.40.0 corrige o tokenizador MLX para honrar ordem de estágios do pré-tokenizador, comportamento de split, fronteiras Unicode e adiciona casos de…
- **OpenAI lança formato visual de anúncios no ChatGPT com ferramentas de medição** — OpenAI introduz novo formato visual de publicidade no ChatGPT e expande ferramentas de medição, parcerias de atribuição e adequação de marca para anunciantes.
- **Usuário Copilot Pro+ com 2k créditos/mês busca otimizar ROI com GPT-6 Luna** — Relato no Reddit de assinante com plano de 2.000 créditos mensais questiona se seleção explícita de GPT-6 Luna supera modo 'auto, efficiency' para automações diárias como geração…
- **Klarion: scanner de segredos em duas etapas reduz alertas em 61k arquivos** — Desenvolvedor apresenta Klarion, scanner que combina 81 regras regex + entropia Rényi normalizada e validação por modelo de IA; em testes com Spring Boot, Terraform, Next.js e…
- **Nova UI do Copilot no VS Code quebra fluxo de diff por arquivo** — Atualização recente remove contagem de linhas alteradas por arquivo, botões Keep/Undo por mudança, e expande todos os arquivos verticalmente empilhados, dificultando navegação em…
- **Configurações do Copilot CLI não migram para Copilot SDK Agent no VS Code** — Usuário pergunta se subagents configurados no Copilot CLI (terminal externo) surtem efeito no novo harness 'Copilot SDK Agent' do VS Code; não há UI para alterar essas…
- **Copilot Pro+ de 7.000 créditos: dúvidas sobre alcance com Opus 5.5 e Sol 6.1** — Assinante Pro+ com 7.000 créditos/mês questiona quantas interações suporta usando modelos Opus 5.5 medium e 6.1 sol high, comparando com limites de horas de Claude/Codex.
- **isolate: VMs Linux descartáveis para Claude Code e Codex no Apple Silicon** — Ferramenta 'iso' roda Claude Code e Codex em VMs Linux efêmeras no macOS 27+ com Docker, git, compiladores; chaves de API ficam no host via proxy Swift; revisão de mudanças via…
- **Claude Code: banco de dados supera markdown para memória de agente** — Relato no r/ClaudeCode defende dar ao agente acesso direto a banco (SQLite, Jira, Linear) em vez de arquivos markdown; argumenta que ferramentas de ticketing persistem contexto e…
- **Codex economiza 30 horas de crunch; noiva reage: 'vou ficar rica'** — Usuário do r/codex demonstra habilidades de agente para noiva que usava ChatGPT web manual ($20/mês); automação elimina copiar/colar e reduz tarefa de 30h para minutos, gerando…
- **História do Qwen: de 7B a 2.4T parâmetros open-weight** — Linha do tempo documenta evolução do Qwen da Alibaba: chatbot restrito em abril 2023 até modelo open-weight de 2.4 trilhões de parâmetros em agosto 2026, com mudanças de licença a…
- **Aleph Alpha lança Kolibri: MoE 78.1B com 3.46B ativos e contexto 1M** — Kolibri é modelo Mixture-of-Experts inglês-alemão com 78.1B parâmetros totais, apenas 3.46B ativos por token, contexto de 1M tokens, pesos Apache 2.0 FP8 rodando em único…
- **BISCEPTER: bissecção probabilística para regressão em larga escala** — Paper arXiv:2610.02995 propõe BISCEPTER, substituição da bissecção por mediana por seleção baseada em probabilidade de cada commit ser o BIC (bug-inducing commit), superando…
- **GTDD: teste gerativo adversarial para agentes de codificação** — Paper arXiv:2610.02952 propõe Generative Test-Driven Development onde agente de teste gera novos inputs após cada implementação, expondo lacunas que suítes fixas deixam passar.
- **Font Finder AI: identificador de fontes gratuito roda no Edge via visão computacional** — Projeto TabNews descreve identificador de tipografia por imagem que processa visão computacional no navegador (Edge) sem paywall: normalização de contraste, binarização de…
- **claude-mem: contexto persistente cross-session para qualquer agente** — Projeto TypeScript com 96k estrelas captura atividade do agente, comprime com IA e injeta contexto relevante em sessões futuras; compatível com Claude Code, OpenClaw, Codex…
- **Claude Code atinge 149k estrelas como ferramenta agentic de terminal** — Repositório oficial do Claude Code (TypeScript) descreve ferramenta que vive no terminal, entende codebase, executa tarefas rotineiras, explica código complexo e gerencia fluxos…

## Destaques

### Infraestrutura e eficiência

#### Ollama 0.40.0 roda modelos em MLX por padrão no Apple Silicon

A versão 0.40.0 do Ollama faz com que modelos suportados pelo runtime MLX sejam executados automaticamente em dispositivos Apple Silicon, incluindo qwen3.8, gemma4, qwen3.6, qwen3.5 e modelos de decisão Nimble, tev1, clef e clef-flash. O comando `ollama run qwen3.8` passa a usar o MLX sem configuração adicional.

Para engenheiros que operam em Macs M‑series, a inferência nativa traz latência mais baixa e uso reduzido de memória unificada, eliminando a necessidade de ajustar parâmetros de desempenho. Contudo, a adoção só se consolida quando todos os modelos desejados forem portada completos ao MLX, o que ainda está em fase de testes de expansão.

*[Fonte: v0.40.0](https://github.com/ollama/ollama/releases/tag/v0.40.0-rc3) · Ollama Releases · fonte primária*

#### Ollama 0.40.0-rc1 alinha tokenizador MLX à semântica do publisher

O release candidate 1 da versão 0.40.0 do Ollama corrige o tokenizador MLX para honrar a ordem dos estágios do pré‑tokenizador, o comportamento de split, as fronteiras Unicode e incorpora casos de referência compartilhados em Go e Python usando tokenizadores publicados.

Essa alteração garante que a tokenização realizada pelo proxy MLX será idêntica àquela dos modelos oficiais, eliminando divergências sutis em benchmarks e pipelines de avaliação. Assim, equipes que integram o Ollama em fluxos de inferência ou treinamento podem confiar que as métricas obtidas localmente refletirão as mesmas do ambiente de produção, reduzindo o risco de discrepâncias inesperadas nas métricas de performance.

*[Fonte: v0.40.0-rc1: mlx: match publisher tokenizer semantics (#18779)](https://github.com/ollama/ollama/releases/tag/v0.40.0-rc1) · Ollama Releases · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Copilot CLI 1.0.92-4 adiciona gerenciamento de config e corrige MCP legacy

A versão 1.0.92‑4 do Copilot CLI introduz os subcomandos `copilot config` para listar, ler, definir e remover configurações, extrai o pacote CLI em um processo filho, melhora a responsividade ao conectar múltiplos servidores MCP e corrige o travamento indefinido em conexões HTTP+SSE legadas quando um POST não é reconhecido. A correção limita o atraso ao tempo de espera configurado pelo servidor.

Para equipes que operam vários servidores MCP, a inicialização mais rápida e a estabilidade aumentada reduzem o tempo de inatividade e simplificam a automação por meio do novo agrupamento de configurações via CLI, diminuindo a necessidade de scripts customizados.

*[Fonte: 1.0.92-4](https://github.com/github/copilot-cli/releases/tag/v1.0.92-4) · Copilot CLI Releases · fonte primária*

#### Usuário Copilot Pro+ com 2k créditos/mês busca otimizar ROI com GPT-6 Luna

Assinante do Copilot Pro+ com cota mensal de 2.000 créditos questiona no Reddit se fixar o modelo GPT-6 Luna na seleção manual rende melhor custo-benefício que o modo `auto, efficiency` para automações rotineiras, como geração de testes unitários. O relato busca reduzir em cerca de 10% o consumo por tarefa para esticar o orçamento fixo do plano.

A escolha entre roteamento automático e seleção explícita altera diretamente o custo em tokens por execução, exigindo medição real de consumo por tipo de tarefa para evitar estouro da cota antes do fim do ciclo. A evidência é um relato individual não confirmado; não há benchmarks públicos que validem ganho consistente do Luna sobre o modo automático para esse perfil de uso.

*[Fonte: Most cost effective with highest ROI?](https://www.reddit.com/r/GithubCopilot/comments/1wxbqa7/most_cost_effective_with_highest_roi/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Nova UI do Copilot no VS Code quebra fluxo de diff por arquivo

A atualização recente da UI do Copilot no VS Code removeu a contagem de linhas alteradas por arquivo, os botões Keep/Undo por mudança e passa a abrir todos os arquivos expandidos em uma pilha vertical, dificultando a navegação em pull requests com muitos arquivos. Essa mudança afeta diretamente o fluxo de revisão linha por linha que dependia da interface anterior.

Para desenvolvedores que revisam sugestões do Copilot arquivo a arquivo, a perda desses elementos aumenta o tempo gasto em cada revisão, pois agora é necessário colapsar manualmente cada seção para encontrar o arquivo desejado, sem indicadores visuais de quantidade de alterações ou ações rápidas por mudança.

*[Fonte: New updated UI for vscode github copilot screws up diff UI](https://www.reddit.com/r/GithubCopilot/comments/1wxectl/new_updated_ui_for_vscode_github_copilot_screws/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Configurações do Copilot CLI não migram para Copilot SDK Agent no VS Code

Um usuário da comunidade questiona se subagents definidos no Copilot CLI, executado em terminal fora do VS Code, propagam suas configurações para o novo harness "Copilot SDK Agent" do editor; a ausência de interface dedicada no VS Code impede a alteração direta desses parâmetros no ambiente da IDE.

A fragmentação obriga desenvolvedores a replicar e manter manualmente perfis de agente em duas superfícies distintas, elevando o custo operacional e o risco de divergência de comportamento entre execuções; como se trata de relato isolado, não há confirmação oficial sobre herança automática nem roteiro para unificar a gestão dessas configurações.

*[Fonte: do Copilot CLI settings carry over to the VSCode "Copilot SDK agent" harness?](https://www.reddit.com/r/GithubCopilot/comments/1wxev8f/do_copilot_cli_settings_carry_over_to_the_vscode/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Copilot Pro+ de 7.000 créditos: dúvidas sobre alcance com Opus 5.5 e Sol 6.1

O assinante Pro+ com 7.000 créditos mensais questiona como esse saldo será consumido ao utilizar os modelos Opus 5.5 medium e 6.1 sol high, paradigmas que difere da estrutura de limite de horas a que estava acostumado em Claude e Codex. A evidência é um relato isolado da comunidade sem confirmação oficial, indicando que o usuário busca compreender o alcance real dos créditos diante da adoção de modelos premium.

O consumo de créditos não segue uma linearidade direta entre o tempo de sessão e o saldo restante; a escolha por modelos topo de linha como Opus 5.5 e Sol 6.1 esgota a cota rapidamente, gerando risco de interrupção no fluxo de trabalho antes do fechamento do mês.

*[Fonte: Copilot Pro+ Usage Limits](https://www.reddit.com/r/GithubCopilot/comments/1wxfp92/copilot_pro_usage_limits/) · Reddit r/GithubCopilot · sinal da comunidade*

#### isolate: VMs Linux descartáveis para Claude Code e Codex no Apple Silicon

A ferramenta ‘iso’ roda Claude Code e Codex em VMs Linux efêmeras no macOS 27+ com Docker, git, compiladores e gerenciadores de pacotes, copiando o projeto para `/workspace`. As chaves de API permanecem no host e são encaminhadas através de um proxy Swift, evitando que entrem na VM; os comandos de mudança são revisados antes da aplicação com `iso diff` e `iso pull --review`.

Para quem utiliza a extensão, a arquitetura se torna mais segura: o agente não pode executar comandos destrutivos no sistema principal, o que reduz o risco de compromises e vazamento de segredos. O custo de operação permanece próximo ao normal, já que a VM usa recursos do host e não requer infraestrutura adicional.

*[Fonte: isolate: disposable Linux VMs for Claude Code and Codex on Apple Silicon.](https://www.reddit.com/r/GithubCopilot/comments/1wxzyd7/isolate_disposable_linux_vms_for_claude_code_and/) · Reddit r/GithubCopilot · sinal da comunidade*

#### Claude Code: banco de dados supera markdown para memória de agente

Um desenvolvedor do r/ClaudeCode relatou que dar ao agente acesso direto a um banco de dados, como SQLite, Jira ou Linear, resulta em melhor memória persistente do que usar arquivos markdown ou repositórios, argumentando que ferramentas de ticketing escalam comunicação e contexto melhor que anotações locais. O relato enfatiza que a solução simples de um sistema consultável por natureza supera abordagens fragmentadas para retenção de longo prazo.

*[Fonte: Nothing beats a database for agent memory](https://www.reddit.com/r/ClaudeCode/comments/1wwzw33/nothing_beats_a_database_for_agent_memory/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### Codex economiza 30 horas de crunch; noiva reage: 'vou ficar rica'

Usuário do r/codex mostrou à noiva, que usava o ChatGPT web manual em plano de $20 mensais, como automatizar suas tarefas com agentes de IA, reduzindo o tempo de uma atividade de 30 horas para minutos. Ela comentou que isso a faria ficar rica, indicando uma percepção de valor desproporcional ao investimento atual.

A consequência prática é que equipes que continuam usando apenas o chat web sem integração de agentes enfrentam desperdício de tempo em tarefas repetitivas, enquanto quem adota agentes com ferramentas pode reduzir custos operacionais em fluxos manuais.

*[Fonte: Showed my fiancée actual agent skills to save her from a 30-hour crunch. Her reaction: "What the fuck I'm going to be rich." We are in a massive bubble.](https://www.reddit.com/r/codex/comments/1wtgpd4/showed_my_fiancée_actual_agent_skills_to_save_her/#community-signals) · Reddit r/codex · sinal da comunidade*

#### GTDD: teste gerativo adversarial para agentes de codificação

O artigo arXiv:2610.02952 propõe Generative Test-Driven Development, onde um agente de teste gera novos inputs após cada implementação de um agente de codificação, expondo lacunas de comportamento que suítes de teste fixas não detectam.

Times que usam agentes de IA para TDD precisam integrar um gerador de casos de teste adversarial ao seu loop de validação, aumentando a complexidade operacional sem ainda haver dados sobre custos adicionais de inferência ou sobre a eficácia geral em projetos reais.

*[Fonte: GTDD: Generative Test-Driven Development for AI Coding Agents with Adversarial Testing](https://arxiv.org/abs/2610.02952) · arXiv cs.SE*

### Engenharia e ecossistema

#### OpenAI lança formato visual de anúncios no ChatGPT com ferramentas de medição

OpenAI lançou um formato visual de anúncios integrado ao ChatGPT, com ferramentas de medição ampliadas, novas parcerias de atribuição e critérios de adequação de marca para anunciantes. Essa mudança permite que as marcas exibam conteúdo publicitário diretamente na interface de conversa, mantendo o controle sobre onde e como os anúncios aparecem.

Equipes que operam o ChatGPT em ambientes corporativos precisam revisar o consumo de tokens por interação, já que a renderização de anúncios visuais aumenta o uso computacional por sessão. A falta de detalhes sobre limites de frequência ou impacto médio no custo por token deixa em aberto a projeção de despesas para escalas de uso elevado.

*[Fonte: Building advertising for the way people use AI](https://openai.com/index/new-chatgpt-ads-format-and-measurement) · OpenAI Blog · fonte primária*

#### BISCEPTER: bissecção probabilística para regressão em larga escala

O artigo arXiv:2610.02995 propõe o BISCEPTER, um método de bissecção probabilística para identificar o commit indutor de bugs em softwares de sistema de larga escala. A técnica substitui a seleção tradicional pela mediana, que assume probabilidade uniforme entre os commits, por uma abordagem baseada na probabilidade real de cada commit ser a causa da regressão.

Equipes de engenharia de plataforma podem integrar essa heurística em pipelines de integração contínua para reduzir a quantidade de builds de teste em monorepos. A adoção acelera a localização de alterações problemáticas, embora a evidência não detalhe a precisão final do modelo em diferentes tipos de arquiteturas de software.

*[Fonte: BISCEPTER: Probability-Driven Bisection for Large-Scale System Software](https://arxiv.org/abs/2610.02995) · arXiv cs.SE*

#### Font Finder AI: identificador de fontes gratuito roda no Edge via visão computacional

O Font Finder AI, descrito em um relato de usuário no TabNews, identifica fontes a partir de imagens usando visão computacional diretamente no navegador Edge, sem dependência de servidores externos ou pagamento por consulta. Ele aplica pré-processamento de contraste e binarização de contornos via HTML5 Canvas e Web Workers, seguido de matching vetorial de glifos contra um banco de dados local de fontes abertas.

*[Fonte: Criando um Identificador de Fontes Gratuito por IA no Edge (Sem Paywall)](https://www.tabnews.com.br/hardiksharmaai/criando-um-identificador-de-fontes-gratuito-por-ia-no-edge-sem-paywall) · TabNews · sinal da comunidade*

### Segurança e confiança

#### Klarion: scanner de segredos em duas etapas reduz alertas em 61k arquivos

Desenvolvedor lançou o Klarion, scanner de segredos em duas etapas que combina 81 regras regex com uma pontuação normalizada de entropia Rényi e, em seguida, usa um modelo de IA para avaliar a evidência no contexto de código. Em testes com 61.000 arquivos de Spring Boot, Terraform, Next.js e Symfony, o Klarion gerou apenas 11 alertas, mantendo a detecção de vazamentos reais com precisão.

A redução de falsos positivos diminui o ruído nas pipelines CI/CD, permitindo que equipes revisem apenas os alertas que realmente precisam de atenção humana. A etapa de IA exige recursos computacionais adicionais, mas é substancialmente mais barata que a revisão manual em toda a base de código.

*[Fonte: Worried about your AI agent leaking secrets, or tired of secret-scanner false positives?](https://www.reddit.com/r/GithubCopilot/comments/1wxdp2e/worried_about_your_ai_agent_leaking_secrets_or/) · Reddit r/GithubCopilot · sinal da comunidade*

### Modelos e pesquisa

#### História do Qwen: de 7B a 2.4T parâmetros open-weight

A Alibaba fez o Qwen evoluir de um chatbot restrito a convidados em abril de 2023 para um modelo open-weight de 2,4 trilhões de parâmetros em agosto de 2026, documentando cada release principal e as alterações sucessivas de licença. O levantamento do MarkTechPost compila a cronologia completa, incluindo a transição para pesos abertos que permite inspeção e redistribuição sob os termos de cada versão.

A versão 3.8 citada no Ollama 0.40.0 herda essa linhagem e indica maturidade para inferência local em produção, embora a evidência não especifique qual licença exata rege esse release nem detalhe requisitos de hardware ou benchmarks de desempenho.

*[Fonte: The Story of Qwen: Alibaba’s AI Models From 7B to 2.4T](https://www.marktechpost.com/2026/10/04/the-story-of-qwen-alibabas-ai-models-from-7b-to-2-4t/) · MarkTechPost*

#### Aleph Alpha lança Kolibri: MoE 78.1B com 3.46B ativos e contexto 1M

A Aleph Alpha lançou o Kolibri, um modelo de pesos abertos para inglês e alemão baseado em arquitetura de mistura de especialistas. O sistema possui 78,1 bilhões de parâmetros totais, mas ativa apenas 3,46 bilhões por token. A ferramenta suporta contexto de 1 milhão de tokens, oferece esforço de raciocínio por requisição e utiliza pesos `FP8` sob licença Apache 2.0, operando em uma única GPU `B200` ou `H200`.

Equipes multilíngues que implementam geração aumentada de recuperação para documentos extensos podem processar longos contextos sem a necessidade de clusters de GPUs. A esparsidade da arquitetura reduz a carga computacional da inferência em hardware único.

*[Fonte: Aleph Alpha Releases Kolibri: A 78.1B Open-Weight English-German MoE Model With Only 3.46B Active Parameters](https://www.marktechpost.com/2026/10/04/aleph-alpha-releases-kolibri-a-78-1b-open-weight-english-german-moe-model-with-only-3-46b-active-parameters/) · MarkTechPost*

#### claude-mem: contexto persistente cross-session para qualquer agente

Projeto TypeScript com 96k estrelas captura atividade do agente, comprime com IA e injeta contexto relevante em sessões futuras; compatível com Claude Code, OpenClaw, Codex, Gemini, Hermes, Copilot, OpenCode.

Resolve limitação de janela de contexto curto; times que encadeiam múltiplas sessões de agente ganham continuidade de conhecimento sem gerenciar arquivos manualmente.

*[Fonte: thedotmack / claude-mem](https://github.com/thedotmack/claude-mem#trending-daily-typescript-2026-10-05) · GitHub Trending (daily-typescript)*

#### Claude Code atinge 149k estrelas como ferramenta agentic de terminal

O repositório oficial do Claude Code, em TypeScript, descreve uma ferramenta que vive no terminal, entende a base de código, executa tarefas rotineiras, explica trechos complexos e gerencia fluxos git usando comandos em linguagem natural, e já atingiu 149 421 estrelas.

Para desenvolvedores que trabalham no terminal, a adoção implica adicionar o binário do Lucas‑AI ao PATH, configurar variáveis de ambiente e possivelmente integrar «claude‑mem» ou «iso» para suporte à memória contextual.

*[Fonte: anthropics / claude-code](https://github.com/anthropics/claude-code#trending-daily-typescript-2026-10-05) · GitHub Trending (daily-typescript)*

## Leitura do conjunto

O OSS continua tomando a dianteira na execução de modelos, como mostra a fusão do Ollama 0.40.0 com o runtime MLX, permitindo execução nativa em Apple Silicon e estendendo o tokenizador para refletir a semântica do publisher. Ao mesmo tempo, a comunidade observa falhas na fricção de ferramentas de interface, com o Copilot no VS Code ignorar configurações migradas do CLI e quebrar a experiência de diff em PRs grandes, o que torna a adoção de extensões mais intrincada.

Entretanto, o foco de investimento parece migrar para o humor de produtividade: usuários experientes do Copilot Pro+ e do Claude Code buscam otimizar créditos e acelerar fluxos de teste com geração de testes unitários e banco de dados persistente.

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

1. [v0.40.0](https://github.com/ollama/ollama/releases/tag/v0.40.0-rc3) — Ollama Releases
2. [1.0.92-4](https://github.com/github/copilot-cli/releases/tag/v1.0.92-4) — Copilot CLI Releases
3. [v0.40.0-rc1: mlx: match publisher tokenizer semantics (#18779)](https://github.com/ollama/ollama/releases/tag/v0.40.0-rc1) — Ollama Releases
4. [Building advertising for the way people use AI](https://openai.com/index/new-chatgpt-ads-format-and-measurement) — OpenAI Blog
5. [Most cost effective with highest ROI?](https://www.reddit.com/r/GithubCopilot/comments/1wxbqa7/most_cost_effective_with_highest_roi/) — Reddit r/GithubCopilot
6. [Worried about your AI agent leaking secrets, or tired of secret-scanner false positives?](https://www.reddit.com/r/GithubCopilot/comments/1wxdp2e/worried_about_your_ai_agent_leaking_secrets_or/) — Reddit r/GithubCopilot
7. [New updated UI for vscode github copilot screws up diff UI](https://www.reddit.com/r/GithubCopilot/comments/1wxectl/new_updated_ui_for_vscode_github_copilot_screws/) — Reddit r/GithubCopilot
8. [do Copilot CLI settings carry over to the VSCode "Copilot SDK agent" harness?](https://www.reddit.com/r/GithubCopilot/comments/1wxev8f/do_copilot_cli_settings_carry_over_to_the_vscode/) — Reddit r/GithubCopilot
9. [Copilot Pro+ Usage Limits](https://www.reddit.com/r/GithubCopilot/comments/1wxfp92/copilot_pro_usage_limits/) — Reddit r/GithubCopilot
10. [isolate: disposable Linux VMs for Claude Code and Codex on Apple Silicon.](https://www.reddit.com/r/GithubCopilot/comments/1wxzyd7/isolate_disposable_linux_vms_for_claude_code_and/) — Reddit r/GithubCopilot
11. [Nothing beats a database for agent memory](https://www.reddit.com/r/ClaudeCode/comments/1wwzw33/nothing_beats_a_database_for_agent_memory/#community-signals) — Reddit r/ClaudeCode
12. [Showed my fiancée actual agent skills to save her from a 30-hour crunch. Her reaction: "What the fuck I'm going to be rich." We are in a massive bubble.](https://www.reddit.com/r/codex/comments/1wtgpd4/showed_my_fiancée_actual_agent_skills_to_save_her/#community-signals) — Reddit r/codex
13. [The Story of Qwen: Alibaba’s AI Models From 7B to 2.4T](https://www.marktechpost.com/2026/10/04/the-story-of-qwen-alibabas-ai-models-from-7b-to-2-4t/) — MarkTechPost
14. [Aleph Alpha Releases Kolibri: A 78.1B Open-Weight English-German MoE Model With Only 3.46B Active Parameters](https://www.marktechpost.com/2026/10/04/aleph-alpha-releases-kolibri-a-78-1b-open-weight-english-german-moe-model-with-only-3-46b-active-parameters/) — MarkTechPost
15. [BISCEPTER: Probability-Driven Bisection for Large-Scale System Software](https://arxiv.org/abs/2610.02995) — arXiv cs.SE
16. [GTDD: Generative Test-Driven Development for AI Coding Agents with Adversarial Testing](https://arxiv.org/abs/2610.02952) — arXiv cs.SE
17. [Criando um Identificador de Fontes Gratuito por IA no Edge (Sem Paywall)](https://www.tabnews.com.br/hardiksharmaai/criando-um-identificador-de-fontes-gratuito-por-ia-no-edge-sem-paywall) — TabNews
18. [thedotmack / claude-mem](https://github.com/thedotmack/claude-mem#trending-daily-typescript-2026-10-05) — GitHub Trending (daily-typescript)
19. [anthropics / claude-code](https://github.com/anthropics/claude-code#trending-daily-typescript-2026-10-05) — GitHub Trending (daily-typescript)

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-05.*
