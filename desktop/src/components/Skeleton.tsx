type Shape = "lines" | "tiles" | "table" | "chart";

const LINE_WIDTHS = ["w-2/3", "w-full", "w-5/6", "w-1/2"];
const ROWS = [0, 1, 2, 3, 4, 5];
const TILES = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * Carregamento com o formato do que vem: o olho ja sabe onde a tabela ou o
 * grafico vao aparecer, e a troca pelo conteudo nao desloca o layout. O rotulo
 * fica so para o leitor de tela (`output` e uma regiao viva).
 */
export default function Skeleton({
  label,
  shape = "lines",
}: {
  label: string;
  shape?: Shape;
}) {
  return (
    <output aria-busy="true" className="block">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="block">
        {shape === "tiles" && (
          <span className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {TILES.map((tile) => (
              <span key={tile} className="evo-card block p-2.5">
                <span className="evo-skeleton block h-2.5 w-2/3" />
                <span className="evo-skeleton mt-2.5 block h-6 w-1/3" />
              </span>
            ))}
          </span>
        )}
        {shape === "table" && (
          <span className="flex flex-col gap-2.5 py-2">
            <span className="evo-skeleton block h-2.5 w-1/4" />
            {ROWS.map((row) => (
              <span key={row} className="flex items-center gap-3">
                <span className="evo-skeleton block h-3 w-1/5" />
                <span className="evo-skeleton block h-3 flex-1" />
                <span className="evo-skeleton block h-3 w-16" />
              </span>
            ))}
          </span>
        )}
        {shape === "chart" && (
          <span className="flex flex-col gap-2 py-1">
            <span className="evo-skeleton block h-3 w-1/3" />
            <span className="evo-skeleton block h-40 w-full rounded-lg" />
          </span>
        )}
        {shape === "lines" && (
          <span className="flex flex-col gap-2 py-2">
            {LINE_WIDTHS.map((width) => (
              <span key={width} className={`evo-skeleton block h-3 ${width}`} />
            ))}
          </span>
        )}
      </span>
    </output>
  );
}
