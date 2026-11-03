import { useRef, useState } from "react";
import { Camera, FileText, ImagePlus, Sparkles } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { ErrorBox } from "../../components/ui/Feedback";
import Modal from "../../components/ui/Modal";

/* Etapa 1: enviar a foto da NF (câmera do celular ou arquivo) e acompanhar a leitura pela IA */
export default function NFUpload({ onFile, lendo, previewUrl, erro }) {
  const cameraRef = useRef(null);
  const arquivoRef = useRef(null);
  const [avisoCamera, setAvisoCamera] = useState(false);

  // "capture" só abre a câmera em celular/tablet (tela de toque). No computador, avisa.
  const usarCamera = () => {
    if (window.matchMedia("(pointer: coarse)").matches) cameraRef.current.click();
    else setAvisoCamera(true);
  };
  const escolher = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (f) onFile(f);
  };

  return (
    <div>
      <PageHeader title="Nova entrada (NF)" subtitle="Entrada de produtos por leitura de NF" />
      <ErrorBox mensagem={erro} />

      {/* "capture" abre a câmera no celular; no computador abre o seletor de arquivos */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={escolher} />
      <input ref={arquivoRef} type="file" accept="image/*" className="hidden" onChange={escolher} />

      <div className="grid grid-cols-2 gap-5 max-w-3xl">
        <button onClick={usarCamera} className="stk-card stk-focus p-8 flex flex-col items-center gap-3 hover:shadow-sm" disabled={lendo}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--teal-100)" }}>
            <Camera size={24} style={{ color: "var(--teal-600)" }} />
          </div>
          <p className="font-display font-semibold">Usar câmera do celular</p>
          <p className="text-xs text-center" style={{ color: "var(--text-500)" }}>Aponte para a NF impressa e capture a imagem.</p>
        </button>
        <button onClick={() => arquivoRef.current.click()} className="stk-card stk-focus p-8 flex flex-col items-center gap-3 hover:shadow-sm" disabled={lendo}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--teal-100)" }}>
            <ImagePlus size={24} style={{ color: "var(--teal-600)" }} />
          </div>
          <p className="font-display font-semibold">Subir uma foto</p>
          <p className="text-xs text-center" style={{ color: "var(--text-500)" }}>Selecione uma imagem da NF já tirada anteriormente.</p>
        </button>
      </div>

      {avisoCamera && (
        <Modal title="Câmera indisponível neste dispositivo" onClose={() => setAvisoCamera(false)} width={460}
          footer={<>
            <button onClick={() => setAvisoCamera(false)} className="stk-btn-outline stk-focus rounded-lg px-4 py-2 text-sm">Fechar</button>
            <button onClick={() => { setAvisoCamera(false); arquivoRef.current.click(); }} className="stk-btn-primary stk-focus rounded-lg px-4 py-2 text-sm">Escolher arquivo</button>
          </>}>
          <p className="text-sm" style={{ color: "var(--text-500)" }}>
            Para fotografar a nota fiscal, acesse o EstoqAI pelo celular. Se preferir continuar no computador, envie uma foto que já esteja salva.
          </p>
        </Modal>
      )}

      {lendo && (
        <div className="stk-card mt-6 max-w-3xl p-6">
          <div className="relative rounded-lg overflow-hidden flex items-center justify-center" style={{ height: 260, background: "var(--navy-900)" }}>
            {previewUrl
              ? <img src={previewUrl} alt="Nota fiscal enviada" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
              : <FileText size={64} style={{ color: "var(--navy-700)" }} />}
            <div className="stk-scanline" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Sparkles size={16} style={{ color: "var(--teal-500)" }} className="animate-pulse" />
            <p className="text-sm font-medium">Agente de IA lendo a nota fiscal…</p>
          </div>
        </div>
      )}
    </div>
  );
}
