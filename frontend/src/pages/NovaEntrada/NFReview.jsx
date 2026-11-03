import { Check, Plus, Sparkles } from "lucide-react";
import Modal from "../../components/ui/Modal";

/* Etapa 2: pop-up de conferência. A pessoa corrige o que a IA leu antes de confirmar. */
export default function NFReview({ itens, setItens, nome, setNome, onConfirm, onCancel, enviando, erro }) {
  const invalido = !nome.trim() || itens.some((it) => !String(it.descricaoOriginal).trim() || !(it.quantidade > 0) || !String(it.unidade).trim());
  const atualizar = (id, campo, valor) => setItens(itens.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));

  return (
    <Modal
      title={<span className="flex items-center gap-2"><Sparkles size={17} style={{ color: "var(--teal-500)" }} /> Conferência da leitura</span>}
      onClose={onCancel} bloqueado={enviando} width={768}
      footer={<>
        <button onClick={onCancel} disabled={enviando} className="stk-btn-outline stk-focus px-4 py-2.5 rounded-lg text-sm">Cancelar</button>
        <button onClick={onConfirm} disabled={invalido || enviando} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">
          <Check size={15} /> {enviando ? "Registrando…" : "Confirmar e dar entrada"}
        </button>
      </>}>
      <p className="text-sm -mt-1" style={{ color: "var(--text-500)" }}>Revise os itens lidos pela IA. Corrija o que estiver errado antes de confirmar a entrada.</p>

      <div className="mt-5">
        <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Nome para salvar esta nota fiscal</label>
        <input className="stk-input stk-focus mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
        <p className="text-xs mt-1" style={{ color: "var(--text-300)" }}>Sugestão baseada no fornecedor e CNPJ identificados na NF — pode editar se necessário</p>
      </div>

      <div className="flex flex-col gap-3 mt-5">
        {itens.map((it) => (
          <div key={it.id} className="p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5">
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Item lido na NF</label>
                <input className="stk-input stk-focus mt-1" value={it.descricaoOriginal} onChange={(e) => atualizar(it.id, "descricaoOriginal", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Qtd.</label>
                <input type="number" className="stk-input stk-focus mt-1 font-mono" value={it.quantidade} onChange={(e) => atualizar(it.id, "quantidade", Number(e.target.value))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Unid.</label>
                <input className="stk-input stk-focus mt-1" value={it.unidade} onChange={(e) => atualizar(it.id, "unidade", e.target.value)} />
              </div>
              <div className="col-span-3">
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Vínculo no estoque</label>
                {it.produtoVinculado ? (
                  <div className="mt-1 text-xs font-medium px-2.5 py-2 rounded-md flex items-center gap-1.5" style={{ background: "var(--green-100)", color: "var(--green-600)" }}>
                    <Check size={13} /> {it.produtoVinculado.nome}
                  </div>
                ) : (
                  <div className="mt-1 text-xs font-medium px-2.5 py-2 rounded-md flex items-center gap-1.5" style={{ background: "var(--amber-100)", color: "var(--amber-text)" }}>
                    <Plus size={13} /> Produto novo
                  </div>
                )}
              </div>
            </div>
            {it.produtoVinculado && (
              <p className="text-xs mt-2" style={{ color: "var(--text-300)" }}>Identificado automaticamente por palavra-chave cadastrada — nenhum produto duplicado será criado.</p>
            )}
          </div>
        ))}
      </div>
      {erro && <p className="text-sm mt-4" style={{ color: "var(--red-500)" }}>{erro}</p>}
    </Modal>
  );
}
