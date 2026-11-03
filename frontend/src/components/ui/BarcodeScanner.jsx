import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard } from "lucide-react";

/*
  Leitura do código de barras da etiqueta:
  - câmera (biblioteca @zxing, carregada só quando necessário);
  - digitação do código (leitores USB funcionam como teclado e terminam com Enter);
  Chama onRead(codigo) a cada leitura.
*/
export default function BarcodeScanner({ onRead, disabled = false }) {
  const [camera, setCamera] = useState(false);
  const [erroCamera, setErroCamera] = useState("");
  const [codigo, setCodigo] = useState("");
  const videoRef = useRef(null);
  const ultimo = useRef({ texto: "", t: 0 });

  useEffect(() => {
    if (!camera) return undefined;
    let controles = null;
    let cancelado = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const leitor = new BrowserMultiFormatReader();
        controles = await leitor.decodeFromVideoDevice(undefined, videoRef.current, (res) => {
          if (!res || cancelado) return;
          const texto = res.getText();
          const agora = Date.now();
          if (texto === ultimo.current.texto && agora - ultimo.current.t < 3000) return; // evita ler 2x
          ultimo.current = { texto, t: agora };
          onRead(texto);
        });
      } catch {
        setErroCamera("Não foi possível acessar a câmera. Digite o código abaixo.");
        setCamera(false);
      }
    })();
    return () => { cancelado = true; if (controles) controles.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  const enviar = () => {
    const c = codigo.trim();
    if (!c) return;
    onRead(c);
    setCodigo("");
  };

  return (
    <div>
      <div className="rounded-xl overflow-hidden mb-3 flex items-center justify-center" style={{ background: "var(--navy-900)", height: 200, position: "relative" }}>
        {camera ? (
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <div className="text-center" style={{ color: "var(--text-300)" }}>
            <CameraOff size={28} className="mx-auto mb-2" />
            <p className="text-sm">Câmera desligada</p>
          </div>
        )}
        {camera && <div className="stk-scanline" />}
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button type="button" disabled={disabled} onClick={() => { setErroCamera(""); setCamera((c) => !c); }} className="stk-btn-outline stk-focus rounded-lg px-3 py-2 text-sm flex items-center gap-2">
          <Camera size={15} /> {camera ? "Desligar câmera" : "Ler com a câmera"}
        </button>
      </div>
      {erroCamera && <p className="text-xs mb-2" style={{ color: "var(--red-500)" }}>{erroCamera}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1 flex items-center">
          <Keyboard size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
          <input className="stk-input stk-focus font-mono" style={{ paddingLeft: 34 }} placeholder="Digite ou leia o código de barras" value={codigo} disabled={disabled}
            onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} />
        </div>
        <button type="button" disabled={disabled} onClick={enviar} className="stk-btn-primary stk-focus rounded-lg px-4 py-2 text-sm">Buscar</button>
      </div>
    </div>
  );
}
