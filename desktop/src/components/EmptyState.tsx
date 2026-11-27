import { EmptyState as SonidoEmptyState } from "@juninmd/sonido";
import type { ReactNode } from "react";

/**
 * Estado vazio do Sonido com o vocabulario do console: `message` vira titulo,
 * `hint` vira descricao e as acoes vao no slot de acao.
 */
export default function EmptyState({
  message,
  hint,
  children,
}: {
  message: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <SonidoEmptyState
      className="evo-empty"
      title={message}
      description={hint}
      action={children}
    />
  );
}
