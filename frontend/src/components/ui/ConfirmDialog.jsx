import Modal from "./Modal";

export default function ConfirmDialog({ title, texto, confirmar = "Confirmar", perigo = false, positivo = false, carregando = false, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} width={440}
      footer={<>
        <button onClick={onCancel} className="stk-btn-outline stk-focus rounded-lg px-4 py-2 text-sm">Cancelar</button>
        <button onClick={onConfirm} disabled={carregando} className={`${perigo ? "stk-btn-danger" : positivo ? "stk-btn-success" : "stk-btn-primary"} stk-focus rounded-lg px-4 py-2 text-sm`}>{carregando ? "Aguarde…" : confirmar}</button>
      </>}>
      <p className="text-sm" style={{ color: "var(--text-500)" }}>{texto}</p>
    </Modal>
  );
}
