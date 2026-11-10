import { useCallback, useState } from "react";

export type ChartCursor = {
  /** Indice do ponto em destaque, ou `null` sem nenhum. */
  active: number | null;
  /** O destaque veio do teclado: so entao o leitor de tela e avisado. */
  byKeyboard: boolean;
  hover: (index: number | null) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  clear: () => void;
};

/**
 * Um unico Tab stop por grafico; setas, Home e End andam pelos pontos e Esc
 * solta. E o mesmo detalhe do hover, alcancavel sem mouse.
 */
export function useChartCursor(count: number, columns = 1): ChartCursor {
  const [active, setActive] = useState<number | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const hover = useCallback((index: number | null) => {
    setByKeyboard(false);
    setActive(index);
  }, []);

  const clear = useCallback(() => {
    setByKeyboard(false);
    setActive(null);
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (count === 0) return;
      const last = count - 1;
      const current = active ?? last;
      let next: number | null = null;
      if (event.key === "ArrowRight")
        next = active === null ? last : current + 1;
      else if (event.key === "ArrowLeft")
        next = active === null ? last : current - 1;
      else if (event.key === "ArrowDown" && columns > 1)
        next = active === null ? last : current + columns;
      else if (event.key === "ArrowUp" && columns > 1)
        next = active === null ? last : current - columns;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = last;
      else if (event.key === "Escape") {
        clear();
        return;
      }
      if (next === null) return;
      event.preventDefault();
      setByKeyboard(true);
      setActive(Math.min(last, Math.max(0, next)));
    },
    [active, clear, columns, count],
  );

  return { active, byKeyboard, hover, onKeyDown, clear };
}
