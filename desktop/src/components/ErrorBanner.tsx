import { t } from "../lib/i18n";

export default function ErrorBanner({
  message,
  busy = false,
  onRetry,
}: {
  message: string;
  busy?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
    >
      <span className="min-w-0 break-words">{message}</span>
      {onRetry && (
        <button
          type="button"
          className="evo-btn shrink-0"
          onClick={onRetry}
          disabled={busy}
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
