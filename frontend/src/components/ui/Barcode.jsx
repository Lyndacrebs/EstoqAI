import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

// Código de barras real (CODE128) desenhado a partir do código do produto
export default function Barcode({ code, height = 50, width = 2, displayValue = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, String(code), { format: "CODE128", height, width, displayValue, margin: 0, fontSize: 13, lineColor: "#12203D" });
    } catch { /* código inválido: não desenha */ }
  }, [code, height, width, displayValue]);
  return <svg ref={ref} />;
}
