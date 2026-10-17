import type { ReactNode } from "react";

export default function Card({
  title,
  hint,
  actions,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`evo-card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-3 py-2">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-fg">{title}</h2>
            )}
            {hint && <p className="text-[11px] text-muted">{hint}</p>}
          </div>
          {actions && (
            <div className="flex items-center gap-1.5">{actions}</div>
          )}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}
