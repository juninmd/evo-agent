import { Alert, Button } from "@juninmd/sonido";
import { t } from "../lib/i18n";

/** Erro de leitura: `Alert` de perigo do Sonido com a acao de repetir. */
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
    <Alert
      tone="danger"
      action={
        onRetry ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            loading={busy}
          >
            {t("common.retry")}
          </Button>
        ) : undefined
      }
    >
      <span className="break-words">{message}</span>
    </Alert>
  );
}
