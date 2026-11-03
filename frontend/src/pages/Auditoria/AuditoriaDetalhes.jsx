import Modal from "../../components/ui/Modal";
import Lines from "../../components/ui/Lines";

// Mostra o antes e o depois com um item por linha
export default function AuditoriaDetalhes({ registro, onClose }) {
  return (
    <Modal onClose={onClose} width={672}
      title={<div><span>{registro.acao}</span><p className="text-xs font-mono font-normal" style={{ color: "var(--text-500)" }}>{registro.id} · {registro.dataHora}</p></div>}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Usuário</p>
          <p className="text-sm">{registro.usuario}</p>
        </div>
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Setor</p>
          <p className="text-sm">{registro.setor}</p>
        </div>
      </div>
      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Detalhes</p>
      <p className="text-sm mb-4">{registro.detalhes}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg" style={{ background: "var(--red-100)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--red-text)" }}>Situação anterior</p>
          <Lines text={registro.antes} color="var(--red-text)" />
        </div>
        <div className="p-3 rounded-lg" style={{ background: "var(--green-100)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--green-600)" }}>Situação atual</p>
          <Lines text={registro.depois} color="var(--green-600)" />
        </div>
      </div>
    </Modal>
  );
}
