import { Sparkline as SonidoSparkline, useSize } from "@juninmd/sonido";

const FALLBACK_WIDTH = 480;
const HEIGHT = 112;

/**
 * O `Sparkline` do Sonido desenha num viewBox do tamanho exato que recebe, sem
 * `preserveAspectRatio="none"`. Para preencher a coluna sem esticar o traco, a
 * largura vem do ResizeObserver do proprio pacote (`useSize`).
 */
export default function Sparkline({
  points,
  label,
}: {
  points: number[];
  label: string;
}) {
  const [ref, size] = useSize<HTMLDivElement>();

  if (points.length === 0) {
    return null;
  }

  const width = Math.round(size.width) || FALLBACK_WIDTH;

  return (
    <div ref={ref} className="h-28 w-full">
      <SonidoSparkline
        data={points}
        label={label}
        tone="accent"
        area
        width={width}
        height={HEIGHT}
        className="block"
      />
    </div>
  );
}
