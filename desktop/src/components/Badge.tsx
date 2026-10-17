import type { ReactNode } from "react";

export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "border-edge bg-hover text-muted",
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  danger: "border-danger/40 bg-danger/10 text-danger",
  info: "border-info/40 bg-info/10 text-info",
  accent: "border-accent/40 bg-accent/10 text-accent-text",
};

export default function Badge({
  tone = "neutral",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
