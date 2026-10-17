import { useCallback, useEffect, useRef, useState } from "react";
import { errText } from "./api";

export type PollState<T> = {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  updatedAt: number | null;
};

export type Poll<T> = PollState<T> & { reload: () => void };

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Le sempre a mesma chave: `key` identifica o que esta sendo buscado (aba mais
 * filtros), e trocar a chave refaz a consulta do zero. `load` fica numa ref para
 * o efeito nao depender de uma funcao recriada a cada render.
 */
export function usePoll<T>(
  key: string,
  load: () => Promise<T>,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): Poll<T> {
  const loadRef = useRef(load);
  loadRef.current = load;

  const [state, setState] = useState<PollState<T>>({
    data: undefined,
    error: undefined,
    loading: true,
    updatedAt: null,
  });
  // `reload` chama a leitura do efeito em vigor sem recriar o efeito: um
  // contador de versao aqui so existiria como dependencia.
  const reloadRef = useRef<(background: boolean) => void>(() => {});

  useEffect(() => {
    // Chave vazia = ainda nao ha o que buscar (ex.: API sem token): nao gasta
    // uma requisicao so para falhar.
    if (!key) {
      reloadRef.current = () => {};
      setState({
        data: undefined,
        error: undefined,
        loading: false,
        updatedAt: null,
      });
      return;
    }

    let cancelled = false;

    const run = async (background: boolean) => {
      if (!background) {
        setState((previous) => ({ ...previous, loading: true }));
      }
      try {
        const data = await loadRef.current();
        if (!cancelled) {
          setState({
            data,
            error: undefined,
            loading: false,
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        // O dado anterior continua na tela: uma falha de rede nao apaga o painel.
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            error: errText(error),
            loading: false,
          }));
        }
      }
    };

    reloadRef.current = (background = false) => {
      void run(background);
    };

    void run(false);
    const timer = window.setInterval(() => {
      // Uma janela escondida nao precisa bater na API a cada 30 s.
      if (document.visibilityState === "visible") void run(true);
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [key, intervalMs]);

  const reload = useCallback(() => reloadRef.current(false), []);
  return { ...state, reload };
}
