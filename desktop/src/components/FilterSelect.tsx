import { Select, type SelectOption } from "@juninmd/sonido";

/**
 * Filtro compacto de barra de card: o rotulo visivel fica inline e o
 * `Select` do Sonido cuida do controle, do `htmlFor` e do teclado. O rotulo
 * externo e `aria-hidden` para o leitor de tela nao ouvir duas vezes.
 */
export default function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted">
      <span aria-hidden="true">{label}</span>
      <Select
        label={label}
        hideLabel
        compact
        value={value}
        options={options}
        onChange={onChange}
        className="min-w-0"
      />
    </span>
  );
}
