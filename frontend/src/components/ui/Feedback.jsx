import { AlertTriangle, Loader2 } from "lucide-react";

export function Loading({ texto = "Carregando…" }) {
  return (
    <div className="flex items-center gap-2 text-sm py-10 justify-center" style={{ color: "var(--text-500)" }}>
      <Loader2 size={16} className="animate-spin" /> {texto}
    </div>
  );
}

export function ErrorBox({ mensagem, onRetry }) {
  if (!mensagem) return null;
  return (
    <div className="rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3 mb-4" style={{ background: "var(--red-100)", color: "var(--red-text)" }}>
      <span className="flex items-center gap-2"><AlertTriangle size={15} /> {mensagem}</span>
      {onRetry && <button onClick={onRetry} className="stk-link-btn">Tentar de novo</button>}
    </div>
  );
}

export function EmptyRow({ colSpan, texto }) {
  return (
    <tr><td colSpan={colSpan} className="text-center py-10 text-sm" style={{ color: "var(--text-500)" }}>{texto}</td></tr>
  );
}
