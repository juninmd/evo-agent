# Console do Evo Agent

Painel desktop para a API REST do `evo-agent`: saúde, edições publicadas, fontes, ciclos,
prompts e métricas de um agente publicado, com disparo opcional de ciclos. Tauri 2 com UI
React 19 + Tailwind v4; o token da API vive no processo Rust e nunca chega ao webview.

![Visão geral do console](../../docs/prints/console-visao-geral.png)

## Pré-requisitos

O agente precisa estar servindo a API:

```bash
# no repositório do agente
RUN_MODE=API API_TOKEN=<segredo> API_HOST=127.0.0.1 API_PORT=8787 npm start
```

`API_TOKEN` é obrigatório: o processo se recusa a subir sem ele, e todas as rotas `/api/v1`
exigem `Authorization: Bearer <token>`. Só `/healthz` responde sem credencial, para as probes
do Kubernetes.

## Rodar

```bash
npm install
npm run tauri dev          # app com hot reload
```

Na primeira abertura, informe a URL e o token em **Ajustes** e use **Testar conexão**.
`EVO_AGENT_API_URL` define a URL padrão antes do primeiro salvamento, o que ajuda a apontar
uma build para o cluster sem digitar nada.

```bash
npm run lint               # tsc --noEmit + biome
npm test                   # vitest (lib pura)
npm run e2e                # Playwright: a UI real com o IPC do Tauri simulado
npm run build              # tsc + vite build -> dist/ (obrigatório antes do cargo)
npm run tauri build        # instalador do sistema atual
```

O tema acompanha o sistema ou fica fixo em escuro/claro em **Ajustes**.

## Disparo de ciclos

Os botões de **Execução manual** só aparecem habilitados quando o agente responde
`runsEnabled: true`, o que exige `API_ALLOW_RUNS=true` no deploy. Cada botão pede um ciclo
de um disparo ao agente; o console não executa nada por conta própria e um ciclo em
andamento bloqueia o próximo.

## Onde ficam as configurações

`settings.json` no diretório de configuração do app (`%APPDATA%\com.juninmd.evoagent` no
Windows, `~/.config/com.juninmd.evoagent` no Linux), com a URL e o `API_TOKEN`. O arquivo
fica na máquina do usuário, como um `.env` local: não versione nem compartilhe. O valor é
enviado apenas no cabeçalho `Authorization` e nunca é devolvido ao webview — a UI só sabe se
existe um token salvo.

## Homologação do contrato

`cargo test --test live_api` está ignorado por padrão e valida as structs Rust contra um
agente real — foi ele que pegou o veredito aninhado sem `stats` e um alias SQL fora do camel
case:

```bash
cd src-tauri
EVO_AGENT_API_URL=http://127.0.0.1:8787 API_TOKEN=<segredo> \
  cargo test --test live_api -- --ignored --nocapture
```

O contrato completo de cada rota está em [`../docs/API.md`](../docs/API.md).
