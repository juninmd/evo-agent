export default function Skeleton({ label }: { label: string }) {
  return (
    <output className="flex items-center gap-2 px-1 py-6 text-xs text-muted">
      <span
        aria-hidden="true"
        className="size-3 animate-spin rounded-full border-2 border-edge border-t-accent"
      />
      {label}
    </output>
  );
}
