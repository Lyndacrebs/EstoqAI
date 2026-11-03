import { useState } from "react";
import { api } from "../../services/api";
import Modal from "../../components/ui/Modal";

const MIN_MOTIVO = 20;

/* Ajuste manual de quantidade (só Administrador). O motivo vai para a auditoria. */
export default function AjusteQuantidade({ produto, onClose, onSaved }) {
  const [nova, setNova] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const numero = nova === "" ? NaN : Number(nova);
  const quantidadeOk = Number.isInteger(numero) && numero >= 0 && numero !== produto.quantidade;
  const motivoOk = motivo.trim().length >= MIN_MOTIVO;

  const salvar = async () => {
    setErro(""); setSalvando(true);
    try {
      const atualizado = await api.produtos.ajustarQuantidade(produto.id, { quantidade: numero, motivo: motivo.trim() });
      onSaved(atualizado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal title="Alterar quantidade manualmente" onClose={onClose} bloqueado={salvando} width={480}
      footer={<>
        <button onClick={onClose} disabled={salvando} className="stk-btn-outline stk-focus rounded-lg px-4 py-2 text-sm">Cancelar</button>
        <button onClick={salvar} disabled={!quantidadeOk || !motivoOk || salvando} className="stk-btn-primary stk-focus rounded-lg px-4 py-2 text-sm">{salvando ? "Salvando…" : "Confirmar alteração"}</button>
      </>}>
      <p className="text-sm mb-4" style={{ color: "var(--text-500)" }}>{produto.nome}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Quantidade atual</label>
          <input disabled className="stk-input mt-1 font-mono" value={`${produto.quantidade} ${produto.unidade}`} readOnly />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Nova quantidade</label>
          <input type="number" min={0} autoFocus className="stk-input stk-focus mt-1 font-mono" value={nova} onChange={(e) => setNova(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Motivo da alteração</label>
        <textarea rows={3} className="stk-input stk-focus mt-1" placeholder="Ex: contagem do inventário não bateu com o sistema" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <p className="text-xs mt-1 text-right" style={{ color: motivoOk ? "var(--green-600)" : "var(--text-300)" }}>{motivo.trim().length}/{MIN_MOTIVO}</p>
      </div>
      {erro && <p className="text-sm mt-2" style={{ color: "var(--red-500)" }}>{erro}</p>}
    </Modal>
  );
}
