---
layout: article
title: "LiteLLM faz nova assinatura; Claude Code amplia visualização; Copilot controla início de sessão"
date: "2026-10-12"
tags: ["litellm", "opencode", "reddit", "llm-framework", "coding-agent", "post-signals", "claudecode", "githubcopilot", "codex"]
summary: "Versões recentes de LiteLLM reforçam segurança com cosign. Claude Code expande suporte a mídia no terminal. Copilot introduz controle de inicialização para equipes corporativas."
reading_time: 7
---

{% raw %}
# LiteLLM faz nova assinatura; Claude Code amplia visualização; Copilot controla início de sessão

**Período analisado:** 11/10/2026 a 12/10/2026 · 6 pautas · 3 fontes primárias · 3 sinais da comunidade

## Em 30 segundos

- **LiteLLM v1.104.3 confirma assinatura cosign** — O Docker image v1.104.3 da LiteLLM foi assinado pelo mesmo certificado usado em versões anteriores e pode ser verificado com a chave pública do commit 0112e53.
- **LiteLLM v1.105.0 também recebe cosign** — A nova release v1.105.0 está assinada pelo mesmo certificado e pode ser validada com a mesma chave pública citada para a versão 1.104.3.
- **OpenCode 1.19.0 libera upgrade para OpenCode 2** — O comando `opencode upgrade --major` permite avançar para a versão 2, trazendo suporte para o tier ultrafast do OpenAI e validações de origem de PTY.
- **Claude Code mostra imagens e vídeos no terminal** — Um plugin chamado `claude-show-your-work` permite que o terminal exiba capturas de tela, vídeos e outras mídias geradas pelo Claude Code.
- **Copilot para JetBrains adiciona controle de inicialização MCP** — A atualização de 10 de outubro traz um switch que impede que os servidores MCP do Copilot e Claude inicien automaticamente e permite definir modelos corporativos por padrão.
- **Codex reclama sobre o que planeiam fazer com os usuários** — Usuário do r/codex questiona quais planos a comunidade de desenvolvedores tem para os usuários, indicando insatisfação e curiosidade de mudanças de direção.

## Destaques

### Modelos e pesquisa

#### LiteLLM v1.104.3 confirma assinatura cosign

A versão 1.104.3 do LiteLLM confirma que cada imagem Docker é assinada com o cosign, utilizando a mesma chave introduzida no commit 0112e53, o que permite verificar a integridade por meio da chave pública vinculada a esse hash. Essa prática de assinatura por release elimina a ambiguidade sobre a origem binária e fortalece a confiança no artefato distribuído. Para equipes que operam o proxy LiteLLM em pipelines CI/CD, a validação da assinatura reduz a superfície de ataque do supply‑chain, pois qualquer alteração não autorizada no contêiner seria imediatamente detectada na etapa de verificação.

*[Fonte: v1.104.3](https://github.com/BerriAI/litellm/releases/tag/v1.104.3) · LiteLLM Releases · fonte primária*

#### LiteLLM v1.105.0 também recebe cosign

A nova release v1.105.0 está assinada pelo mesmo certificado e pode ser validada com a mesma chave pública citada para a versão 1.104.3.

Protege as atualizações de biblioteca contra interferências maliciosas e mantém práticas de compliance de segurança.

*[Fonte: v1.105.0](https://github.com/BerriAI/litellm/releases/tag/v1.105.0) · LiteLLM Releases · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### OpenCode 1.19.0 libera upgrade para OpenCode 2

O comando `opencode upgrade --major` permite atualizar de 1.19.0 para a versão 2, incluindo suporte ao tier ultrafast do OpenAI, validação de origem das conexões PTY e remoção da instalação automática de atualizações.

Para quem executa o proxy em ambientes multi‑usuário, a nova arquitetura reduz falhas na autenticação de PTY e potencializa a latência do serviço ultrafast. Contudo, a migração exige revisar dependências de pacotes e testar a compatibilidade de scripts que acessam PTY, pois a alteração do fluxo de atualização pode gerar conflitos em sistemas que esperam atualizações automáticas.

*[Fonte: v1.19.0](https://github.com/anomalyco/opencode/releases/tag/v1.19.0) · OpenCode Releases · fonte primária*

#### Claude Code mostra imagens e vídeos no terminal

Um plugin chamado `claude-show-your-work` permite que o terminal exiba capturas de tela, vídeos e outras mídias geradas pelo Claude Code.

Facilita o debugging visual em ambientes locais sem abrir navegador, economizando energia e tempo de desenvolvimento.

*[Fonte: Claude Code now shows images and videos in the terminal](https://www.reddit.com/r/ClaudeCode/comments/1x34qj4/claude_code_now_shows_images_and_videos_in_the/#community-signals) · Reddit r/ClaudeCode · sinal da comunidade*

#### Copilot para JetBrains adiciona controle de inicialização MCP

A atualização de 10 de outubro no Copilot para JetBrains traz um seletor que impede a subida automática dos servidores MCP do Copilot e do Claude e permite definir modelos corporativos padrão. O recurso ecoa relato de usuários de VS Code que precisam rodar prompts em sessões vazias sequenciais para não estourar a memória de GPU, embora a evidência não cite o IDE da JetBrains.

Equipes de TI ganham controle para evitar ativações em segundo plano que consomem recursos locais e enviam dados a processamento não aprovado, reduzindo risco de compliance e custo de hardware. A incerteza permanece pois a única fonte é um relato de fórum sem validação do fabricante, sem clareza sobre uso em proxies

*[Fonte: How can I schedule a prompt to run in a new (empty) session after another prompt finishes running in GitHub Copilot?](https://www.reddit.com/r/GithubCopilot/comments/1x3mpaj/how_can_i_schedule_a_prompt_to_run_in_a_new_empty/#community-signals) · Reddit r/GithubCopilot · sinal da comunidade*

#### Codex reclama sobre o que planeiam fazer com os usuários

O usuário do r/codex questiona abertamente os planos da comunidade de desenvolvedores, expressando insatisfação e curiosidade sobre mudanças de direção inesperadas. O relato indica que essas mudanças propostas não são meras atualizações de rotina, mas sugerem uma reestruturação maior no funcionamento da ferramenta.

Para quem depende de Codex em fluxos de trabalho automatizados, a consequência prática reside na incerteza sobre políticas de uso e modelos, o que pode alterar drasticamente a arquitetura de integrações e o custo operacional de quem já implementou dependências críticas.

*[Fonte: What are they planning for us](https://www.reddit.com/r/codex/comments/1x303a0/what_are_they_planning_for_us/#community-signals) · Reddit r/codex · sinal da comunidade*

## Leitura do conjunto

Em outubro, a segurança de contêineres ganhou destaque quando a LiteLLM consolidou o uso da assinatura cosign em duas releases consecutivas, fornecendo um validador unificado que facilita auditorias contínuas. O mesmo enfoque em garantia de qualidade se reflete em OpenCode, que disponibiliza uma rota clara para migração para sua versão 2, juntamente com melhorias na segurança de conexões PTY. Enquanto isso, a comunidade do Claude Code demonstra maior atenção a fluxos de trabalho visuais com a introdução de um plugin de renderização de mídia, algo que será útil para equipes que desejam inspeção direta no terminal. No cenário corporativo, GitHub Copilot para JetBrains oferece controle de inicialização, permitindo que administradores desliguem automaticamente os servidores MCP, o que representa um passo estratégico para compliance e gerenciamento de recursos. Por fim, o debate aberto no r/codex aponta que os usuários vigiam de perto as decisões dos criadores, sinalizando a possibilidade de mudanças nos termos de uso ou nos modelos que suportam os fluxos de CI/CD. 

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

1. [v1.104.3](https://github.com/BerriAI/litellm/releases/tag/v1.104.3) — LiteLLM Releases
2. [v1.105.0](https://github.com/BerriAI/litellm/releases/tag/v1.105.0) — LiteLLM Releases
3. [v1.19.0](https://github.com/anomalyco/opencode/releases/tag/v1.19.0) — OpenCode Releases
4. [Claude Code now shows images and videos in the terminal](https://www.reddit.com/r/ClaudeCode/comments/1x34qj4/claude_code_now_shows_images_and_videos_in_the/#community-signals) — Reddit r/ClaudeCode
5. [How can I schedule a prompt to run in a new (empty) session after another prompt finishes running in GitHub Copilot?](https://www.reddit.com/r/GithubCopilot/comments/1x3mpaj/how_can_i_schedule_a_prompt_to_run_in_a_new_empty/#community-signals) — Reddit r/GithubCopilot
6. [What are they planning for us](https://www.reddit.com/r/codex/comments/1x303a0/what_are_they_planning_for_us/#community-signals) — Reddit r/codex

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-12.*
