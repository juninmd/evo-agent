# REST API do agente

`RUN_MODE=API` sobe um servidor HTTP sobre o mesmo banco que os ciclos escrevem. Ele é a
fonte do [console desktop](../desktop/README.md) e serve qualquer cliente que precise do
estado operacional sem acesso ao pod.

```bash
RUN_MODE=API \
API_TOKEN=<segredo> \
API_HOST=127.0.0.1 \
API_PORT=8787 \
API_ALLOW_RUNS=false \
npm start
```

## Contrato

- Base: `/api/v1`. Toda resposta é JSON em **camelCase**, inclusive os aliases SQL: o
  console espelha as chaves nos campos das structs, e um `snake_case` escapado quebra o
  cliente em tempo de execução.
- Autenticação: `Authorization: Bearer <API_TOKEN>` em **todas** as rotas de dados. Sem
  token configurado o processo não sobe.
- `GET /healthz` fica fora do token e devolve só `{ status, uptimeSeconds }`, para as probes.
- Corpos de requisição são limitados a 64 KiB e os parâmetros de consulta são validados por
  faixa (`limit` 1..200, `days` 1..60), não apenas confiados.

| Rota | Devolve |
|---|---|
| `GET /healthz` | Liveness, sem autenticação |
| `GET /api/v1/health` | `{ status, reasons, stats, checkedAt }` |
| `GET /api/v1/overview` | Veredito (`health`), `stats`, edições de hoje, ciclos e fontes recentes, ranking de modelos |
| `GET /api/v1/meta` | Modo, fuso, agendamentos, caminho do banco, modos disparáveis |
| `GET /api/v1/editions` | `{ total, offset, items }`. Filtros: `kind`, `status` (notificação), `lifecycle` (`published`/`corrected`/`retracted`), `q` (título, resumo, tags, evidência), `tag`, `from`/`to` (`YYYY-MM-DD`), `maxScore`, `sort` (`date`/`score`), `limit`, `offset`. `total` é a contagem real do filtro |
| `GET /api/v1/editions/:slug` | Uma edição, a evidência preservada e a lista de revisões (sem o corpo) |
| `GET /api/v1/editions/:slug/content` | Markdown de uma revisão (`revision`; a última se omitido) |
| `GET /api/v1/calendar` | Edições por dia nos últimos `days` (1..120) e a meta diária, com os dias vazios preenchidos |
| `GET /api/v1/articles` | Artigos coletados (`days`, `limit`, `source`, `primary`); os filtros valem antes do `limit` |
| `GET /api/v1/sources` | `source_health` cruzado com o volume coletado (`days`) |
| `GET /api/v1/cycles` | Execuções de ciclo (`limit`, `type`, `status`) |
| `GET /api/v1/prompts` | Prompt ativo e o histórico de promoções |
| `GET /api/v1/metrics` | Resumo por métrica (`hours`) e a série de uma (`name`) |
| `GET /api/v1/state` | Só as chaves `last_*` de `agent_state` |
| `POST /api/v1/runs` | Aceita `{ "mode": "DAILY" }` e responde 202 |

Cada edição traz `status` (`published`, `corrected`, `retracted`), `qualityScore` (0-100, `null`
em páginas sem seleção curada, como o radar) e `revision`. Ações sobre edições (reenviar
notificação, retirar) não existem na API, que continua somente leitura: use `npm run edition`.

`overview.health` é só o veredito: os contadores viajam uma vez, em `overview.stats`.
`/api/v1/state` publica apenas as chaves `last_*`; `system_prompt` nunca sai por ali (ele tem
rota própria, em `/prompts`).

Erros: `401` sem token válido, `404` rota desconhecida, `413` corpo grande demais, `400`
parâmetro inválido e `501` quando o disparo está desligado. O corpo de erro é sempre
`{ "error": "<mensagem>" }`.

## Disparo de ciclos

Desligado por padrão. Com `API_ALLOW_RUNS=true`, `POST /api/v1/runs` aceita um dos modos de
`runnableModes` e executa `node dist/index.js` com o `RUN_MODE` correspondente, como processo
filho — a API continua sem escrever no banco, e um ciclo quebrado não derruba o console. Os
modos `DAEMON` e `API` não são disparáveis. Um ciclo em andamento responde `409`.

## Deploy

- Monte o mesmo volume do SQLite usado pelos CronJobs; a API só lê, mas as leituras precisam
  ver o que os ciclos escrevem.
- `API_HOST=0.0.0.0` é necessário para expor o serviço no cluster; o padrão é o loopback.
- Use `/healthz` nas probes `liveness`/`readiness` e mantenha `/api/v1` atrás de TLS.
- `API_CORS_ORIGINS` (lista separada por vírgula) existe só para um cliente no navegador; o
  console desktop não precisa dele, porque fala com a API pelo processo Rust.
