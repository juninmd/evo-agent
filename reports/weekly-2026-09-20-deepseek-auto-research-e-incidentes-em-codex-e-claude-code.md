---
layout: article
title: "DeepSeek, Auto‑Research, e Incidentes em Codex e Claude Code"
date: "2026-09-20"
tags: ["weekly-report", "hf", "openrouter:", "github", "vscode", "reddit", "tabnews", "papers", "research", "models", "launches"]
summary: "Compression inteligente de KV cache e novos harnesses impulsionam agentes, enquanto relatos de Reddit revelam bloqueios em Codex e ajustes de cache em Claude Code."
reading_time: 11
---

{% raw %}
# DeepSeek, Auto‑Research, e Incidentes em Codex e Claude Code

**Período analisado:** 15/09/2026 a 21/09/2026

Compression inteligente de KV cache e novos harnesses impulsionam agentes, enquanto relatos de Reddit revelam bloqueios em Codex e ajustes de cache em Claude Code.

## Destaques

### DeepSeek-V4.1-Flash: compressão KV eficiente

O DeepSeek-V4.1-Flash introduz a compressão de cache KV para mitigar os custos de prefill e a pressão sobre HBM, SSD e largura de banda de transferência. A solução ataca os gargalos de computação e armazenamento gerados pela adoção de agentes de longo horizonte, cujas cargas de trabalho são intensas em entrada.

A mudança facilita a orçamentação de infraestrutura para agentes avançados ao reduzir despesas de inferência. Operadores de software podem escalar contextos longos com menor consumo de hardware. A evidência não detalha a taxa exata de compressão nem a possível perda de precisão nas respostas.

[Fonte: DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression](https://huggingface.co/papers/2609.19969)

### GLM‑5.3‑FlashX: multimodal 200 tokens/s

A Z.ai lançou o GLM-5.3-FlashX, variante de alta velocidade do modelo multimodal GLM-5.3-Flash. A arquitetura combina atenção linear e esparsa para entregar inferência de até 200 tokens por segundo e janela de contexto de 1.048.576 tokens.

A baixa latência permite otimizar a arquitetura de frontend em aplicações multimodais críticas. O desenvolvedor ganha agilidade na resposta do sistema, embora a evidência não detalhe a estabilidade do desempenho ao preencher a janela total de contexto.

[Fonte: Z.ai: GLM 5.3 FlashX](https://openrouter.ai/z-ai/glm-5.3-flashx)

### Claude em preview no Azure AI Foundry

A Azure AI Foundry disponibiliza, em preview, tenant sem quota para todos os modelos Claude da Anthropic, mas o suporte a pequenas empresas foi negado.

Para desenvolvedores e equipes de operação, a ausência de limite de uso permite testar e escalar projetos sem preocupação imediata com custos. A recusa no suporte gera dúvida sobre a viabilidade de adoção em ambientes corporativos que dependem de assistência técnica.

[Fonte: Claude models are now available in public preview in Microsoft ...](https://www.reddit.com/r/ClaudeAI/comments/1p0fdul/claude_models_are_now_available_in_public_preview/)

### Mistral OCR 4 disponibiliza bounding boxes

API Mistral OCR 4 fornece caixas delimitadoras para blocos de texto PDF.

Permite extração estruturada, reduz overhead de pós‑processamento.

[Fonte: Mistral OCR API provide the bounding boxes for the PDF text blocks?](https://www.reddit.com/r/MistralAI/comments/1jf3vh0/mistral_ocr_api_provide_the_bounding_boxes_for/)

### Mestrado de OCR free/low‑cost

Mistral OCR 4 foi anunciado como uma alternativa custo‑efetiva, reunindo 573 upvotes e 56 comentários na comunidade técnica. A repercussão indica aceitação inicial do modelo como opção viável para reduzir despesas de processamento de documentos em pipelines internos, sem depender exclusivamente de APIs pagas de grande porte.

Na prática, equipes podem substituir serviços onerosos por esse modelo gratuito ou de baixo custo, diminuindo o custo por página e simplificando a arquitetura de ingestão de dados não estruturados. A evidência não traz benchmarks de acurácia, latência ou suporte a idiomas, nem detalha limites de uso ou licenciamento, o que exige validação própria antes de colocar em produção crítica.

[Fonte: OCR Payment : r/MistralAI - Reddit](https://www.reddit.com/r/MistralAI/comments/1jb18xs/ocr_payment/)

### Mistral OCR 4 @ API com docx e outros formatos

O Mistral OCR 4 aceita arquivos docx, pdf e outros ao ser chamado pela API, retornando o texto extraído em português. A confirmação vem de postagens no Reddit com milhares de upvotes descrevendo o suporte a esses formatos.

Para desenvolvedores isso significa que pipelines de extração de informação com documentos corporativos podem substituir softwares proprietários por chamadas simples à API, reduzindo tempo de implementação. A documentação não especifica limites de tamanho de arquivo nem taxa de chamadas mensais, deixando aberto o risco de bulking e custos inesperados. Além disso, não há garantias de cobertura completa de todas as variações de formatação do Word, exigindo testes de validação em ambientes de produção.

[Fonte: OCR with docx, etc. Does it work in the API? : r/MistralAI - Reddit](https://www.reddit.com/r/MistralAI/comments/1lkzve3/ocr_with_docx_etc_does_it_work_in_the_api/)

### SoL‑Pi: loops auto‑research escaláveis

O SoL-Pi utiliza loops de auto-research recursivos em ambientes diversos para escalar o aprimoramento de agentes. A abordagem foca na eficiência de tokens para transformar trajetórias de raciocínio e uso de ferramentas em melhorias reutilizáveis na camada de harness.

A técnica reduz custos de engenharia ao permitir que agentes evoluam autonomamente em produção. A operação migra da supervisão constante para a exploração independente. Resta definir a estabilidade dessas melhorias em larga escala fora dos ambientes de teste.

[Fonte: SoL-Pi: Recursively Scaling Auto-Research Loops for Efficient Agent Harness](https://huggingface.co/papers/2609.20519)

### Análise de componentes de harness de coding agents

Estudo com plano de execução fixo testou planejamento, espaço de ação e gestão de contexto em quatro modelos.

Permite desagregar métricas de desempenho, orienta design de harnesses mais eficientes.

[Fonte: An Empirical Study of Harness Design for Coding Agents](https://huggingface.co/papers/2609.20804)

### Novos modelos e review no GitHub Copilot

Copilot adiciona seleção de modelos, code‑review melhorado e integração Sentry.

Alterações de fluxo e monitoramento mais confiável para equipes de desenvolvimento.

[Fonte: GitHub Copilot weekly releases — September 14](https://github.blog/changelog/2026-09-18-github-copilot-weekly-releases-september-14)

### Runtime Copilot em Rust

O GitHub Copilot migrou o runtime de 800 mil linhas de JavaScript para Rust. A transição foi concluída usando o próprio Copilot para portar o código. O resultado foi um código mais enxuto, com 5× menos linhas de produção em Rust, mantendo a funcionalidade original.

Para desenvolvedores e operadores de IA, a mudança significa menores custos de runtime e aumento de segurança, já que Rust previne erros de memória comuns em JavaScript. A migração reduz a superfície de vulnerabilidade e facilita a integração em sistemas mais críticos. Porém, a evidência não detalha latência ou consumo de recursos, o que deixa em aberto quanto ao ganho de desempenho em ambientes de produção e a compatibilidade com bibliotecas JavaScript já existentes.

[Fonte: Migrating the GitHub Copilot runtime to Rust, using Copilot](https://github.blog/ai-and-ml/generative-ai/migrating-the-github-copilot-runtime-to-rust-using-copilot/)

### Modelo inline de sugestões GitHub Copilot

O GitHub Copilot unificou as funções de preenchimento automático, a próxima edição e as sugestões de longa distância em um único modelo inline. Essa mudança arquitetural visa entregar sugestões de código mais rápidas e coesas dentro do ambiente de desenvolvimento.

A unificação reduz a alternância de contexto no editor e melhora a fluidez de quem constrói software com IA. Na prática, a operação ganha agilidade com respostas integradas. Resta saber como essa consolidação afeta a precisão de cada modalidade individualmente, já que a evidência não detalha métricas de acurácia.

[Fonte: Building the new GitHub Copilot Inline Suggestions Model: Part One](https://code.visualstudio.com/blogs/2026/09/16/building-the-github-copilot-inline-suggestions-model-part-one)

### Astra 6 “dumb” e perda de produtividade

Usuário relata que Astra 6 gastou grande parte do tempo investigando sem resolver bugs.

Risco de queda de produtividade em equipe que depende de Codex.

[Fonte: Astra 6 became dumb. Could not get anything done the whole weekend.](https://www.reddit.com/r/codex/comments/1wlh9rc/astra_6_became_dumb_could_not_get_anything_done/)

### Aposta de Codex em Nova geração

O usuário Hyper-Jason prevê o lançamento dos modelos GPT-6 Luna, Terra ou Sol durante o DevDay, possivelmente em outubro. A tese sugere que a redução de performance de versões atuais serve para elevar a percepção de qualidade da nova geração.

Essa expectativa altera o planejamento de upgrades em pipelines de código e a escolha de modelos de fronteira. A incerteza reside na confirmação oficial do lançamento e se o modelo Luna manterá custos baixos com desempenho superior ao GPT-5.6 Sol.

[Fonte: GPT6 luna/terra/sol Will Clutch Up](https://www.reddit.com/r/codex/comments/1wljg7s/gpt6_lunaterrasol_will_clutch_up/)

### Codex trava após primeira mensagem

Usuários do Codex relatam a impossibilidade de enviar mensagens subsequentes em chats. A primeira interação funciona normalmente, mas qualquer tentativa de acompanhamento trava no ícone de carregamento. O problema persiste mesmo ao iniciar novas conversas, limitando a ferramenta a respostas únicas.

Essa falha interrompe o fluxo de depuração e a iteração de código, comprometendo a confiabilidade do assistente para tarefas complexas. A operação de software com IA torna-se ineficiente quando a continuidade do diálogo é cortada. Permanece a incerteza sobre a abrangência do erro, pois não há uma correção oficial confirmada.

[Fonte: Codex stops working after the first message in every chat](https://www.reddit.com/r/codex/comments/1wlkggh/codex_stops_working_after_the_first_message_in/)

### Funcionalidade “More Details” falha no Codex

A funcionalidade "More Details" do Codex parou de concluir respostas no modelo GPT 6 Pro após o reset semanal, consumindo a cota limitada de mensagens sem entregar resultado. O sistema chega a invocar ferramentas Python na tentativa de contornar a falha, mas não finaliza a geração de texto esperada.

Na prática, desenvolvedores perdem a capacidade de depurar código complexo ou obter explicações aprofundadas dependendo dessa camada extra de raciocínio, o que quebra fluxos de trabalho que exigem análise iterativa. A evidência não esclarece se o defeito atinge apenas o plano Pro ou se estende a outros tiers, nem se a causa raiz está no modelo, na orquestração da ferramenta ou no próprio mecanismo de reset de cotas.

[Fonte: Codex More Details feature failing to produce responses](https://www.reddit.com/r/codex/comments/1wll1db/codex_more_details_feature_failing_to_produce/)

### Codex controla pipeline de TV 24/7

Usuário descreve uso de Codex para gerenciar Botflix, 4 canais em produção.

Ilustra uso intensivo de LLM em produção, indicando requisitos de escalabilidade.

[Fonte: I gave Codex control of the production pipeline for my 24/7 AI television network](https://www.reddit.com/r/codex/comments/1wlo572/i_gave_codex_control_of_the_production_pipeline/)

### Claude Code lê AGENTS.md

Versão 2.1.277 adiciona suporte a AGENTS.md quando Claude.md não está presente.

Facilita onboarding e customização de projetos sem arquivos de configuração obrigatórios.

[Fonte: Claude Code agora vai ler o AGENTS.md (finalmente!)](https://www.tabnews.com.br/AndreiAlves/claude-code-agora-vai-ler-o-agents-md-finalmente)

### Cache de 1h de Claude Code economiciza recursão

A atualização introduz um cache de uma hora no Claude Code, permitindo que sessões longas evitem o custo de reescrita completa do contexto. Em Fable 5.1, recarregar esse contexto sem o cache custa até 80 vezes mais em tokens do que uma simples leitura. O recurso /keepwarm mantém o cache ativo durante pausas, enviando requisições silenciosas após 50 minutos de inatividade.

Para desenvolvedores, isso reduz custos operacionais em sessões extensas, especialmente ao retomar trabalhos após intervalos. Ainda assim, a evidência não mostra como o comportamento varia em modelos diferentes do Claude nem se o ganho permanece consistente além de 330k tokens, deixando aberto o impacto real em cargas de trabalho diversas.

[Fonte: Reddit: Keep Claude Code’s 1-hour cache warm during breaks. On Fable 5.1, rewriting it costs 80x a cache read.](https://www.reddit.com/r/ClaudeCode/comments/1wj108u/keep_claude_codes_1hour_cache_warm_during_breaks/#community-signals)

### Self‑Evolving Search Index

Os índices de busca agora ajustam automaticamente suas chaves para cada documento, aumentando a qualidade da recuperação sem exigir otimizações pré-definidas. Essa evolução contínua permite que o índice se adapte a diferentes contextos de recuperação, mantendo desempenho estável mesmo com variações nas demandas de informação.

Para desenvolvedores e operadores de sistemas de IA, isso reduz a necessidade de ajuste manual do índice e diminui o risco de falhas em decisões críticas baseadas em recuperação de dados. Ainda assim, a evidência não detalha como esse processo escala em ambientes de alta carga ou quais custos computacionais são envolvidos na evolução contínua das chaves.

[Fonte: Self-Evolving Search Index](https://huggingface.co/papers/2609.19656)

### Vscode Copilot tooltip bug

No VSCode 1.138.0, o tooltip da extensão Copilot pisca quando o cursor fica na lacuna entre o botão e o próprio tooltip. O comportamento ocorre ao posicionar o mouse no espaço estreito entre o ícone do botão e a janela emergente. A falha é reproduzível nas instalações padrão da versão indicada.

A instabilidade impede avaliações precisas de desempenho da ferramenta em ambientes de produção. Desenvolvedores precisam contornar o bug com pausas ou ajustes manuais, gerando perda de tempo e aumento de risco em pipelines automatizadas. A ausência de correção oficial mantém a incerteza sobre a confiabilidade da extensão em projetos críticos.

[Fonte: Reddit: I'm not sure if this is a bug.](https://www.reddit.com/r/vscode/comments/1wl9t7t/im_not_sure_if_this_is_a_bug/#community-signals)

## Leitura do conjunto

A semana mostrou avanços práticos em dois lados da mesma área: compressão de KV e harnesses de agentes, ambos apontando para menores custos de infra e maiores capacidades de auto‑melhoria (DeepSeek‑Flash e SoL‑Pi). Ao mesmo tempo, a comunidade relatou várias falhas críticas em produtos populares: Codex emperrou em 4 dias, a funcionalidade “More Details” ficou inoperante, e a Otention de janela de tooltip no VSCode coloca em risco a tolerância de usuários finais. Enquanto a nova versão do Claude Code simplifica a leitura de AGENTS.md, a necessidade de manter cache quente em sessões longas demonstra o esforço contínuo de reduzir ops‑cost. Essas histórias combinam insights de planejamento de camada a práticas de engenharia, conectando escolhas arquitetônicas com impactos reais de adoção e operação.

## Fontes e Referências

1. [DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression](https://huggingface.co/papers/2609.19969) — HF Daily Papers
2. [SoL-Pi: Recursively Scaling Auto-Research Loops for Efficient Agent Harness](https://huggingface.co/papers/2609.20519) — HF Daily Papers
3. [An Empirical Study of Harness Design for Coding Agents](https://huggingface.co/papers/2609.20804) — HF Daily Papers
4. [Self-Evolving Search Index](https://huggingface.co/papers/2609.19656) — HF Daily Papers
5. [Z.ai: GLM 5.3 FlashX](https://openrouter.ai/z-ai/glm-5.3-flashx) — OpenRouter: New Models
6. [GitHub Copilot weekly releases — September 14](https://github.blog/changelog/2026-09-18-github-copilot-weekly-releases-september-14) — GitHub Changelog
7. [Migrating the GitHub Copilot runtime to Rust, using Copilot](https://github.blog/ai-and-ml/generative-ai/migrating-the-github-copilot-runtime-to-rust-using-copilot/) — GitHub Blog
8. [Building the new GitHub Copilot Inline Suggestions Model: Part One](https://code.visualstudio.com/blogs/2026/09/16/building-the-github-copilot-inline-suggestions-model-part-one) — VSCode Updates
9. [Claude models are now available in public preview in Microsoft ...](https://www.reddit.com/r/ClaudeAI/comments/1p0fdul/claude_models_are_now_available_in_public_preview/) — Reddit (Anthropic Claude model)
10. [Mistral OCR API provide the bounding boxes for the PDF text blocks?](https://www.reddit.com/r/MistralAI/comments/1jf3vh0/mistral_ocr_api_provide_the_bounding_boxes_for/) — Reddit (mistral ocr 4)
11. [OCR Payment : r/MistralAI - Reddit](https://www.reddit.com/r/MistralAI/comments/1jb18xs/ocr_payment/) — Reddit (mistral ocr 4)
12. [OCR with docx, etc. Does it work in the API? : r/MistralAI - Reddit](https://www.reddit.com/r/MistralAI/comments/1lkzve3/ocr_with_docx_etc_does_it_work_in_the_api/) — Reddit (mistral ocr 4)
13. [Astra 6 became dumb. Could not get anything done the whole weekend.](https://www.reddit.com/r/codex/comments/1wlh9rc/astra_6_became_dumb_could_not_get_anything_done/) — Reddit: Codex
14. [GPT6 luna/terra/sol Will Clutch Up](https://www.reddit.com/r/codex/comments/1wljg7s/gpt6_lunaterrasol_will_clutch_up/) — Reddit: Codex
15. [Codex stops working after the first message in every chat](https://www.reddit.com/r/codex/comments/1wlkggh/codex_stops_working_after_the_first_message_in/) — Reddit: Codex
16. [Codex More Details feature failing to produce responses](https://www.reddit.com/r/codex/comments/1wll1db/codex_more_details_feature_failing_to_produce/) — Reddit: Codex
17. [I gave Codex control of the production pipeline for my 24/7 AI television network](https://www.reddit.com/r/codex/comments/1wlo572/i_gave_codex_control_of_the_production_pipeline/) — Reddit: Codex
18. [Claude Code agora vai ler o AGENTS.md (finalmente!)](https://www.tabnews.com.br/AndreiAlves/claude-code-agora-vai-ler-o-agents-md-finalmente) — TabNews
19. [Reddit: I'm not sure if this is a bug.](https://www.reddit.com/r/vscode/comments/1wl9t7t/im_not_sure_if_this_is_a_bug/#community-signals) — Reddit Post Signals (vscode)
20. [Reddit: Keep Claude Code’s 1-hour cache warm during breaks. On Fable 5.1, rewriting it costs 80x a cache read.](https://www.reddit.com/r/ClaudeCode/comments/1wj108u/keep_claude_codes_1hour_cache_warm_during_breaks/#community-signals) — Reddit Post Signals (ClaudeCode)

---

*Gerado por: cloud/auto*
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em 2026-09-20.*
