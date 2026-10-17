import { useId } from "react";

/** Serie minima em SVG: sem biblioteca de grafico para uma linha de pontos. */
export default function Sparkline({
  points,
  width = 640,
  height = 120,
  label,
}: {
  points: number[];
  width?: number;
  height?: number;
  label: string;
}) {
  const titleId = useId();
  const pad = 6;

  if (points.length === 0) {
    return <p className="py-6 text-center text-xs text-faint">—</p>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coordinates = points.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const last = coordinates[coordinates.length - 1];

  return (
    <svg
      role="img"
      aria-labelledby={titleId}
      viewBox={`0 0 ${width} ${height}`}
      className="h-28 w-full"
      preserveAspectRatio="none"
    >
      <title id={titleId}>{label}</title>
      <polyline
        points={coordinates.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--color-accent-text)" />
    </svg>
  );
}
