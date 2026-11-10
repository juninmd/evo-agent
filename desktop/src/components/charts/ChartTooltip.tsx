import type { ReactNode } from "react";

/**
 * Leitura do ponto em destaque. `x`/`y` sao px dentro do container do grafico;
 * a posicao horizontal e contida para a caixa nao sair do card.
 */
export default function ChartTooltip({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: ReactNode;
}) {
  const margin = Math.min(88, width / 2);
  const left = Math.min(Math.max(x, margin), Math.max(margin, width - margin));
  return (
    <div aria-hidden="true" className="evo-tooltip" style={{ left, top: y }}>
      {children}
    </div>
  );
}
