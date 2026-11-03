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

## Proposta (não implementada)

1. **Cooldown por produto+tema (#4).** Antes do `repeat-story`, comparar o *resumo* do candidato com as pautas dos últimos 7 dias do mesmo produto. Só publica se trouxer fato novo; senão vira uma linha em "Também saiu" ou é omitido. O guard de versão continua valendo para modelos, não para patches do mesmo componente.
2. **Cotas como piso suave (#5).** Hoje a cota de comunidade/Reddit/primárias força pauta fraca. Trocar por: cada pauta recebe `utility` 1–5 do modelo (decisão concreta que o leitor toma); abaixo de 3 sai, e as cotas se reduzem para o que sobrar. Edição de 5 boas pautas vale mais que 10 com 4 de enchimento.
3. **Checagem de fonte × headline (#2).** Em `validateEditorialDraft`, produto e número do headline devem aparecer no título/resumo da fonte citada; senão rejeita com feedback ao modelo.
4. **Detector de "por que importa" genérico (#6).** Rejeitar `whyItMatters` que só traga "devem revisar/atualizar/avaliar" sem objeto específico (versão, flag, custo, componente).
5. **Fechamento com tese (#7).** Pedir uma afirmação testável e a pauta que a sustenta; sem tese, omitir a seção em vez de enumerar.
6. **Métrica contínua.** Rodar `ungroundedClaims` e a taxa de repetição de tema em `benchmark:editorial`, para a regressão aparecer no CI.
