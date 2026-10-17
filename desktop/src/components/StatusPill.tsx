import { healthLabel } from "../lib/i18n";
import type { HealthStatus } from "../lib/types";
import Badge, { type Tone } from "./Badge";

const TONES: Record<HealthStatus, Tone> = {
  healthy: "ok",
  degraded: "warn",
  critical: "danger",
};

export default function StatusPill({
  status,
  reasons = [],
}: {
  status: HealthStatus;
  reasons?: string[];
}) {
  return (
    <Badge tone={TONES[status]} title={reasons.join("; ") || undefined}>
      <span
        aria-hidden="true"
        className="inline-block size-1.5 rounded-full bg-current"
      />
      {healthLabel(status)}
    </Badge>
  );
}
