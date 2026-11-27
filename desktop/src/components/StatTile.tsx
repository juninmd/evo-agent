import { StatTile as SonidoStatTile } from "@juninmd/sonido";
import type { ReactNode } from "react";

const TONES = {
  ok: "success",
  warn: "warning",
  danger: "danger",
} as const;

/** Numero grande com rotulo e dica: o `StatTile` do Sonido com o tom local. */
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
  return (
    <SonidoStatTile
      label={label}
      value={value}
      hint={hint}
      tone={tone ? TONES[tone] : "neutral"}
    />
  );
}
