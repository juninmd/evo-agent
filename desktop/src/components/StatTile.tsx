import type { ReactNode } from "react";

/** Numero grande com rotulo e dica: a unidade de leitura da Visao geral. */
export default function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "ok" | "warn" | "danger";
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
      <div className={`evo-num mt-1 text-xl font-semibold ${valueTone}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
