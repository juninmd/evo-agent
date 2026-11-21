---
layout: article
title: "Anthropic precifica oferta pública inicial e Ollama lança v0.40.17 com suporte a Claude Code"
date: "2026-11-21"
tags: ["weekly-report", "hacker-news", "ollama", "litellm", "cline", "reddit", "front-page", "local-ai", "llm-framework", "coding-agent", "openai-codex"]
summary: "Anthropic anuncia precificação de oferta pública inicial. Ollama lança v0.40.17 com Inkling 2 Mini e lançamento diferido de ferramentas MCP para Claude Code."
reading_time: 6
---

{% raw %}
# Anthropic precifica oferta pública inicial e Ollama lança v0.40.17 com suporte a Claude Code

**Período analisado:** 15/11/2026 a 21/11/2026 · 6 pautas · 4 fontes primárias · 2 sinais da comunidade

## Em 30 segundos

- **Anthropic precifica oferta pública inicial** — Anthropic anunciou a precificação de sua oferta pública inicial, conforme noticiado pelo Hacker News, com 20 pontos e três comentários.
- **Ollama v0.40.17 adiciona Inkling 2 Mini e lançamento diferido de ferramentas MCP** — Ollama v0.40.17 traz Inkling 2 Mini, um modelo de 26B parâmetros com 5.4B ativos e camadas em loop, e suporte a lançamento diferido de ferramentas MCP para Claude Code.
- **LiteLLM 1.108.14 LTS assina imagens com cosign** — LiteLLM libera versão 1.108.14 (LTS) com instruções para verificar assinatura das imagens Docker usando cosign, incluindo certificados de identidade e emissor OIDC do GitHub…
- **Cline v4.1.27 adiciona campo de API key do LM Studio e badge read-only no MCP** — Cline v4.1.27 adiciona um campo de API key nas configurações do LM Studio para servidores com autenticação exigida, exibe badge de read-only no MCP para ferramentas declaradas…
- **Usuários relatam limite de 5 horas do OpenAI Codex para desenvolvedores** — No Reddit r/OpenAI, um usuário discute o uso do OpenAI Codex para desenvolvedores, mencionando que a OpenAI define 30 a 150 mensagens a cada 5 horas e que não considera possível…
- **Reddit discute construção de protocolos agente-a-agente** — No Reddit r/AI_Agents, uma discussão de abril de 2025 questiona se o mundo caminhará para protocolos agente-a-agente, onde agentes contratam outros agentes, ou apenas…

## Destaques

### Engenharia e ecossistema

#### Anthropic precifica oferta pública inicial

A Anthropic anunciou a precificação de sua oferta pública inicial, conforme registro oficial divulgado pelo Hacker News. A movimentação marca a entrada da empresa de inteligência artificial no mercado de capitais.

Equipes de engenharia e produto precisam revisar orçamentos para a adoção de produtos Anthropic. A entrada na bolsa pode alterar preços de APIs, mas a evidência disponível não detalha novos valores, prazos ou condições contratuais.

*[Fonte: Anthropic prices initial public offering](https://www.anthropic.com/news/anthropic-prices-initial-public-offering) · Hacker News · fonte primária*

### Infraestrutura e eficiência

#### Ollama v0.40.17 adiciona Inkling 2 Mini e lançamento diferido de ferramentas MCP

Ollama v0.40.17 inclui o modelo Inkling 2 Mini, um modelo de 26B de parâmetros com 5,4B ativos e camadas em loop, e apresenta o lançamento diferido de ferramentas MCP para o Claude Code. O modelo suporta texto, imagens, chamadas de ferramenta e raciocínio, e atinge 79,2% no SWE-Bench Verified, com tamanho de aproximadamente 20 GB, compatível com Macs equipados com Apple silicon.

A carregamento diferido das ferramentas MCP reduz o uso inicial de memória ao carregar recursos apenas quando necessário, evitando a pré-alocação completa e impactando a eficiência de execução do Claude Code no Ollama.

*[Fonte: v0.40.17](https://github.com/ollama/ollama/releases/tag/v0.40.17) · Ollama Releases · fonte primária*

### Modelos e pesquisa

#### LiteLLM 1.108.14 LTS assina imagens com cosign

A LiteLLM lançou a versão 1.108.14 sob suporte de longo prazo. A imagem ghcr.io/berriai/litellm:lts agora aponta para o último lançamento LTS disponível. O registro oficial instrui a verificação da assinatura com cosign na imagem ghcr.io/berriai/litellm:v1.108.14. O mesmo procedimento vale para litellm-database, litellm-non_root e as imagens do repositório docker.io/litellm.

Quem opera o proxy LiteLLM em produção pode integrar a verificação ao pipeline de implantação, reduzindo o risco de imagens adulteradas na cadeia de suprimentos. A evidência não esclarece se a assinatura impõe custos operacionais adicionais nem se afeta o desempenho do proxy durante a execução.

*[Fonte: 1.108.14 (LTS)](https://github.com/BerriAI/litellm/releases/tag/v1.108.14) · LiteLLM Releases · fonte primária*

### Agentes e ferramentas de desenvolvimento

#### Cline v4.1.27 adiciona campo de API key do LM Studio e badge read-only no MCP

Cline v4.1.27 adiciona campo de API key nas configurações do LM Studio para servidores com autenticação exigida. O painel MCP exibe badge de somente leitura nas ferramentas declaradas como read-only pelo servidor. A visão de conta passa a incluir link para as preferências de uso de dados do aplicativo web.

Quem roda modelos locais via LM Studio ganha suporte direto a servidores autenticados, sem depender de variáveis de ambiente ou proxies externos. O badge reduz o risco de escrita acidental em ferramentas MCP, mas o registro não informa se o editor bloqueia ou apenas sinaliza essas operações. O link de privacidade aponta para configurações externas ao editor.

*[Fonte: v4.1.27](https://github.com/cline/cline/releases/tag/v4.1.27) · Cline Releases · fonte primária*

#### Usuários relatam limite de 5 horas do OpenAI Codex para desenvolvedores

O usuário do Reddit questiona a aplicabilidade efetiva do limite de 5 horas ao agente OpenAI Codex, apontando que, segundo a própria documentação da OpenAI, seriam necessárias entre 30 e 150 mensagens para consumir esse intervalo. A percepção é de que o bloqueio pode não ser uma barreira prática para desenvolvedores experientes, mas a advertência sobre o consumo de créditos permanece presente nos termos de uso. A limitação de taxa impõe um custo direto sobre equipes que dependem de agentes de codificação autônomos para tarefas de rotina, exigindo um planejamento orçamentário mais rígido para evitar interrupções em pipelines de desenvolvimento.

*[Fonte: r/OpenAI on Reddit: openAI nailed it with Codex for devs](https://www.reddit.com/r/OpenAI/comments/1n5iqqj/openai_nailed_it_with_codex_for_devs/) · Reddit r/OpenAI Codex · sinal da comunidade*

#### Reddit discute construção de protocolos agente-a-agente

No Reddit r/AI_Agents, uma discussão de 6 de maio de 2026 aponta que o futuro pode se orientar para protocolos agente-a-agente, nos quais agentes contratam outros agentes, ao invés de evoluir para super-agentes maiores.

Isso afeta quem integra sistemas multiagente ao exigir arquitetura baseada em troca de serviços entre agentes, com possíveis aumentos de custo operacional e riscos de dependência de terceiros não previstos, já que ainda não há consenso sobre padrões de interoperabilidade ou governança desses contratos.

*[Fonte: Interesting comparison of agent protocols vs frameworks : r/AI_Agents](https://www.reddit.com/r/AI_Agents/comments/1t5afve/interesting_comparison_of_agent_protocols_vs/) · Reddit r/Agent Protocols · sinal da comunidade*

## Leitura do conjunto

A semana traz anúncios oficiais de Anthropic, Ollama, LiteLLM e Cline. A Ollama v0.40.17 introduz Inkling 2 Mini com 26B parâmetros e 5.4B ativos, além de carregamento diferido de ferramentas MCP para Claude Code, o que muda a forma como equipes configuram infraestrutura local de modelos e reduzem uso inicial de memória. O LiteLLM 1.108.14 LTS reforça a segurança da cadeia de suprimentos com verificação de assinatura de imagens Docker via cosign, exigindo que equipes de operações validem a procedência antes de implantar o proxy em produção. O Cline v4.1.27 adiciona suporte a chave de API do LM Studio e um badge de read-only no MCP, ajudando a evitar escritas acidentais em ferramentas de servidor. Paralelamente, sinais da comunidade no Reddit trazem preocupações práticas: um usuário questiona o limite de 5 horas do OpenAI Codex para desenvolvedores, citando 30 a 150 mensagens por janela, o que afeta planejamento de uso e custo para agentes de codificação autônomos. Outra discussão r/AI_Agents debate se protocolos agente-a-agente ou super-agentes dominarão, influenciando decisões de arquitetura de sistemas multiagente. A precificação da oferta pública inicial da Anthropic completa o cenário, impactando orçamento e adoção de seus produtos por equipes de engenharia e produto.

## Fontes e Referências

1. [Anthropic prices initial public offering](https://www.anthropic.com/news/anthropic-prices-initial-public-offering) — Hacker News
2. [v0.40.17](https://github.com/ollama/ollama/releases/tag/v0.40.17) — Ollama Releases
3. [1.108.14 (LTS)](https://github.com/BerriAI/litellm/releases/tag/v1.108.14) — LiteLLM Releases
4. [v4.1.27](https://github.com/cline/cline/releases/tag/v4.1.27) — Cline Releases
5. [r/OpenAI on Reddit: openAI nailed it with Codex for devs](https://www.reddit.com/r/OpenAI/comments/1n5iqqj/openai_nailed_it_with_codex_for_devs/) — Reddit r/OpenAI Codex
6. [Interesting comparison of agent protocols vs frameworks : r/AI_Agents](https://www.reddit.com/r/AI_Agents/comments/1t5afve/interesting_comparison_of_agent_protocols_vs/) — Reddit r/Agent Protocols

<!-- evo-agent model: cloud/auto -->
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-11-21.*
