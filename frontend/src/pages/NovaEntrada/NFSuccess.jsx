import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";

/* Etapa final: mensagem de sucesso por 10 s e volta para uma nova entrada */
export default function NFSuccess({ nome, soExistentes, onDone }) {
  const [restam, setRestam] = useState(10);
  useEffect(() => {
    const t = setInterval(() => setRestam((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (restam <= 0) onDone(); }, [restam]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader title="Nova entrada (NF)" />
      <div className="stk-card p-5 md:p-8 max-w-lg flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--green-100)" }}>
          <Check size={26} style={{ color: "var(--green-600)" }} />
        </div>
        <p className="font-display text-lg font-semibold mb-2">
          {soExistentes
            ? `Todos os produtos da nota fiscal "${nome}" foram atualizados no estoque com sucesso!!`
            : `Todos os produtos da nota fiscal "${nome}" foram cadastrados com sucesso!!`}
        </p>
        <p className="text-sm" style={{ color: "var(--text-500)" }}>A tela será recarregada em {Math.max(restam, 0)} segundo(s)</p>
        <button onClick={onDone} className="stk-btn-primary stk-focus mt-5 px-5 py-2.5 rounded-lg text-sm">Nova entrada agora</button>
      </div>
    </div>
  );
}
