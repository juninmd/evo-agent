import { t } from "../lib/i18n";

export default function EmptyState({
  message,
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-8 text-center">
      <p className="text-sm text-muted">{message ?? t("common.empty")}</p>
      <p className="text-[11px] text-faint">{hint ?? t("common.emptyHint")}</p>
    </div>
  );
}
