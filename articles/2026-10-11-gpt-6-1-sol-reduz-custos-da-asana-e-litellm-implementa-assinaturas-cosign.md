---
layout: article
title: "GPT-6.1 Sol reduz custos da Asana e LiteLLM implementa assinaturas Cosign"
date: "2026-10-11"
tags: ["openai", "litellm", "github", "opencode", "copilot-cli", "reddit", "llm-framework", "copilot", "changelog", "coding-agent"]
summary: "A Asana otimizou custos de agentes de navegador em 76 vezes utilizando o modelo Sol. Novas atualizações de segurança em Docker e extensões de monitoramento de créditos para Copilot alteram a operação de IDEs."
reading_time: 9
---

{% raw %}
# GPT-6.1 Sol reduz custos da Asana e LiteLLM implementa assinaturas Cosign

**Período analisado:** 09/10/2026 a 11/10/2026 · 9 pautas · 5 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **Asana reduz custos com GPT-6.1 Sol** — A Asana utilizou o GPT-6.1 Sol no Codex para tornar seu agente de navegador 76 vezes mais barato e 5 vezes mais rápido em testes.
- **LiteLLM v1.104.3 assina imagens Docker** — Todas as imagens Docker do LiteLLM agora são assinadas com cosign, utilizando a chave introduzida no commit 0112e53.
- **Copilot para JetBrains amplia controle de MCP** — O GitHub Copilot para JetBrains recebeu atualizações que oferecem maior controle sobre modelos padrão e servidores MCP.
- **OpenCode v1.19.0 remove atualizações automáticas** — A versão 1.19.0 do OpenCode introduz o comando /update para instalações manuais, pois as atualizações não são mais automáticas.
- **Copilot CLI v1.0.96-2 normaliza IDs de modelos** — A atualização corrigiu os IDs de modelos nos comandos /model e /config para serem insensíveis a maiúsculas e minúsculas.
- **Haiku supera Sol 6.1 em testes de usuário** — Um usuário de longa data do Codex relata que, em seus testes, o modelo Haiku está superando o Sol 6.1.
- **Extensão de monitoramento de créditos do Copilot** — Foi desenvolvida uma extensão para VS Code que exibe o uso de créditos do Copilot na barra de status via leitura de logs locais.
- **SessionDeck centraliza sessões agenticas no VS Code** — A extensão SessionDeck lista sessões de Claude Code, Codex e cursor-agent, identificando sessões travadas em prompts de permissão.
- **Perpetual automatiza troca de contas Codex e Claude** — A ferramenta Perpetual permite alternar entre contas de Codex e Claude Code automaticamente quando um limite de taxa é atingido.

## Destaques

### Modelos e pesquisa

#### Asana reduz custos com GPT-6.1 Sol

A Asana reduziu em 76 vezes o custo e aumentou em cinco vezes a velocidade de seu agente de navegador em testes ao adotar o GPT-6.1 Sol via Codex, viabilizando a oferta de modelos mais capazes aos clientes sem elevar a fatura de inferência. Equipes de infraestrutura que orçam agentes autônomos ganham margem para migrar cargas pesadas a modelos superiores, mas os números derivam apenas de testes internos sem detalhes de latência em produção, volume de tokens ou custo de orquestração do Codex, deixando a economia real em escala e a robustez em cenários adversos como incógnitas para quem aprova o orçamento.

*[Fonte: Asana cuts model costs 76x in browser tests with GPT-6.1 Sol](https://openai.com/index/asana-browser-agent) · OpenAI Blog · fonte primária*

#### LiteLLM v1.104.3 assina imagens Docker

A versão v1.104.3 do LiteLLM estabelece que todas as suas imagens Docker agora são assinadas com `cosign`. A autenticação utiliza a chave introduzida no commit `0112e53`, permitindo a verificação da integridade dos pacotes via comando `cosign verify`.

Operadores do proxy LiteLLM precisam atualizar seus pipelines de implantação para incluir a verificação dessas assinaturas. A medida reduz o risco de execução de imagens adulteradas, mas a documentação não detalha a política de rotação dessa chave criptográfica para versões futuras.

*[Fonte: v1.104.3](https://github.com/BerriAI/litellm/releases/tag/v1.104.3) · LiteLLM Releases · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Copilot para JetBrains amplia controle de MCP

O GitHub Copilot para JetBrains passa a permitir a seleção de modelos padrão e a configuração direta de servidores MCP, além de aprimorar a navegação no chat, os controles de conta e a exibição de diagnósticos. A mudança transfere para o desenvolvedor a definição de qual modelo e qual endpoint MCP atendem cada contexto, reduzindo a dependência de padrões opacos e facilitando a auditoria de chamadas a ferramentas externas; porém, o changelog não detalha se a configuração persiste entre workspaces nem como o gerenciamento de credenciais para servidores MCP privados será feito nativamente.

*[Fonte: New controls and chat improvements in Copilot for JetBrains](https://github.blog/changelog/2026-10-10-new-controls-and-chat-improvements-in-copilot-for-jetbrains) · GitHub Changelog · fonte primária*

#### OpenCode v1.19.0 remove atualizações automáticas

A versão 1.19.0 do OpenCode remove as atualizações automáticas e introduz o comando `/update` para instalar manualmente a própria versão ou migrar para a série 2.0. A mudança está descrita no registro oficial de lançamento, que também lista melhorias de core, correções de bugs e aprimoramentos de interface.

Administradores agora precisam integrar `/update` nos procedimentos de manutenção, o que pode aumentar a carga operacional e o risco de versões desatualizadas em ambientes que antes contavam com a automação. A decisão de permanecer na 1.x ou fazer upgrade imediato para a 2.0 permanece aberta, pois a evidência não define cronogramas ou requisitos de compatibilidade adicionais.

*[Fonte: v1.19.0](https://github.com/anomalyco/opencode/releases/tag/v1.19.0) · OpenCode Releases · fonte primária*

#### Copilot CLI v1.0.96-2 normaliza IDs de modelos

A atualização do Copilot CLI versão 1.0.96-2 tornou os IDs de modelo nos comandos /model e /config insensíveis a maiúsculas e minúsculas, salvando-os em formato canônico. Isso elimina falhas silenciosas em scripts de automação que antes dependiam de correspondência exata de caso. Usuários que mantêm pipelines de CI/CD ou ferramentas de gerenciamento de modelos agora enfrentam menos risco de falha por inconsistência de digitação. A mudança reduz a necessidade de normalização prévia nos chamados ao CLI, simplificando a lógica de configuração. Ainda não há indicação se o comportamento se aplica retroativamente a configurações salvas anteriormente, o que pode exigir revisão manual em ambientes com históricos de uso prolongado.

*[Fonte: 1.0.96-2](https://github.com/github/copilot-cli/releases/tag/v1.0.96-2) · Copilot CLI Releases · fonte primária*

#### Haiku supera Sol 6.1 em testes de usuário

Um usuário experiente do Codex relata que, em seus testes pessoais, o modelo Haiku da Anthropic superou o Sol 6.1 em desempenho, mesmo após anos usando o plano de $200 mensais e testando diversas versões do Sol. Ele afirma ter avaliado o modelo em múltiplos cenários, incluindo harnesses personalizados, agentes Pi e OpenCode, e conclui que o Haiku entrega resultados melhores em tarefas de codificação.

Esse relato indica uma possível regressão de desempenho do Sol 6.1 em comparação com modelos menores e mais baratos, o que pode levar usuários a reconsiderar a relação custo-benefício ao escolher entre planos de assinatura.

*[Fonte: After years on the $200 tier, even Haiku is outperforming Sol 6.1 sol in my tests](https://www.reddit.com/r/codex/comments/1x1ilzd/after_years_on_the_200_tier_even_haiku_is/#community-signals) · Reddit r/codex · sinal da comunidade*

#### Extensão de monitoramento de créditos do Copilot

O usuário /u/udsctp desenvolveu uma extensão para o Visual Studio Code com aproximadamente 26KB que exibe o consumo de créditos do Copilot na barra de status. A ferramenta lê logs locais para mostrar o uso diário e mensal, detalhando os custos por modelo ao passar o mouse sobre a interface.

Desenvolvedores que pagam a API podem controlar custos e evitar cobranças inesperadas diretamente na interface de edição. Como a funcionalidade baseia-se em um relato individual da comunidade, a estabilidade da leitura de logs e a compatibilidade com futuras atualizações do editor permanecem incertas.

*[Fonte: Keep track of Copilot credit usage in your VS Code status bar](https://www.reddit.com/r/GithubCopilot/comments/1x2dvgt/keep_track_of_copilot_credit_usage_in_your_vs/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

#### SessionDeck centraliza sessões agenticas no VS Code

A extensão SessionDeck lista em uma barra lateral todas as sessões de Claude Code, Codex e cursor‑agent em execução no VS Code, agrupadas por projeto e marcada com um sino vermelho quando aguardam resposta a um prompt de permissão. O visual permite clicar em qualquer linha e abrir a aba ou terminal correspondente, mesmo em janelas remotas distintas, sem exigir comunicação de rede.

Para quem mantém vários projetos em WSL ou Remote‑SSH, essa funcionalidade reduz a fragmentação operacional, eliminando perda de controle sobre sessões travadas.

*[Fonte: SessionDeck: My extension finds all Agentic sessions including tabs in IDE, overview of their status, and single click navigation to them](https://www.reddit.com/r/vscode/comments/1x2gne9/sessiondeck_my_extension_finds_all_agentic/#community-signals) · Reddit r/vscode · sinal da comunidade*

#### Perpetual automatiza troca de contas Codex e Claude

Perpetual é uma aplicação de código aberto que permite cadastrar múltiplas contas de Codex e Claude Code no VSCode ou em um desktop app e trocar automaticamente entre elas quando uma conta atingir seu limite de taxa. O autor relata que a ferramenta executa a rotação enquanto o projeto continua, sem precisar sair da sessão atual.

Para quem utiliza essas APIs em fluxos contínuos, a ferramenta oferece uma forma de manter a produtividade sem interrupções, reduzindo o tempo de espera por novas aprovações de quota. Entretanto, como o relato vem apenas de um usuário, não há confirmação da estabilidade do mecanismo ou das jurisdições de cobrança entre as contas.

*[Fonte: Auto switch between your Codex/Claude Code accounts mid-task (Free and Open Source)](https://www.reddit.com/r/vscode/comments/1x2a0fl/auto_switch_between_your_codexclaude_code/#community-signals) · Reddit r/vscode · sinal da comunidade*

## Leitura do conjunto

Enquanto a Asana reporta reduções drásticas de custo utilizando o GPT-6.1 Sol, relatos da comunidade no Reddit sugerem que o modelo pode estar perdendo performance para o Haiku em cenários de codificação. Essa divergência entre benchmarks corporativos e testes de usuários indica a necessidade de validação rigorosa antes de migrações de modelo em larga escala.

No ecossistema de IDEs, observa-se um movimento para maior controle operacional. O GitHub Copilot expande a integração com MCP no JetBrains e surgem ferramentas comunitárias para monitorar créditos e gerenciar sessões de múltiplos agentes no VS Code. Paralelamente, a segurança de infraestrutura é reforçada com a assinatura de imagens Docker no LiteLLM e a mudança para atualizações manuais no OpenCode.

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

1. [Asana cuts model costs 76x in browser tests with GPT-6.1 Sol](https://openai.com/index/asana-browser-agent) — OpenAI Blog
2. [v1.104.3](https://github.com/BerriAI/litellm/releases/tag/v1.104.3) — LiteLLM Releases
3. [New controls and chat improvements in Copilot for JetBrains](https://github.blog/changelog/2026-10-10-new-controls-and-chat-improvements-in-copilot-for-jetbrains) — GitHub Changelog
4. [v1.19.0](https://github.com/anomalyco/opencode/releases/tag/v1.19.0) — OpenCode Releases
5. [1.0.96-2](https://github.com/github/copilot-cli/releases/tag/v1.0.96-2) — Copilot CLI Releases
6. [After years on the $200 tier, even Haiku is outperforming Sol 6.1 sol in my tests](https://www.reddit.com/r/codex/comments/1x1ilzd/after_years_on_the_200_tier_even_haiku_is/#community-signals) — Reddit r/codex
7. [Keep track of Copilot credit usage in your VS Code status bar](https://www.reddit.com/r/GithubCopilot/comments/1x2dvgt/keep_track_of_copilot_credit_usage_in_your_vs/#community-signals) — Reddit r/GithubCopilot
8. [SessionDeck: My extension finds all Agentic sessions including tabs in IDE, overview of their status, and single click navigation to them](https://www.reddit.com/r/vscode/comments/1x2gne9/sessiondeck_my_extension_finds_all_agentic/#community-signals) — Reddit r/vscode
9. [Auto switch between your Codex/Claude Code accounts mid-task (Free and Open Source)](https://www.reddit.com/r/vscode/comments/1x2a0fl/auto_switch_between_your_codexclaude_code/#community-signals) — Reddit r/vscode

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-11.*
