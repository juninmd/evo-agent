import type { ReactNode } from "react";

/** Numero grande com rotulo e dica: a unidade de leitura da Visao geral. */
export default function StatTile({
  label,
  value,
  hint,
  tone,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "ok" | "warn" | "danger";
  /** Complemento sob o numero (um medidor, por exemplo). */
  children?: ReactNode;
}) {
  const valueTone =
    tone === "danger"
      ? "text-danger"
      : tone === "warn"
        ? "text-warn"
        : tone === "ok"
          ? "text-ok"
          : "text-fg";

  return (
    <div className="evo-card p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-faint">
        {label}
      </div>
      {/* Algarismos proporcionais: `tabular-nums` so alinha colunas, e num
          numero solto deixa o "1" com buracos em volta. */}
      <div
        className={`mt-1 text-xl font-semibold leading-7 tracking-tight ${valueTone}`}
      >
        {value}
      </div>
      {children && <div className="mt-1.5">{children}</div>}
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
