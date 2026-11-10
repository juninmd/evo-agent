import { useEffect, useRef, useState } from "react";

/**
 * Largura em px CSS do elemento. O grafico usa esse numero como `viewBox`, de
 * modo que uma unidade do SVG e um pixel: texto e fios nao sao esticados, e o
 * navegador os rasteriza na densidade real da tela (1x, 2x, 3x).
 */
export function useElementWidth<T extends HTMLElement>(fallback = 480) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
