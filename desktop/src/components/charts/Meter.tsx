/**
 * Medidor fino para uma fracao (edicoes de hoje, pontuacao). A cor vem do
 * `className` (`text-ok`, `text-warn`...): a trilha e a mesma cor, mais clara.
 */
export default function Meter({
  value,
  max,
  label,
  className = "text-accent",
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={`evo-meter ${className}`}
    >
      <span style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}
