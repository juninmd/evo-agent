---
layout: article
title: "LiteLLM implementa assinatura de imagens Docker e Claude Code expande sandbox Linux"
date: "2026-10-20"
tags: ["litellm", "claude-code", "copilot-cli", "reddit", "llm-framework", "anthropic", "copilot", "coding-agent", "claudecode"]
summary: "LiteLLM adota verificação via cosign para garantir a integridade de runtimes. Relatos de usuários apontam instabilidades de uso no Codex e testes A/B do Fable 5.5."
reading_time: 7
---

{% raw %}
# LiteLLM implementa assinatura de imagens Docker e Claude Code expande sandbox Linux

**Período analisado:** 19/10/2026 a 21/10/2026 · 7 pautas · 3 fontes primárias · 4 sinais da comunidade

## Em 30 segundos

- **LiteLLM implementa assinatura de imagens** — Todas as imagens Docker do LiteLLM agora são assinadas com cosign, utilizando uma chave introduzida no commit 0112e53.
- **Claude Code expande permissões de sandbox** — A versão v2.1.305 adicionou a configuração sandbox.allowNestedUserNamespaces para permitir a criação de user namespaces em Linux.
- **Copilot CLI adiciona saídas estruturadas** — A versão 1.0.101 introduziu suporte nativo para structured output em subagentes de workflow dinâmico em modelos compatíveis.
- **Testes A/B do Fable 5.5 no Claude Code** — Usuários identificaram commits co-autorados pelo Fable 5.5, indicando a execução de testes A/B automáticos no roteamento de agentes.
- **Consumo acelerado de tokens no plano Pro 200** — Usuário do plano Codex Pro 200 relatou a perda de 36% da cota semanal em apenas 8 horas utilizando Astra para planejamento e Luna-high.
- **Falha de carregamento do Codex no iOS** — Relatos indicam que o aplicativo Codex não consegue carregar mensagens no iOS, bloqueando threads inteiras de trabalho.
- **Ausência do Gemini 4 Argon no Copilot VS Code** — Usuários que configuraram chaves de API do Google manualmente não visualizaram o modelo Gemini 4 Argon na lista de modelos disponíveis.

## Destaques

### Modelos e pesquisa

#### LiteLLM implementa assinatura de imagens

Todas as imagens Docker do LiteLLM agora são assinadas com cosign, utilizando uma chave introduzida no commit 0112e53.

Exige a atualização dos pipelines de CI/CD para incluir a verificação de hashes de commit imutáveis, mitigando riscos de supply chain.

*[Fonte: v1.105.2](https://github.com/BerriAI/litellm/releases/tag/v1.105.2) · LiteLLM Releases · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Claude Code expande permissões de sandbox

v2.1.305 do Claude Code introduz a configuração cripto `sandbox.allowNestedUserNamespaces`, permitindo que comandos rodem em sandbox no Linux criem user namespaces. Isso fortalece a capacidade de sandbox em suportar aplicações como Chromium e podman rootless, que normalmente exigem isolamento de namespace.

Para quem executa testes de interface em terminal, a inclusão desse recurso significa que o mecanismo de isolamento passa a permitir múltiplos namespaces, aumentando a flexibilidade de instâncias próprias mas introduzindo risco de fuga de arquivos, pois o sandbox deixa de proteger arquivos fora do namespace criado.

*[Fonte: v2.1.305](https://github.com/anthropics/claude-code/releases/tag/v2.1.305) · Claude Code Releases · fonte primária*

#### Copilot CLI adiciona saídas estruturadas

A versão 1.0.101 introduziu suporte nativo para structured output em subagentes de workflow dinâmico em modelos compatíveis.

Habilita a integração de agentes de CLI com sistemas de parsing determinísticos, reduzindo falhas de integração via regex.

*[Fonte: 1.0.101](https://github.com/github/copilot-cli/releases/tag/v1.0.101) · Copilot CLI Releases · fonte primária*

#### Testes A/B do Fable 5.5 no Claude Code

Usuários do `Claude Code` identificaram commits co-autorados pelo `Fable 5.5`, sugerindo a execução de testes A/B no roteamento automático de agentes. O relato indica que a versão foi utilizada em commits realizados há quatro dias, sem aviso prévio aos desenvolvedores.

Quem utiliza a ferramenta enfrenta instabilidade de comportamento entre sessões, o que exige monitoramento rigoroso de regressão em fluxos automatizados. Como a evidência baseia-se em um relato isolado da comunidade, a extensão da implementação e a estabilidade da versão permanecem incertas.

*[Fonte: Fable 5.5 imminent!](https://www.reddit.com/r/ClaudeCode/comments/1xato0b/fable_55_imminent/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### Consumo acelerado de tokens no plano Pro 200

O usuário do plano Codex Pro 200 relatou que, ao usar a extensão Astra para planejamento e o sub‑agente Luna‑high, consumiu 36 % da cota semanal em apenas 8 horas. Isso ocorreu apesar de o plano ter limitante de 10 tokens por hora, indicando uma queda brusca na eficiência de uso. O relato vem de /u/web-dev-kev e não foi confirmado por testes independentes.

Para equipes que dependem de sistemas de sub‑agentes complexos, esse uso acelerado gera risco de exceder os limites de token antes da linha do plano, provocando interrupções inesperadas. A consequência prática é a necessidade de reavaliar os orçamentos de token, ajustar as configurações de latência em `astra` ou migrar para planos com maior banda de token.

*[Fonte: 36% of my weekly, gone in 8 hours. (Pro 200 - 20x plan)](https://www.reddit.com/r/codex/comments/1xavxig/36_of_my_weekly_gone_in_8_hours_pro_200_20x_plan/) · Reddit r/Codex · sinal da comunidade*

#### Falha de carregamento do Codex no iOS

Relatos de usuários no Reddit indicam que o aplicativo Codex para iOS não consegue carregar mensagens, travando threads inteiras e impedindo a continuidade do trabalho. O problema não está relacionado à conectividade de internet e permanece sem previsão oficial de correção, o que torna o app inutilizável para fluxos de revisão e codificação em dispositivos móveis da Apple.

A falha obriga equipes que dependem de revisão móvel a migrar imediatamente para alternativas como o Claude Code para evitar paralisação operacional.

*[Fonte: Why doesn’t codex work on iOS](https://www.reddit.com/r/codex/comments/1xb3f0b/why_doesnt_codex_work_on_ios/) · Reddit r/Codex · sinal da comunidade*

#### Ausência do Gemini 4 Argon no Copilot VS Code

Usuários que configuram chaves de API do Google manualmente na extensão do GitHub Copilot para VS Code relataram a ausência do modelo Gemini 4 Argon na lista de seleção. O problema ocorre mesmo após a inserção da chave na aba de modelos de linguagem, onde versões anteriores, como o Gemini 3.8 Flash, aparecem normalmente.

Essa falha de visibilidade na interface do plugin impede a adoção de modelos de fronteira via API externa. O desenvolvedor fica limitado a versões defasadas, prejudicando a operação de quem prefere gerenciar a própria chave em vez de usar o plano do Copilot. Como a evidência provém de um único relato comunitário, ainda não se sabe se a causa é um erro de configuração ou uma limitação da extensão.

*[Fonte: Can’t see Gemini 4 Argon in GitHub Copilot for VS Code after adding my Google API key](https://www.reddit.com/r/GithubCopilot/comments/1xb5aal/cant_see_gemini_4_argon_in_github_copilot_for_vs/) · Reddit r/GithubCopilot · sinal da comunidade*

## Leitura do conjunto

O LiteLLM reforça a cadeia de confiança: assinaturas cosign nas imagens Docker atrelam credibilidade à distribuição. Em contrapartida, o Copilot VS Code abre vulnerabilidade ao não listar o Gemini 4 Argon, mesmo quando a chave de API do Google é configurada manualmente, indicando um descompasso entre segurança e usabilidade. O Claude Code, com sandbox.allowNestedUserNamespaces, amplia controle isolado em ambientes Linux, mas a falha de carregamento do Codex no iOS revela fragilidades de sincronização de mensagens, prejudicando a continuidade de workflows em dispositivos móveis. A expansão de permissões de sandbox coincide com a adição de saídas estruturadas nos subagentes do Copilot CLI, propiciando execução mais previsível, porém, o consumo acelerado de tokens no Pro 200 demonstra que otimizações de planejamento e execução (Astra, Luna‑high) podem drenar rapidamente a cota, superado apenas pela eficácia dos testes A/B do Fable 5.5 que identificaram roteamento inadequado de agentes.

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

1. [v1.105.2](https://github.com/BerriAI/litellm/releases/tag/v1.105.2) — LiteLLM Releases
2. [v2.1.305](https://github.com/anthropics/claude-code/releases/tag/v2.1.305) — Claude Code Releases
3. [1.0.101](https://github.com/github/copilot-cli/releases/tag/v1.0.101) — Copilot CLI Releases
4. [Fable 5.5 imminent!](https://www.reddit.com/r/ClaudeCode/comments/1xato0b/fable_55_imminent/#community-signals) — Reddit r/ClaudeCode
5. [36% of my weekly, gone in 8 hours. (Pro 200 - 20x plan)](https://www.reddit.com/r/codex/comments/1xavxig/36_of_my_weekly_gone_in_8_hours_pro_200_20x_plan/) — Reddit r/Codex
6. [Why doesn’t codex work on iOS](https://www.reddit.com/r/codex/comments/1xb3f0b/why_doesnt_codex_work_on_ios/) — Reddit r/Codex
7. [Can’t see Gemini 4 Argon in GitHub Copilot for VS Code after adding my Google API key](https://www.reddit.com/r/GithubCopilot/comments/1xb5aal/cant_see_gemini_4_argon_in_github_copilot_for_vs/) — Reddit r/GithubCopilot

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-20.*
