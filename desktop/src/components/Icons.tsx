type IconProps = { className?: string };

/** Icones de interface: traco em `currentColor`, 1.6px, grade de 16. */
function Base({
  className = "size-3.5",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.7-3.9" />
      <path d="M13.5 2.5V5H11" />
    </Base>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9" />
    </Base>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M13 9.6A5.6 5.6 0 0 1 6.4 3a5.6 5.6 0 1 0 6.6 6.6Z" />
    </Base>
  );
}

export function MonitorIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" />
      <path d="M5.5 14h5M8 11.5V14" />
    </Base>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Base>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M5 3.5l8 4.5-8 4.5z" />
    </Base>
  );
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M9.5 3h3.5v3.5" />
      <path d="M13 3 7.5 8.5" />
      <path d="M12 10.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 3 12V6a1.5 1.5 0 0 1 1.5-1.5H6" />
    </Base>
  );
}

/** Marca do app: uma linha de tendencia ascendente. */
export function MarkIcon({ className = "size-6" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} shrink-0 rounded-md bg-ink p-0.5`}
    >
      <polyline
        points="3,17 9,12 14,15 21,6"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="6" r="1.7" fill="var(--color-accent-text)" />
    </svg>
  );
}
