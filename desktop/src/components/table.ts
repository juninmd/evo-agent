/**
 * Classes compartilhadas das tabelas. O cabecalho e `sticky` e opaco porque a
 * area da tabela rola dentro do card: sem o fundo, as linhas passariam por baixo
 * do texto do cabecalho.
 */
export const THEAD =
  "sticky top-0 z-10 bg-panel text-left text-[11px] uppercase tracking-wide text-faint";

export const TH = "py-1.5 pr-3 font-medium";
export const TH_LAST = "py-1.5 font-medium";
export const ROW = "border-t border-edge/70 align-top";
export const CELL = "py-1.5 pr-3";
export const CELL_LAST = "py-1.5";
/** Identificadores tecnicos (slug, nome de metrica, cron) em monoespaco. */
export const MONO = "font-mono text-[11px]";

/**
 * Colunas de numero alinham a direita: com `tabular-nums` os digitos ficam em
 * coluna e as ordens de grandeza se comparam de relance.
 */
export const TH_NUM = `${TH} text-right`;
export const TH_NUM_LAST = `${TH_LAST} text-right`;
export const CELL_NUM = `${CELL} text-right`;
export const CELL_NUM_LAST = `${CELL_LAST} text-right`;
