import { useEffect, useRef, useState } from "react";
import { t } from "../lib/i18n";

export default function CopyButton({
  text,
  label,
}: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sem permissao de clipboard a acao falha em silencio: nao vale um alerta.
    }
  }

  return (
    <button type="button" className="evo-btn" onClick={() => void copy()}>
      {copied ? t("common.copied") : (label ?? t("common.copy"))}
    </button>
  );
}
