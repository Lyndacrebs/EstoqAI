import { useMemo } from "react";

// Barras apenas decorativas (não são lidas por nenhum leitor). Mesmo visual do protótipo.
export default function DecorBarcode({ code, height = 34 }) {
  const barras = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i) * (i + 1);
    const larguras = [];
    for (let i = 0; i < 28; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      larguras.push(1 + (seed % 4));
    }
    return larguras;
  }, [code]);
  return (
    <div className="stk-barcode" style={{ height }}>
      {barras.map((w, i) => <span key={i} style={{ width: w }} />)}
    </div>
  );
}
