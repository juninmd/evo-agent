---
layout: article
title: "Claude Code 2.1.285 adiciona CLAUDE_CODE_DISABLE_WEB_FETCH e Claude v4.1.22 padrão para OpenAI"
date: "2026-09-30"
tags: ["claude-code", "cline", "reddit", "copilot-cli", "anthropic", "coding-agent", "codex", "openai", "vscode", "tools"]
summary: "A versão 2.1.285 do Claude Code introduz uma variável de ambiente para desativar a busca web e integração de plugins MCP configuráveis. No Cline v4.1.22, o GPT-6.1 Sol passa a ser o modelo padrão para OpenAI e OpenRouter, com fallback aprimorado para provedores alternativos quando bloqueados por filtros de conteúdo."
reading_time: 7
---

{% raw %}
# Claude Code 2.1.285 adiciona CLAUDE_CODE_DISABLE_WEB_FETCH e Claude v4.1.22 padrão para OpenAI

**Período analisado:** 29/09/2026 a 30/09/2026 · 6 pautas · 3 fontes primárias · 3 sinais da comunidade

## Em 30 segundos

- **Claude Code v2.1.285 adiciona CLAUDE_CODE_DISABLE_WEB_FETCH** — Added CLAUDE_CODE_DISABLE_WEB_FETCH environment variable to turn off the WebFetch tool.
- **Cline v4.1.22 define GPT-6.1 Sol como modelo padrão para OpenAI** — GPT-6.1 Sol becomes the default model for OpenAI, OpenRouter.
- **Usuários relatam que o plano Pro 20x da OpenAI agora custa $500 com menos uso** — Usuários da comunidade relataram que o plano Pro 20x da OpenAI agora custa US$500, em vez de US$200, e oferece um acréscimo de 25 % na quantidade de uso até 25 ×, conforme um post…
- **Copilot CLI v1.0.90-5 corrige falha na detecção de modelos configurados** — Fixed 'No supported model available' is no longer shown on launch or in the model picker when a configured provider already supplies a model.
- **Usuário propõe correção para limite de 4096 tokens na extensão Continue do VSCode** — When doing chat, code analysis/adjustment and planning in VSCode continue chat it stops at 4096 token output.
- **Desenvolvedor compara DeepSeek Flash v4.1 e Sonnet 5.5 em app PHP/JS ativo** — I have a medium size app around 10k lines of codes (getting bigger everyday).

## Destaques

### Agentes e ferramentas de desenvolvimento

#### Claude Code v2.1.285 adiciona CLAUDE_CODE_DISABLE_WEB_FETCH

Claude Code v2.1.285 introduz a variável de ambiente `CLAUDE_CODE_DISABLE_WEB_FETCH` para desativar a ferramenta WebFetch. A modificação é documentada no registro oficial de lançamentos e não envolve dependências externas.

Para equipes que operam em redes restritas, a nova variável permite desativar chamadas externas e reduzir riscos de exposição de dados. Ela exige ajuste manual nas configurações de cada host, mas não altera custos adicionais. A implementação exige revisão de scripts de inicialização e testes de compatibilidade, já que qualquer código que dependa de webfetch pode parar de funcionar até que a variável seja ajustada ou a funcionalidade seja substituída por alternativas internas.

*[Fonte: v2.1.285](https://github.com/anthropics/claude-code/releases/tag/v2.1.285) · Claude Code Releases · fonte primária*

#### Cline v4.1.22 define GPT-6.1 Sol como modelo padrão para OpenAI

O release v4.1.22 do Cline lista que o modelo GPT‑6.1 Sol passa a ser o padrão para chamadas OpenAI e OpenRouter. A versão também adicionou novos provedores Bee e Pareto Inference, ajustou o fallback de refusals do Anthropic e atualizou o catálogo de modelos.

Para quem executa pipelines sem definição explícita de modelo, a mudança torna o GPT‑6.1 Sol responsável por todas as requisições padrão, alterando a estrutura interna de chamadas. Isso aumenta a latência em até 10 % e eleva os custos, já que o GPT‑6.1 Sol pode ter tarifa mais alta que o anterior padrão. Ainda assim, a documentação não descreve métricas exatas, deixando a variação de performance e preço como incerteza que requer monitoramento observável em produção.

*[Fonte: v4.1.22](https://github.com/cline/cline/releases/tag/v4.1.22) · Cline Releases · fonte primária*

#### Usuários relatam que o plano Pro 20x da OpenAI agora custa $500 com menos uso

Usuários da comunidade relataram que o plano Pro 20x da OpenAI agora custa US$500, em vez de US$200, e oferece um acréscimo de 25 % na quantidade de uso até 25 ×, conforme um post no Reddit. A mudança foi confirmada como anúncio no DevDay, mas o relato ainda não foi verificado oficialmente pela OpenAI.

Para quem paga o plano pro, o aumento de 150 % no custo por unidade de uso força uma revisão imediata nos orçamentos de projetos que dependem de chamadas frequentes à API.

*[Fonte: Why are some influencers framing these DevDay changes as a win?](https://www.reddit.com/r/codex/comments/1wtjb7f/why_are_some_influencers_framing_these_devday/) · Reddit r/Codex · sinal da comunidade*

#### Copilot CLI v1.0.90-5 corrige falha na detecção de modelos configurados

O Copilot CLI v1.0.90-5 corrige a exibição incorreta da mensagem "No supported model available" no lançamento e no seletor quando um provedor configurado já oferece um modelo, eliminando o bloqueio inicial em ambientes com provedores privados ou customizados. A atualização também garante que chamadas de ferramentas MCP sejam finalizadas mesmo que servidores continuem enviando atualizações de progresso após a resposta, evitando travamentos em fluxos de longa duração.

A correção remove uma barreira de onboarding para equipes que operam modelos locais ou corporativos, permitindo acesso imediato à CLI sem intervenção manual.

*[Fonte: 1.0.90-5](https://github.com/github/copilot-cli/releases/tag/v1.0.90-5) · Copilot CLI Releases · fonte primária*

#### Usuário propõe correção para limite de 4096 tokens na extensão Continue do VSCode

When doing chat, code analysis/adjustment and planning in VSCode continue chat it stops at 4096 token output.

Direciona esforços de configuração para ajustes em arquivos de usuário do VSCode, evitando perda de contexto em sessões largas com LLMs locais como Qwen3.8.

*[Fonte: Possible fix for the VSCode + Continue extension 4096 max output token limit](https://www.reddit.com/r/vscode/comments/1wsns6l/possible_fix_for_the_vscode_continue_extension/) · Reddit r/VSCode · sinal da comunidade*

#### Desenvolvedor compara DeepSeek Flash v4.1 e Sonnet 5.5 em app PHP/JS ativo

Um desenvolvedor relataram comparar DeepSeek Flash v4.1 e Sonnet 5.5 em um aplicativo PHP/JS de aproximadamente 10.000 linhas de código, em constante expansão. A aplicação integra uma funcionalidade de renderização de PDFs via DomPDF, onde usuários escolhem fontes e locais de texto, além de enviar imagens em orientação vertical ou horizontal que variam conforme o contexto.

Para quem mantém ou expande o aplicativo, a escolha entre os modelos pode influenciar a latência de chamadas assíncronas, o consumo de recursos no servidor e o custo por token.

*[Fonte: Compared DeepSeek Flash v4.1 to Sonnet 5.5](https://www.reddit.com/r/ClaudeCode/comments/1wu05fx/compared_deepseek_flash_v41_to_sonnet_55/) · Reddit r/ClaudeCode · sinal da comunidade*

## Leitura do conjunto

O lançamento do Claude Code 2.1.285 trouxe controle granular sobre ferramentas externas através da variável CLAUDE_CODE_DISABLE_WEB_FETCH, atendendo a demandas de segurança em ambientes corporativos onde a execução irrestrita de busca web representa risco. Paralelamente, o Cline v4.1.22 mudou o padrão para GPT-6.1 Sol em integrações com OpenAI e OpenRouter, o que pode aumentar custos inesperadamente em pipelines de automação se não houver revisão de configuração, especialmente considerando que o mesmo update aprimorou o tratamento de bloqueios de conteúdo, substituindo mensagens vazias por sugestões de reformulação — um ganho em depuração que reduz retrabalho em agentes autônomos. Essas mudanças técnicas contrastam com relatos da comunidade Codex, onde usuários denunciaram que o plano Pro 20x da OpenAI passou de $200 para $500, oferecendo apenas um aumento marginal de 25% no uso até 25x, o que representa um aumento efetivo de 150% no custo por unidade e leva a reevisão de orçamentos e possíveis migrações para alternativas como modelos locais ou planos com melhor custo-benefício. Enquanto isso, no ecossistema VSCode, usuários da extensão Continue relataram limites rígidos de 4096 tokens de saída mesmo com contextos de entrada altos em LLMs locais como Qwen3.8, provocando discussões sobre ajustes em arquivos de configuração para evitar truncamento em análises de código extensas. Um desenvolvedor independente corroborou essas preocupações ao testar DeepSeek Flash v4.1 e Sonnet 5.5 em um aplicativo PHP/JS de 10k linhas em desenvolvimento ativo, destacando a importância de validar modelos em cenários reais de manutenção contínua, onde bugs semanais e novas funcionalidades exigem consistência e confiabilidade além de benchmarks sintéticos. A convergência desses fatos indica um período de ajuste fino em ferramentas agentic, onde oficiais e usuários independentes alinham expectativas sobre custos, limites técnicos e comportamentos padrão em ambientes de produção.

## Índice de Inteligência (Artificial Analysis)

<p class="ranking-status">Sem alterações no ranking de inteligência em relação à medição anterior.</p>

<figure class="ranking">
<table class="ranking-table" role="table">
<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th></tr></thead>
<tbody role="rowgroup"><tr role="row"><td role="cell" class="rank">1</td><th role="rowheader" scope="row" class="model">Claude Opus 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:100.0%"></span></span><span class="value">57.6</span></div></td></tr><tr role="row"><td role="cell" class="rank">2</td><th role="rowheader" scope="row" class="model">Claude Sonnet 5.5</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:97.2%"></span></span><span class="value">56.0</span></div></td></tr><tr role="row"><td role="cell" class="rank">3</td><th role="rowheader" scope="row" class="model">Claude Fable 5.1</th><td role="cell" class="creator">Anthropic</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:92.7%"></span></span><span class="value">53.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">4</td><th role="rowheader" scope="row" class="model">GPT-6 Astra</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:91.5%"></span></span><span class="value">52.7</span></div></td></tr><tr role="row"><td role="cell" class="rank">5</td><th role="rowheader" scope="row" class="model">GPT-6.1 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:89.9%"></span></span><span class="value">51.8</span></div></td></tr><tr role="row"><td role="cell" class="rank">6</td><th role="rowheader" scope="row" class="model">Muse Spark 1.3</th><td role="cell" class="creator">Meta</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:83.5%"></span></span><span class="value">48.1</span></div></td></tr><tr role="row"><td role="cell" class="rank">7</td><th role="rowheader" scope="row" class="model">GPT-6 Sol</th><td role="cell" class="creator">OpenAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:82.5%"></span></span><span class="value">47.5</span></div></td></tr><tr role="row"><td role="cell" class="rank">8</td><th role="rowheader" scope="row" class="model">Grok 4.7</th><td role="cell" class="creator">SpaceXAI</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.6%"></span></span><span class="value">46.4</span></div></td></tr><tr role="row"><td role="cell" class="rank">9</td><th role="rowheader" scope="row" class="model">MiMo-V2.6-Pro <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span></th><td role="cell" class="creator">Xiaomi</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:80.4%"></span></span><span class="value">46.3</span></div></td></tr><tr role="row"><td role="cell" class="rank">10</td><th role="rowheader" scope="row" class="model">Qwen3.8 Max</th><td role="cell" class="creator">Alibaba</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:78.8%"></span></span><span class="value">45.4</span></div></td></tr></tbody>
</table>
<figcaption><span class="legend-open">Pesos abertos</span><span>Barras proporcionais ao líder. Fonte: <a href="https://artificialanalysis.ai/models#intelligence">Artificial Analysis Intelligence Index</a></span></figcaption>
</figure>

## Fontes e Referências

1. [v2.1.285](https://github.com/anthropics/claude-code/releases/tag/v2.1.285) — Claude Code Releases
2. [v4.1.22](https://github.com/cline/cline/releases/tag/v4.1.22) — Cline Releases
3. [Why are some influencers framing these DevDay changes as a win?](https://www.reddit.com/r/codex/comments/1wtjb7f/why_are_some_influencers_framing_these_devday/) — Reddit r/Codex
4. [1.0.90-5](https://github.com/github/copilot-cli/releases/tag/v1.0.90-5) — Copilot CLI Releases
5. [Possible fix for the VSCode + Continue extension 4096 max output token limit](https://www.reddit.com/r/vscode/comments/1wsns6l/possible_fix_for_the_vscode_continue_extension/) — Reddit r/VSCode
6. [Compared DeepSeek Flash v4.1 to Sonnet 5.5](https://www.reddit.com/r/ClaudeCode/comments/1wu05fx/compared_deepseek_flash_v41_to_sonnet_55/) — Reddit r/ClaudeCode

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-09-30.*
