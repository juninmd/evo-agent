# Revisão editorial — edições de 05/10 a 03/11/2026

Amostra: 31 edições diárias (`gh-pages/articles/`), mais radar, jornal e semanais listados.
Método: leitura da edição de 03/11 e checagens automáticas (título/resumo × corpo, URLs e temas repetidos, bloco de ranking).

## Veredito

Útil em parte, com *slop* recorrente. O núcleo (release notes primárias, regressões e custos relatados por usuários) tem valor.
O que derruba a qualidade é o enquadramento e o enchimento, não a coleta.

## Achados

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| 1 | Título/resumo afirmam o que o corpo não diz | 03/11: título cita "900 bilhões de dólares" e resumo "senhas no processo zsh de comandos curl"; nenhum dos dois aparece no texto. 4 de 31 edições com >45% das palavras do título/resumo sem lastro no corpo (21/10, 26/10, 01/11, 03/11) | Alta — desinformação |
| 2 | Item com fonte e texto desencontrados | 03/11: "Claude Code pede confirmação…" cita release do Copilot CLI; o parágrafo sai truncado ("A versão do `Copilot CLI Releases` com o registro oficial demonstra…") | Alta |
| 3 | Tabela de ranking idêntica todo dia | 31/31 edições com "Sem alterações no ranking" e as mesmas 10 linhas | Média — enchimento |
| 4 | Mesma história em edições seguidas | Troca da chave de assinatura cosign do LiteLLM em 6 edições (11/10, 12/10, 18/10, 20/10, 24/10, 25/10), uma por versão. O guard de versão (#53/#55) trata cada patch como história nova | Alta |
| 5 | Pautas sem utilidade para engenharia | Game Off/SHIFT, aumento de bounty da OpenAI, "agente Sol oferece CAPTCHA" (relato único). Entram para cumprir as cotas (mín. 5 pautas, ⅓ Reddit, 1 de cada comunidade em foco, ½ primárias) | Média |
| 6 | "Por que importa" genérico | "Empresas … devem atualizar canais de divulgação", "devem revisar o manuseio de credenciais" — serve para qualquer notícia | Média |
| 7 | "Leitura do conjunto" sem tese | 03/11 só enumera as pautas e liga Game Off ao "foco em mudança de perspectiva técnica" | Média |

## Corrigido neste PR

- **#1** `title-grounding.ts`: após a expansão, título e resumo são comparados com o corpo publicado. Número ausente ou >45% de palavras sem lastro → título e resumo são refeitos a partir dos headlines e do fato central das pautas publicadas (fundamentados por construção). Calibrado nas 198 edições existentes; flagra 03/11 e 26/10.
- **#3** O ranking só entra na edição diária quando há mudança (`onlyWhenChanged`). O radar mantém o comportamento atual.
- **#5 (parcial)** `EVENT_PROMO` na curadoria descarta game jams, hackathons, webinars, sorteios e chamadas de inscrição como `low-information`.

## Também corrigido

- **#4** O prompt editorial recebe as fontes parecidas (cosseno ≥ 0,80) com pautas publicadas nos últimos dias e só aceita se a evidência trouxer fato novo. A deduplicação semântica não foi afrouxada: o guard de versão (#53/#55) segue valendo, porque não há como separar "patch repetido" de "release nova" só pelo vetor.
- **#5** O modelo atribui `utility` (1–5) a cada pauta. Pautas abaixo de 3 saem **somente se** o rascunho restante ainda cumprir todas as regras e cotas (`pruneLowUtility`).
- **#2** O headline não pode citar número nem nome próprio (exceto a 1ª palavra) ausente do título, resumo ou nome da fonte citada.
- **#6** `whyItMatters` do tipo "devem revisar/atualizar/avaliar" sem crase nem número é rejeitado, com feedback ao modelo.
- **#7** O fechamento abre com uma tese e ignora pautas que não a sustentam.
- **Métrica** `validateArticle` (e portanto `benchmark:editorial` e a publicação) rejeita título ou resumo com número ausente do corpo.

## Limites conhecidos

- A checagem de palavras (>45 %) só reescreve título/resumo; não bloqueia a publicação, porque paráfrase legítima gera falso positivo.
- A repetição de tema (#4) depende do modelo obedecer ao prompt; vale medir a taxa depois de alguns dias de edições.
