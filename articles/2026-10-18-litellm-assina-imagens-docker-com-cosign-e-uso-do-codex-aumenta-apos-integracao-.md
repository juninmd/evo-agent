---
layout: article
title: "LiteLLM assina imagens Docker com cosign e uso do Codex aumenta após integração com dot"
date: "2026-10-18"
tags: ["litellm", "reddit", "openai", "llm-framework", "codex", "post-signals", "vscode"]
summary: "LiteLLM v1.106.0 introduz verificação de assinatura Docker com cosign usando chave fixa. Usuários do Codex relatam aumento significativo no consumo de usage após adoção do dot para coordenar cargas de trabalho."
reading_time: 6
---

{% raw %}
# LiteLLM assina imagens Docker com cosign e uso do Codex aumenta após integração com dot

**Período analisado:** 16/10/2026 a 18/10/2026 · 5 pautas · 2 fontes primárias · 3 sinais da comunidade

## Em 30 segundos

- **LiteLLM v1.106.0 assina imagens Docker com cosign** — Todas as imagens Docker do LiteLLM são assinadas com cosign usando a mesma chave introduzida no commit 0112e53.
- **Uso do Codex aumenta após adoção do dot para coordenação** — Após adicionar dot para coordenar cargas de trabalho, o uso semanal do Codex caiu de 3-4 dias para 3-4 horas no plano de $200/mês.
- **Agentes Codex priorizam testes unitários excessivos em detrimento da tarefa principal** — Usuários relatam que agentes Codex gastam tempo excessivo em casos de teste triviais, deixando a tarefa principal incompleta, apesar de milhares de testes serem gerados.
- **Itaú aplica IA generativa a toda sua base de clientes com interface ia.i e plataforma IARA** — Itaú está usando ia.i, uma interface conversacional, e a plataforma IARA de governança para aplicar sua estratégia AI First a clientes e funcionários.
- **Extensão Codex no VS Code consome 15GB de armazenamento após desinstalação** — Desinstalar a extensão Codex do VS Code liberou 15GB de armazenamento, levantando preocupações sobre uso local de modelos ou dados em cache.

## Destaques

### Modelos e pesquisa

#### LiteLLM v1.106.0 assina imagens Docker com cosign

As imagens Docker do LiteLLM v1.106.0 são assinadas com cosign usando a chave pública do commit 0112e53046018d726492c814b3644b7d376029d0. Cada lançamento usa a mesma chave, garantindo que a assinatura seja verificável de forma consistente. A verificação pode ser feita com o comando cosign verify usando essa chave fixa e a referência da imagem.

Quem opera o LiteLLM em ambientes de agente pode validar a integridade da imagem antes da execução, reduzindo o risco de usar versões adulteradas. A evidência não especifica se a chave é rotacionada ou se há suporte para verificação automática em pipelines de CI/CD, deixando em aberto a adoção em larga escala.

*[Fonte: v1.106.0](https://github.com/BerriAI/litellm/releases/tag/v1.106.0) · LiteLLM Releases · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Uso do Codex aumenta após adoção do dot para coordenação

O uso do Codex caiu de três a quatro dias para três a quatro horas após a adição do dot para coordenar a carga de trabalho, segundo um relato de usuário no plano de $200 mensais, observado a partir de 30 de setembro.

O aumento drástico no consumo sugere que o dot eleva o uso de tokens por tarefa, o que pode forçar revisões de limites de uso e orçamento em fluxos que dependem de agentes, ainda sem confirmação se o padrão se repete em outros usuários ou cargas de trabalho.

*[Fonte: Before dot: 4 days of Codex. After dot: 4 hours.](https://www.reddit.com/r/codex/comments/1x8twjd/before_dot_4_days_of_codex_after_dot_4_hours/) · Reddit r/Codex · sinal da comunidade*

#### Agentes Codex priorizam testes unitários excessivos em detrimento da tarefa principal

Usuários relatam que agentes Codex priorizam a criação excessiva de testes unitários triviais em vez de concluir a tarefa principal. O comportamento gera milhares de validações irrelevantes que consomem a cota de uso do plano.

Assinantes do serviço precisam revisar prompts e limitar a autonomia da ferramenta para evitar o desperdício de recursos em pipelines de código. Como a evidência baseia-se em um relato individual, a frequência desse comportamento em diferentes modelos permanece incerta.

*[Fonte: Funny math of Codex usage and limits](https://www.reddit.com/r/codex/comments/1x8wsha/funny_math_of_codex_usage_and_limits/) · Reddit r/Codex · sinal da comunidade*

#### Extensão Codex no VS Code consome 15GB de armazenamento após desinstalação

Desinstalar a extensão Codex do VS Code liberou 15GB de armazenamento, levantando preocupações sobre uso local de modelos ou dados em cache.

Impacta decisões de despliegue em ambientes com restrições de disco, especialmente em agentes embarcados ou VDs compartilhados.

*[Fonte: Codex extension was using 15GB storage](https://www.reddit.com/r/vscode/comments/1x8wk1l/codex_extension_was_using_15gb_storage/#community-signals) · Reddit r/vscode · sinal da comunidade*

### Engenharia e ecossistema

#### Itaú aplica IA generativa a toda sua base de clientes com interface ia.i e plataforma IARA

O Itaú está usando a interface conversacional ia.i e a plataforma de governança IARA para aplicar sua estratégia AI First a clientes e funcionários. A iniciativa cobre toda a base de clientes em um dos setores mais regulados do Brasil, segundo o registro oficial da OpenAI.

A arquitetura de governança centralizada na IARA serve como referência técnica para camadas de autorização e controle em agentes financeiros que precisam atender exigências regulatórias rigorosas. A evidência não detalha como a plataforma lida com latência em larga escala nem quais métricas de conformidade são aferidas em produção, pontos críticos para quem avalia adotar modelo semelhante.

*[Fonte: How Itaú is building generative AI for its entire customer base](https://openai.com/index/itau-generative-ai) · OpenAI Blog · fonte primária*

## Leitura do conjunto

A versão v1.106.0 do LiteLLM introduz um mecanismo crítico de segurança ao assinar todas as imagens Docker com cosign, permitindo verificação criptográfica contra manipulações — essencial para ambientes de agente que dependem de cadeias de suprimento confiáveis. Paralelamente, relatos de usuários do Codex revelam que a integração com o dot para coordenação de cargas de trabalho aumentou drasticamente o consumo de tokens, reduzindo a duração de um plano semanal de $200 de dias para horas, o que exige ajustes em orçamento e limites de uso. Além disso, há um padrão observado de agentes Codex gerando volumes excessivos de testes unitários triviais, desviando foco das tarefas principais e desperdiçando computação, sinalizando necessidade de guards em prompts ou limites de autonomia. Esses achados são contrastados com a adoção empresarial no Itaú, que usa a interface ia.i e a plataforma IARA para governar IA em escala em um setor altamente regulado, mostrando um caminho para combinar inovação com controle. Por fim, o consumo inesperado de 15GB de armazenamento pela extensão Codex no VS Code sugere que componentes locais podem estar armazenando modelos ou dados de forma não otimizada, relevante para decisões de despliegue em ambientes com restrições de recursos.

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

1. [v1.106.0](https://github.com/BerriAI/litellm/releases/tag/v1.106.0) — LiteLLM Releases
2. [Before dot: 4 days of Codex. After dot: 4 hours.](https://www.reddit.com/r/codex/comments/1x8twjd/before_dot_4_days_of_codex_after_dot_4_hours/) — Reddit r/Codex
3. [Funny math of Codex usage and limits](https://www.reddit.com/r/codex/comments/1x8wsha/funny_math_of_codex_usage_and_limits/) — Reddit r/Codex
4. [How Itaú is building generative AI for its entire customer base](https://openai.com/index/itau-generative-ai) — OpenAI Blog
5. [Codex extension was using 15GB storage](https://www.reddit.com/r/vscode/comments/1x8wk1l/codex_extension_was_using_15gb_storage/#community-signals) — Reddit r/vscode

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-10-18.*
