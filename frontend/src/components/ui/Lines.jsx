// Mostra um item por linha (antes/depois da auditoria, itens de saída etc.)
export default function Lines({ text, color }) {
  return (
    <div className="flex flex-col gap-1.5">
      {String(text || "—").split("\n").map((l, i) => <p key={i} className="text-sm" style={{ color }}>{l}</p>)}
    </div>
  );
}
