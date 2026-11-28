import { Button, useToast } from "@juninmd/sonido";
import { t } from "../lib/i18n";

export default function CopyButton({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t("common.copied"), tone: "success", duration: 1800 });
    } catch {
      // Sem permissao de clipboard a acao falha em silencio: nao vale um alerta.
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void copy()}>
      {label ?? t("common.copy")}
    </Button>
  );
}
