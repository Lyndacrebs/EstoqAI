import { useCallback, useEffect, useRef, useState } from "react";

/*
  Busca dados na API e controla carregando / erro.
  const { data, loading, error, reload } = useFetch(() => api.produtos.listar({...}), [filtros]);
*/
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const contador = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => {
    const id = ++contador.current;
    setLoading(true);
    setError("");
    return fnRef.current()
      .then((r) => { if (id === contador.current) setData(r); })
      .catch((e) => { if (id === contador.current) setError(e.message || "Erro ao carregar os dados."); })
      .finally(() => { if (id === contador.current) setLoading(false); });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);

  return { data, loading, error, reload, setData };
}
