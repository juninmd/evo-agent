import { useId } from "react";

/**
 * Serie minima em SVG. O `viewBox` e normalizado (0..100) com
 * `preserveAspectRatio="none"`, entao o traco usa `non-scaling-stroke` e o
 * marcador final e um traco vertical: um circulo sairia oval ao esticar.
 */
export default function Sparkline({
  points,
  label,
}: {
  points: number[];
  label: string;
}) {
  const titleId = useId();
  const gradientId = useId();

  if (points.length === 0) {
    return null;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? 100 / (points.length - 1) : 0;
  const coordinates = points.map((value, index) => {
    const x = index * step;
    const y = 100 - ((value - min) / span) * 88 - 6;
    return [x, y] as const;
  });
  const line = coordinates.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,100 ${line} 100,100`;
  const last = coordinates[coordinates.length - 1];

  return (
    <div className="relative h-28 w-full">
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="size-full"
      >
        <title id={titleId}>{label}</title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-accent)"
              stopOpacity="0.28"
            />
            <stop
              offset="100%"
              stopColor="var(--color-accent)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <polygon points={area} fill={`url(#${gradientId})`} />
        {/* Linha de base: ancora a serie mesmo quando ela e quase plana. */}
        <line
          x1="0"
          y1="99"
          x2="100"
          y2="99"
          stroke="var(--color-edge)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={last[0]}
          y1={last[1] - 5}
          x2={last[0]}
          y2={last[1] + 5}
          stroke="var(--color-accent-text)"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
