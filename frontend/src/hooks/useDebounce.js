import { useEffect, useState } from "react";

// Espera o usuário parar de digitar antes de buscar
export function useDebounce(valor, ms = 250) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}
