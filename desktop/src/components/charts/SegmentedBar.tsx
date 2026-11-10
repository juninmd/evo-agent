export type Segment = {
  key: string;
  label: string;
  value: number;
  /** Classe de fundo (`bg-ok`, `bg-warn`...). */
  className: string;
};

/**
 * Um todo dividido em partes: larguras proporcionais, 2 px de respiro entre
 * elas e a legenda com os numeros ao lado, para a cor nunca ser o unico canal.
 */
export default function SegmentedBar({
  segments,
  label,
  formatValue,
}: {
  segments: Segment[];
  label: string;
  formatValue: (value: number) => string;
}) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const summary = segments
    .map((segment) => `${segment.label}: ${formatValue(segment.value)}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={`${label}. ${summary}`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        {total === 0 ? (
          <span className="h-full flex-1 rounded-full bg-hover" />
        ) : (
          visible.map((segment) => (
            <span
              key={segment.key}
              title={`${segment.label}: ${formatValue(segment.value)}`}
              className={`evo-meter-part h-full rounded-full ${segment.className}`}
              style={{ flexGrow: segment.value, flexBasis: 0, minWidth: 4 }}
            />
          ))
        )}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-sm ${segment.className}`}
            />
            {segment.label}
            <span className="evo-num font-medium text-fg">
              {formatValue(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
