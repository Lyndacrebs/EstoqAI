import { ArrowRight, Check } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Barcode from "../../components/ui/Barcode";
import PrintButton from "../../components/ui/PrintButton";
import { imprimirEtiqueta } from "../../utils/print";
import { ErrorBox } from "../../components/ui/Feedback";

/* Etapa 4: etiqueta com código de barras do produto recém-cadastrado */
export default function LabelConfirm({ produto, temProximo, onNext, onFinish, finalizando, erro }) {
  return (
    <div>
      <PageHeader title="Produto cadastrado" subtitle="Etiqueta gerada automaticamente com ID único e código de barras" />
      <div className="stk-card p-6 max-w-md">
        <ErrorBox mensagem={erro} />
        <div className="border-2 border-dashed rounded-xl p-5 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="font-display font-semibold text-sm mb-1">{produto.nome}</p>
          <p className="font-mono text-xs mb-3" style={{ color: "var(--text-500)" }}>{produto.codigoBarras}</p>
          <div className="flex justify-center mb-2"><Barcode code={produto.codigoBarras} /></div>
          <p className="font-mono text-xs" style={{ color: "var(--text-300)" }}>Cole na prateleira de armazenamento</p>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm" style={{ color: "var(--green-600)" }}>
          <Check size={16} /> Produto cadastrado com sucesso
        </div>

        <div className="flex gap-3 mt-5">
          <PrintButton label="Imprimir agora" onPrint={() => imprimirEtiqueta(produto)}
            className="stk-btn-outline stk-focus flex-1 px-4 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2" iconSize={15} />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-300)" }}>Não precisa imprimir agora — a etiqueta fica disponível a qualquer momento na página do produto.</p>

        <div className="flex justify-end mt-5">
          {temProximo ? (
            <button onClick={onNext} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">Próximo produto <ArrowRight size={15} /></button>
          ) : (
            <button onClick={onFinish} disabled={finalizando} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">
              {finalizando ? "Concluindo…" : "Concluir"} <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
