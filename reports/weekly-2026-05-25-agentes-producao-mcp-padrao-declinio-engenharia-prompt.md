---
title: "Relatório Semanal: Agentes em Produção, MCP como Padrão, e o Declínio da Engenharia de Prompt Tradicional"
date: "2026-05-25"
tags: ["weekly-report", "ai-agents", "llm", "mcp", "gemini-3.5", "agent-architecture"]
summary: "Google I/O 2026 lançou Gemini 3.5 com ação integrada, Anthropic adquiriu Stainless para turbinar MCP, OpenAI resolveu problema matemático de 80 anos com Codex, e o ecossistema de agentes amadurece com identidade descentralizada (Uber), zero-trust (Versa) e diffusion LMs (NVIDIA). A engenharia de prompt tradicional dá lugar a camadas de controle programáticas e skills verificadas."
---

## 1. Resumo da Semana

Semana histórica para agentes de IA. Três movimentos definem o momento:

1. **Agentes viraram infraestrutura crítica** — Google I/O 2026 lançou Gemini 3.5 com `action` como primitiva nativa; Anthropic adquiriu a Stainless (SDKs + MCP tooling); OpenAI foi nomeada Leader no Gartner Magic Quadrant para Coding Agents pelo terceiro ano consecutivo.
2. **MCP (Model Context Protocol) é o novo padrão de integração** — Da aquisição da Stainless pela Anthropic ao controle zero-trust da Versa, todo mundo está apostando em protocolo aberto para conectar agentes a sistemas legados.
3. **Engenharia de prompt tradicional está morrendo** — Artigos do Towards Data Science, NVIDIA, e XDA convergem: prompts soltos não bastam. O futuro são **skills verificadas**, **control layers programáticos**, e **agent harnesses** com governança embutida.

## 2. Grandes Lançamentos e Notícias

### Google I/O 2026: Gemini 3.5 e a Era Agentic

O Google liberou **Gemini 3.5** — não apenas um modelo de fronteira, mas uma plataforma onde "frontier intelligence" e "action" são integradas no mesmo runtime ([Google AI Blog](https://blog.google)). O modelo nativamente suporta:
- **Tool calling com reasoning unificado** — sem camadas de orchestration externas
- **Google AI Studio** como IDE visual para agentes, permitindo prototipação sem código
- **Agent Development Kit (ADK) para TypeScript**, code-first, com suporte a MCP

Além disso, **AI Mode** no Search completou um ano e os usuários estão migrando de keywords para queries em linguagem natural em escala. No Workspace, novas capacidades de voz no Gmail, Docs, Keep, e o **AI Inbox** prometem automatizar triagem de email com agentes especializados.

### Anthropic: Stainless, Gates Foundation, e Agentes Financeiros

A semana mais movimentada da Anthropic:
- **Aquisição da Stainless**: o time que construiu SDKs para OpenAI, Anthropic, e Mistral agora trabalha full-time em MCP servers. A mensagem é clara: agentes são tão capazes quanto os sistemas que conseguem acessar ([Anthropic News](https://anthropic.com/news)).
- **US$ 200M com Gates Foundation**: créditos Claude para saúde global, educação, e mobilidade econômica.
- **10 templates de agentes financeiros** lançados como plugins no Claude Cowork e Claude Code: pitchbooks, KYC screening, fechamento contábil mensal — casos reais com código executável.
- **Parceria de US$ 200M com Blackstone, H&F, Goldman Sachs** para formar uma nova empresa de serviços de IA enterprise.
- **KPMG integrando Claude** para 276.000 funcionários em 138 países — maior implantação enterprise de LLM da história até agora.
- **PwC expandindo aliança** para usar Claude em tecnologia, execução de deals, e reinvenção de funções enterprise.
- **Claude para Small Business**: conectores prontos para Google Workspace, Slack, e CRMs populares.
- **Project Glasswing**: esforço colaborativo com ~50 parceiros para garantir segurança de software crítico antes que modelos avançados sejam usados como armas.

### OpenAI: Codex em Todo Lugar

- **Gartner Leader** pelo terceiro ano consecutivo no Magic Quadrant para Enterprise AI Coding Agents.
- **Virgin Atlantic** usou Codex para shipar app mobile reformulado dentro de um deadline fixo, atingindo cobertura de testes unitários quase total e zero P1 defects.
- **Ramp** acelera code review com Codex + GPT-5.5: feedback substantivo em minutos, não horas.
- **Parceria Dell**: Codex disponível em ambientes híbridos e on-premise para enterprises com restrições de dados.
- **Milestone matemático**: modelo OpenAI derrubou conjectura de 80 anos no problema da distância unitária em geometria discreta — primeiro resultado matemático comprovável gerado por IA.
- **Content Provenance**: suporte a Content Credentials + SynthID + ferramenta de verificação para IA generativa.

### NVIDIA: Skills Verificadas para Agentes

A NVIDIA lançou **NVIDIA-Verified Agent Skills** — um programa de governança de capacidades para agentes de IA ([NVIDIA Developer Blog](https://developer.nvidia.com)). Cada skill passa por validação de:
- Segurança (sandboxing, permissões mínimas)
- Qualidade de saída (precisão medida contra ground truth)
- Eficiência computacional (limites de tokens e latência)

Isso é um marco: pela primeira vez, skills de agente seguem um padrão de certificação similar a NVIDIA-Certified Systems para hardware.

### Hugging Face: Diffusion LMs, Embeddings Multilíngues, e Open Agent Leaderboard

- **Nemotron Diffusion Language Models**: NVIDIA demonstrou que LMs baseados em difusão podem gerar texto com latência comparável a modelos autorregressivos, mas com **throughput muito maior** — promessa de "speed-of-light text generation". A implicação para agentes é enorme: inference em lote com dezenas de milhares de tokens/segundo.
- **Ettin Reranker Family**: novo family de rerankers com desempenho superior em retrieval-augmented generation (RAG), essencial para agentes que precisam buscar contexto em bases grandes.
- **Granite Embedding Multilingual R2**: embeddings multilíngues com contexto de 32K, Apache 2.0, melhor qualidade de retrieval entre modelos sub-100M. Vital para agentes globais.
- **Open Agent Leaderboard**: benchmark padronizado para avaliar agentes em tarefas do mundo real — navegação web, uso de API, execução de código, e tomada de decisão multietapa.
- **vLLM V0 → V1**: correções de RL para scheduling de requisições com continuous batching assíncrono — avanço crucial para escalar agentes concorrentes.

### VSCode 1.114–1.122: O Harness do Copilot

A Microsoft liberou 9 atualizações do VSCode em sequência (1.114 a 1.122), com destaque para o artigo **"The Coding Harness Behind GitHub Copilot in VS Code"**. O conceito de "coding harness" — a camada de infraestrutura que orquestra modelos, ferramentas, agentes e providers — é hoje o diferencial competitivo, não o modelo em si.

### GitHub Accessibility Agent

GitHub criou um **agente de acessibilidade de propósito geral** experimental que automatiza auditoria de contraste, navegação por teclado, e roles ARIA. O aprendizado principal: agentes de QA precisam de **feedback loops visuais** (screenshots + DOM) e **instruções em linguagem natural** para serem úteis em produção.

## 3. Análise de Arquitetura de Agentes

### Identity Crisis (Uber) — Agentes Precisam de Identidade

A Uber publicou um artigo seminal sobre o **problema de identidade para agentes de IA** ([Uber Engineering Blog](https://uber.com)). O insight central:

> Agentes não podem compartilhar identidades de usuário humano porque violam modelos de confiança, auditoria, e least privilege.

A solução proposta é uma **arquitetura de identidade descentralizada** onde cada agente tem:
- Um **principal próprio** (service account + claims OAuth2 customizadas)
- **Credenciais rotacionáveis** com escopo explícito (ler planilha X, nunca deletar)
- **Policy-as-Code** vinculada ao agente, não ao usuário
- **Audit trail** com non-repudiation via signing de ações

Isso resolve o problema clássico de "agente que tem acesso demais porque roda como o usuário".

### MCP + CRDTs: Memória Permanente para Agentes

A combinação de MCP com CRDTs (Conflict-free Replicated Data Types) propõe que agentes mantenham estado compartilhado entre sessões sem um banco central ([HackerNoon](https://hackernoon.com)). Cada ferramenta MCP expõe operações CRDT, permitindo que múltiplos agentes colaborem no mesmo estado sem locks ou consistência eventual frustrante.

### Zero-Trust MCP (Versa)

A Versa aplicou **zero-trust** sobre o MCP ([SiliconANGLE](https://siliconangle.com)):
- Cada chamada de tool MCP passa por **policy enforcement point** (PEP)
- Decisões de autorização são baseadas em **contexto completo**: identidade do agente, dados sendo acessados, operação, horário, e histórico
- **Continuous verification**: o agente perde acesso se comportamento desvia da política

### AWS: Lifecycle Prático para Agentes em Startups

A AWS publicou um guia prático de lifecycle para arquitetura de agentes em startups ([AWS Blog](https://aws.amazon.com/blogs/)):
1. **Discovery phase**: prompt prototyping com Amazon Bedrock
2. **Harness phase**: adicionar guardrails, logging, e tracing com CloudWatch
3. **Production phase**: scaling com caching de embeddings, rate limiting, e human-in-the-loop
4. **Optimization phase**: fine-tuning do modelo vs. otimização de prompt vs. RAG — qual dá melhor ROI

O framework é útil porque explicita que **70% do custo operacional de agentes está em observabilidade e governança**, não no modelo.

### DeepMind: Como Agentes Rodam no Google

O StartupHub.ai cobriu a palestra do DeepMind sobre como agentes operam em produção no Google ([StartupHub.ai](https://startuphub.ai)). Destaques:
- **Unified action graph**: todas as ferramentas e APIs são representadas como um grafo de ações, não como funções isoladas
- **Routing dinâmico**: o modelo escolhe não só qual ferramenta, mas qual "caminho" de execução (sequencial, paralelo, condicional) com base no contexto
- **Observabilidade como primitiva**: cada nó do grafo emite métricas de latência, custo, e acurácia — o modelo aprende a evitar caminhos que falham frequentemente

### Specialization Beats Scale (Hugging Face)

Artigo do HF Blog argumenta que modelos especializados (fine-tunados para domínio) superam modelos maiores e genéricos em custo-benefício para agentes. A implicação arquitetural: em vez de um modelo gigante que faz tudo, use **um router (pequeno) + vários especialistas pequenos**. Isso reduz latência, custo, e complexidade de manutenção.

## 4. Melhores Práticas e Padrões de Código

### Agent Development Kit (ADK) para TypeScript

O Google liberou o **Agent Development Kit (ADK)** para TypeScript, code-first ([Google Blog](https://blog.google)). Padrão recomendado:

```typescript
// ADK: Agent with typed tools and MCP
const agent = new Agent({
  model: 'gemini-3.5-pro',
  tools: [searchTool, dbQueryTool, emailTool],
  mcpServers: [
    { name: 'github', url: 'https://mcp.github.com/sse' },
    { name: 'jira', url: 'https://mcp.atlassian.com/sse' }
  ],
  systemPrompt: systemPrompt, // evolui via self-improvement
  maxTokens: 8192
})

await agent.run('Find open PRs and summarize their risk')
```

Por que isso importa: ADK elimina a necessidade de frameworks de orchestration externos — o modelo gerencia o grafo de execução.

### Control Layer (Towards Data Science)

Artigo crítico do TDS mostra que prompt engineering não escala sem **control layer** ([Towards Data Science](https://towardsdatascience.com)). A arquitetura proposta:

```typescript
interface ControlLayer {
  pre:   (input, ctx) => Promise<SanitizedInput>
  guard: (input, ctx) => Promise<Allow | Deny>
  run:   (input, ctx) => Promise<Output>
  post:  (output, ctx) => Promise<ValidatedOutput>
  audit: (result) => Promise<void>
}

const codeReviewAgent = withControlLayer({
  pre: validateLanguageAndScope,
  guard: checkFilePermissions,
  run: geminiGen,
  post: ensureNoSecretsInOutput,
  audit: logToSplunk
})
```

A diferença fundamental: prompts viram **configuração**, não lógica. Lógica fica no control layer (testável, versionável, auditável).

### Claude Skills vs. Prompts (XDA)

A XDA publicou uma análise cirúrgica: "Claude Skills aren't prompts" ([XDA](https://xda.com)). Skills são:
- **Reutilizáveis** (prompts são one-off)
- **Versionáveis** (git diff mostra mudanças na skill)
- **Componíveis** (várias skills combinadas = novo comportamento)
- **Testáveis** (cada skill tem casos de teste embutidos)

A confusão entre prompt e skill é o maior erro de adoção de agentes hoje.

### NVIDIA-Verified Agent Skills

```yaml
# Exemplo de skill verificada NVIDIA
name: code-reviewer
version: 2.1.0
capabilities:
  - scope: security
    checks: [secret-detection, sql-injection, xss]
  - scope: performance
    checks: [n-plus-one, memory-leak, bundle-size]
verified: true
sandbox: containerized
max_latency_ms: 3000
```

Skills verificadas seguem o princípio de **capability governance**: o agente só pode fazer o que a skill declara. Fora disso, o runtime bloqueia.

### React Best Practices Skill (Vercel)

Vercel liberou um skill para agentes de código com **40+ regras de performance React** ([InfoQ](https://infoq.com)). Regras incluem:
- `useMemo`/`useCallback` só quando profiling mostrar benefício
- Server Components como default, Client Components só quando interatividade é necessária
- Streaming com `loading.tsx` e `Suspense` boundaries em cada rota
- Cache de fetch com `next: { revalidate }` ou `cache: 'force-cache'`
- Bundle analysis automática no CI

### TypeScript com React (SitePoint + Tech Insider)

O SitePoint e Tech Insider convergem nas práticas de TypeScript com React:
- Use **satisfies** operator em vez de type assertions
- **Discriminated unions** para estados de componente (loading, success, error, empty)
- Generics em hooks customizados para type safety máximo
- Prefira `interface` para APIs públicas e `type` para uniões/complexos

### GitHub Copilot Code Review Instructions

GitHub liberou a capacidade de **custom instructions para code review** via arquivos de instrução no repositório ([GitHub Blog](https://github.blog)). Prática recomendada:

```markdown
# .github/copilot-instructions.md

## Code Review Guidelines
- Every PR must have at least 80% line coverage
- No secrets, API keys, or hardcoded credentials
- Prefer early returns over nested if/else
- Validate all user input at the boundary
- Flag any `any` type — must be justified in comment
```

Isso transforma o Copilot de um autocomplete glorificado em um **code review agent alinhado às políticas do time**.

## 5. Conclusão e Próximos Passos

### Três Tendências que Definem o Futuro Imediato

1. **Agentes com identidade própria** — Uber, Versa, e NVIDIA estão criando as camadas de governança que enterprises exigem para colocar agentes em produção. Espere que OAuth2 para agentes vire padrão até o fim de 2026.

2. **MCP como o HTTP dos agentes** — Com Stainless na Anthropic, zero-trust da Versa, e ADK do Google suportando MCP nativamente, o protocolo está se consolidando. A batalha não é mais se MCP vai vencer, mas **como gerenciar centenas de tools MCP** em produção.

3. **O fim da engenharia de prompt como conhecemos** — Prompt engineering always matters, mas não escala como único mecanismo de controle. A combinação de **verified skills + control layers + policy-as-code** está criando uma nova disciplina: **Agent Engineering**. O prompt vira um parâmetro de configuração, não a lógica central.

### O Que Esperar nas Próximas Semanas

- **Codex on-prem (Dell)**: empresas reguladas finalmente poderão adotar coding agents sem enviar dados para nuvem.
- **Open Agent Leaderboard (HF)**: benchmark padronizado vai acelerar comparação objetiva entre agentes.
- **Gemini 3.5 em produção**: Google está atualizando todos os produtos (Search, Workspace, Cloud) com o novo modelo.
- **Agentes financeiros da Anthropic**: templates de código aberto para KYC, fechamento contábil, e pitchbooks — watch this space.
- **Diffusion LMs (NVIDIA)**: se a promessa de throughput se confirmar, a arquitetura de inference para agentes muda radicalmente.

> **Conclusão**: A semana mostrou que agentes não são mais experimentos de pesquisa. São plataforma. A corrida agora é por **ferramentas de produção**: identidade, governança, observabilidade, e protocolos abertos. Quem dominar essas camadas — não o modelo — vai definir a próxima década do desenvolvimento de software.


---
*Gerado por evo-agent — agente auto-aprimorante em 2026-05-25*
