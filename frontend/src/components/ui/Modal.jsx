import { X } from "lucide-react";

/* Janela sobre a tela. Clicar fora fecha (a menos que "bloqueado"). */
export default function Modal({ title, onClose, children, width = 560, bloqueado = false, footer }) {
  return (
    <div className="stk-overlay" onClick={bloqueado ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="stk-card stk-fadein w-full flex flex-col" style={{ maxWidth: width, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {onClose && !bloqueado && (
            <button onClick={onClose} aria-label="Fechar" className="stk-focus" style={{ color: "var(--text-500)" }}><X size={18} /></button>
          )}
        </div>
        <div className="px-6 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--border)" }}>{footer}</div>}
      </div>
    </div>
  );
}
