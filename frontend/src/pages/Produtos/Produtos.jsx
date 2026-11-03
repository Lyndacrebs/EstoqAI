import { useEffect, useState } from "react";
import { AlertTriangle, Edit2, Eye } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { PERFIS } from "../../utils/roles";
import PageHeader from "../../components/ui/PageHeader";
import { FilterBar, SearchField, StatusTabsField } from "../../components/ui/Filters";
import { EmptyRow, ErrorBox, Loading } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ProdutoDetalhe from "./ProdutoDetalhe";

export default function Produtos() {
  const { usuario } = useAuth();
  const [aba, setAba] = useState("ativos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [erroAcao, setErroAcao] = useState("");
  const [reativando, setReativando] = useState(null); // produto aguardando confirmação
  const [aviso, setAviso] = useState("");               // mensagem de sucesso ao voltar do detalhe

  // o aviso some sozinho
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(""), 6000);
    return () => clearTimeout(t);
  }, [aviso]);
  const buscaAtraso = useDebounce(busca);
  const somenteLeitura = usuario.perfil === PERFIS.VISUALIZADOR;
  const { data: produtos, loading, error, reload } = useFetch(() => api.produtos.listar({ status: aba, busca: buscaAtraso }), [aba, buscaAtraso]);

  const reativar = async (p) => {
    setErroAcao("");
    try { await api.produtos.reativar(p.id); reload(); } catch (e) { setErroAcao(e.message); }
    setReativando(null);
  };

  if (editando) {
    return (
      <ProdutoDetalhe
        produtoId={editando}
        somenteLeitura={somenteLeitura}
        ehAdmin={usuario.perfil === PERFIS.ADMIN}
        onVoltar={(mensagem) => { setEditando(null); setAviso(typeof mensagem === "string" ? mensagem : ""); reload(); }}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Produtos" subtitle="Itens cadastrados no estoque" />
      <FilterBar>
        <StatusTabsField tab={aba} setTab={setAba} />
        <SearchField placeholder="Nome do produto…" value={busca} onChange={setBusca} />
      </FilterBar>
      {aviso && <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "var(--green-100)", color: "var(--green-600)" }}>{aviso}</div>}
      <ErrorBox mensagem={error || erroAcao} onRetry={error ? reload : undefined} />

      <div className="stk-card stk-table-wrap">
        <table className="stk-table">
          <thead>
            <tr>
              <th>Nome</th><th>Quantidade</th><th>Unidade de medida</th><th>Status</th>
              <th className="right">{somenteLeitura ? "Detalhes" : "Editar"}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !produtos ? (
              <tr><td colSpan={5}><Loading /></td></tr>
            ) : (produtos || []).map((p) => (
              <tr key={p.id}>
                <td data-label="Nome">
                  <div className="flex items-center gap-2">
                    {p.nome}
                    {p.ativo && p.quantidade <= p.limiteEstoqueBaixo && <span title="Estoque baixo"><AlertTriangle size={13} style={{ color: "var(--amber-500)" }} /></span>}
                  </div>
                </td>
                <td data-label="Quantidade" className="font-mono">{p.quantidade}</td>
                <td data-label="Unidade de medida" className="font-mono">{p.unidade}</td>
                <td data-label="Status">
                  <span className="stk-badge" style={{ background: p.ativo ? "var(--green-100)" : "var(--red-100)", color: p.ativo ? "var(--green-600)" : "var(--red-500)" }}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td data-label="" className="right">
                  {p.ativo ? (
                    <button onClick={() => setEditando(p.id)} className="stk-focus" style={{ color: "var(--teal-600)" }} title={somenteLeitura ? "Ver produto" : "Editar produto"}>
                      {somenteLeitura ? <Eye size={15} /> : <Edit2 size={15} />}
                    </button>
                  ) : !somenteLeitura ? (
                    <button onClick={() => setReativando(p)} className="stk-focus text-xs font-semibold" style={{ color: "var(--green-600)" }}>Reativar</button>
                  ) : (
                    <span style={{ color: "var(--text-300)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {produtos && produtos.length === 0 && <EmptyRow colSpan={5} texto="Nenhum produto encontrado." />}
          </tbody>
        </table>
      </div>

      {reativando && (
        <ConfirmDialog title={`Reativar "${reativando.nome}"?`} confirmar="Reativar" positivo
          texto="O produto volta a aparecer na saída de estoque e poderá ser editado novamente."
          onConfirm={() => reativar(reativando)} onCancel={() => setReativando(null)} />
      )}
    </div>
  );
}
