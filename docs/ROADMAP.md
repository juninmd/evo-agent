# Roadmap: mais útil, mais interessante, mais direto

Ideias ancoradas no que o código já coleta. Ordem = valor / esforço.

## Mais útil para quem lê

1. **Busca no site.** O arquivo só agrupa por ano/mês. O publisher já tem título, slug e
   resumo de cada edição: emitir `search.json` e filtrar no cliente na página
   `Arquivo`. Sem backend. Toca `site-renderer.ts`.
2. **Feed Atom por ferramenta.** `AGENT_SOURCES` já separa Claude Code, Codex, Copilot CLI,
   Gemini CLI, Cursor e MCP, e o Reddit tem comunidades-foco para as mesmas. Publicar
   `feed/<ferramenta>.xml` deixa o leitor assinar só o que usa.
3. **Changelog consolidado.** Uma página com versão → o que mudou, por ferramenta, sempre
   apontando para a fonte primária (já marcada como tal). O `DEV_TIPS` semanal vira
   consequência dessa tabela, não um texto separado.
4. **`GET /api/v1/search?q=` + caixa de busca no console.** Evidências já ficam em
   `published_evidence`; hoje só dá para navegar edição a edição.

## Mais interessante

5. **Página pública "como o agente evoluiu".** O diferencial do projeto é o loop de
   auto-melhoria, mas o leitor não o vê. `prompt_versions` (candidatos, notas, promoções,
   rollbacks) e `metric_events` já têm os dados; renderizar a linha do tempo com o diff do
   prompt promovido.
6. **Gráfico de modelos ao longo do tempo.** `intelligence_snapshots` (Artificial Analysis)
   é coletado e só serve de insumo textual. Uma série temporal por modelo na edição semanal
   mostra quem subiu e quem caiu.
7. **Marcador de "visto antes".** Reaproveitar as entidades extraídas por GLiNER
   (`agent/entities.ts`, opcional) para sinalizar, na edição, assuntos que reaparecem pela N-ésima
   vez e o que mudou desde a última.

## Mais direto (estrutura e operação)

8. **`RUN_MODE` como tabela.** `src/index.ts` (~590 linhas) despacha por `if`; um mapa
   `modo → handler` permite `npm start -- --help` gerado da mesma tabela do README.
9. **Quebrar arquivos acima de 300 linhas.** `crawler/index.ts` (~1370), `reddit.ts` (~650),
   `store.ts` (~1050), `writer.ts` (~820). Cortes naturais: `sources.ts`
   (`DEFAULT_SOURCES`), HN/TabNews, `store` por entidade (articles, cycles, outbox, state).
10. **README enxuto.** Abrir com URL do site publicado, uma captura e três comandos; mover
    a tabela de variáveis para `docs/CONFIG.md`. O teste `docs-drift.test.ts` já garante que
    a tabela cobre toda variável lida em `src/`.
