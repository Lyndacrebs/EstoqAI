import { useState } from "react";
import { Printer } from "lucide-react";

/* "Imprimir" envia direto para a impressão, sem abrir outra tela */
export default function PrintButton({ label = "Imprimir", onPrint, className, style, iconSize = 14 }) {
  const [enviado, setEnviado] = useState(false);
  const clicar = () => {
    onPrint();
    setEnviado(true);
    setTimeout(() => setEnviado(false), 2500);
  };
  return (
    <button onClick={clicar} className={className} style={style}>
      <Printer size={iconSize} /> {enviado ? "Enviado para impressão" : label}
    </button>
  );
}
