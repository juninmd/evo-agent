import { type BadgeTone, Badge as SonidoBadge } from "@juninmd/sonido";
import type { ReactNode } from "react";

export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "accent";

/**
 * O console fala `ok/warn/info`; o Sonido fala `success/warning/aqua`. O
 * vocabulario local fica na borda para as telas nao mudarem.
 */
const TONES: Record<Tone, BadgeTone> = {
  neutral: "neutral",
  ok: "success",
  warn: "warning",
  danger: "danger",
  info: "aqua",
  accent: "accent",
};

/** Pilula de status/categoria: `Badge` do Sonido com o tom do console. */
export default function Badge({
  tone = "neutral",
  title,
  dot = false,
  children,
}: {
  tone?: Tone;
  title?: string;
  /** Ponto de status antes do texto (StatusPill). */
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <SonidoBadge tone={TONES[tone]} appearance="soft" dot={dot} title={title}>
      {children}
    </SonidoBadge>
  );
}
