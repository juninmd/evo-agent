import { healthLabel, healthReasonLabel } from "../lib/i18n";
import type { HealthStatus } from "../lib/types";
import Badge, { type Tone } from "./Badge";

const TONES: Record<HealthStatus, Tone> = {
  healthy: "ok",
  degraded: "warn",
  critical: "danger",
};

/** Saude do agente: `Badge` com o ponto de status do Sonido. */
export default function StatusPill({
  status,
  reasons = [],
}: {
  status: HealthStatus;
  reasons?: string[];
}) {
  return (
    <Badge
      tone={TONES[status]}
      dot
      title={reasons.map(healthReasonLabel).join("; ") || undefined}
    >
      {healthLabel(status)}
    </Badge>
  );
}
