import { CardBody, CardHeader, Card as SonidoCard } from "@juninmd/sonido";
import type { ReactNode } from "react";

/**
 * `fill` faz o card ocupar a altura livre da aba e rolar por dentro: sem isso,
 * uma tabela curta deixava metade da janela vazia e a pagina inteira rolava.
 * O casco e o `Card` do Sonido; o titulo continua `h2` (o `CardTitle` do pacote
 * sai como `h3` e pularia um nivel de cabecalho dentro do console).
 */
export default function Card({
  title,
  hint,
  actions,
  children,
  className = "",
  fill = false,
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <SonidoCard
      surface="solid"
      padding="none"
      className={`evo-card flex flex-col overflow-hidden ${fill ? "min-h-0 flex-1" : ""} ${className}`}
    >
      {(title || actions) && (
        <CardHeader className="shrink-0 flex-wrap items-center justify-between gap-2 border-b border-edge px-3 py-2">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold text-fg">
                {title}
              </h2>
            )}
            {hint && <p className="text-[11px] text-muted">{hint}</p>}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {actions}
            </div>
          )}
        </CardHeader>
      )}
      <CardBody
        className={fill ? "min-h-0 flex-1 overflow-auto px-3 pb-3" : "p-3"}
      >
        {children}
      </CardBody>
    </SonidoCard>
  );
}
