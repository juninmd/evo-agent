import type { ReactNode } from "react";

export default function EmptyState({
  message,
  hint,
  children,
}: {
  message: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 px-4 py-8 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="mb-1 size-6 text-line"
      >
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3 10h18M7 14h6" />
      </svg>
      <p className="text-sm text-muted">{message}</p>
      {hint && <p className="max-w-prose text-[11px] text-faint">{hint}</p>}
      {children}
    </div>
  );
}
