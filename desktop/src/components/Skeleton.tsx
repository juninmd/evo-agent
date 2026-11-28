import { Skeleton as SonidoSkeleton } from "@juninmd/sonido";

/** Placeholder com brilho; o rotulo vai para a regiao `role="status"` do Sonido. */
export default function Skeleton({ label }: { label: string }) {
  return <SonidoSkeleton label={label} rows={3} className="max-w-xl" />;
}
