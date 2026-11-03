import { useNavigate } from "react-router-dom";
import { AlertTriangle, Package, Scan, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { PERFIS } from "../../utils/roles";
import PageHeader from "../../components/ui/PageHeader";
import { ErrorBox, Loading } from "../../components/ui/Feedback";

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => api.dashboard.resumo(), []);
  const podeClicar = usuario.perfil !== PERFIS.VISUALIZADOR; // Visualizador só consulta

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox mensagem={error} onRetry={reload} />;

  const { produtosAtivos, produtosEstoqueBaixo, novosNaSemana, estoqueBaixo, movimentacaoSemana, atividadeRecente } = data;
  const maiorMov = Math.max(1, ...movimentacaoSemana.map((d) => Math.max(d.entradas, d.saidas)));
  const Card = podeClicar ? "button" : "div";
  const props = (path) => (podeClicar ? { onClick: () => navigate(path) } : {});
  const estilo = !podeClicar ? { cursor: "default" } : undefined;
  const foco = podeClicar ? "stk-focus" : "";

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do estoque em tempo real" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stk-card p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Produtos ativos</p>
          <p className="font-display text-3xl font-semibold">{produtosAtivos}</p>
        </div>
        <div className="stk-card p-5" style={{ borderColor: produtosEstoqueBaixo ? "var(--amber-500)" : "var(--border)" }}>
          <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--text-500)" }}><AlertTriangle size={12} /> Estoque baixo</p>
          <p className="font-display text-3xl font-semibold" style={{ color: produtosEstoqueBaixo ? "var(--amber-500)" : "var(--text-900)" }}>{produtosEstoqueBaixo}</p>
        </div>
        <div className="stk-card p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Novos esta semana</p>
          <p className="font-display text-3xl font-semibold">{novosNaSemana}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card {...props("/nova-entrada")} className={`stk-btn-primary rounded-xl p-5 text-left flex items-center justify-between ${foco}`} style={estilo}>
          <div>
            <p className="font-display font-semibold">Nova entrada (ler NF)</p>
            <p className="text-xs opacity-90 mt-0.5">Câmera ou upload de foto</p>
          </div>
          <Upload size={22} />
        </Card>
        <Card {...props("/saida")} className={`rounded-xl p-5 text-left flex items-center justify-between stk-card ${foco}`} style={estilo}>
          <div>
            <p className="font-display font-semibold">Registrar saída</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-500)" }}>Ler etiqueta ou buscar pelo nome</p>
          </div>
          <Scan size={22} style={{ color: "var(--teal-500)" }} />
        </Card>
        <Card {...props("/produtos")} className={`rounded-xl p-5 text-left flex items-center justify-between stk-card ${foco}`} style={estilo}>
          <div>
            <p className="font-display font-semibold">Ver produtos</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-500)" }}>Consultar e editar itens</p>
          </div>
          <Package size={22} style={{ color: "var(--teal-500)" }} />
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="stk-card p-5 md:col-span-3">
          <p className="font-display font-semibold mb-4">Movimentação da semana</p>
          <div className="flex items-end gap-2 md:gap-4" style={{ height: 140 }}>
            {movimentacaoSemana.map((d) => (
              <div key={d.dia} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end gap-1" style={{ height: 110 }}>
                  <div className="flex-1 rounded-t" style={{ height: `${(d.entradas / maiorMov) * 100}%`, background: "var(--teal-500)" }} title={`Entradas: ${d.entradas}`} />
                  <div className="flex-1 rounded-t" style={{ height: `${(d.saidas / maiorMov) * 100}%`, background: "var(--amber-500)" }} title={`Saídas: ${d.saidas}`} />
                </div>
                <span className="text-xs" style={{ color: "var(--text-500)" }}>{d.dia}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: "var(--text-500)" }}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "var(--teal-500)" }} /> Entradas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "var(--amber-500)" }} /> Saídas</span>
          </div>
        </div>

        <div className="stk-card p-5 md:col-span-2">
          <p className="font-display font-semibold mb-4">Atividade recente</p>
          <div className="flex flex-col gap-3">
            {atividadeRecente.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {a.tipo === "entrada" ? <TrendingUp size={15} style={{ color: "var(--green-600)", marginTop: 2 }} /> : <TrendingDown size={15} style={{ color: "var(--amber-500)", marginTop: 2 }} />}
                <div>
                  <p className="text-sm">{a.texto}</p>
                  <p className="text-xs" style={{ color: "var(--text-300)" }}>{a.quando}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {estoqueBaixo.length > 0 && (
        <div className="stk-card p-5 mt-6" style={{ borderColor: "var(--amber-500)", background: "var(--amber-100)" }}>
          <p className="font-display font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--amber-text)" }}><AlertTriangle size={16} /> Alertas de estoque baixo</p>
          <div className="flex flex-col gap-2">
            {estoqueBaixo.map((p) => (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5 text-sm">
                <span>{p.nome}</span>
                <span className="font-mono" style={{ color: "var(--amber-text)" }}>atual: {p.quantidade} {p.unidade} · mínimo aceitável: {p.limite} {p.unidade}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
