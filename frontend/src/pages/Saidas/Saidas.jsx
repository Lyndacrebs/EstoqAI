import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { PERFIS } from "../../utils/roles";
import { daysAgo, fmtDate, todayStr } from "../../utils/dates";
import PageHeader from "../../components/ui/PageHeader";
import { DateRangeFields, FilterBar, SearchField } from "../../components/ui/Filters";
import { EmptyRow, ErrorBox, Loading } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SaidaDetalhes from "./SaidaDetalhes";

export default function Saidas() {
  const { usuario } = useAuth();
  const [de, setDe] = useState(daysAgo(30));
  const [ate, setAte] = useState(todayStr());
  const [busca, setBusca] = useState("");
  const [abrir, setAbrir] = useState(null);       // id da saída aberta em "Detalhes"
  const [excluir, setExcluir] = useState(null);   // saída em confirmação de exclusão
  const [excluindo, setExcluindo] = useState(false);
  const [erroAcao, setErroAcao] = useState("");
  const buscaAtraso = useDebounce(busca);
  const ehAdmin = usuario.perfil === PERFIS.ADMIN;
  const { data: saidas, loading, error, reload } = useFetch(() => api.saidas.listar({ busca: buscaAtraso, de, ate }), [buscaAtraso, de, ate]);

  const confirmarExclusao = async () => {
    setExcluindo(true); setErroAcao("");
    try {
      await api.saidas.excluir(excluir.id);
      setExcluir(null);
      reload();
    } catch (e) {
      setErroAcao(e.message); setExcluir(null);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div>
      <PageHeader title="Saídas" subtitle="Histórico de saídas registradas no estoque" />
      <FilterBar>
        <SearchField placeholder="ID ou usuário responsável…" value={busca} onChange={setBusca} />
        <DateRangeFields from={de} to={ate} setFrom={setDe} setTo={setAte} />
      </FilterBar>
      <ErrorBox mensagem={error || erroAcao} onRetry={error ? reload : undefined} />

      <div className="stk-card overflow-hidden">
        <table className="stk-table">
          <thead>
            <tr><th>ID</th><th>Data</th><th>Usuário responsável</th><th>Produtos</th><th className="right">Ações</th></tr>
          </thead>
          <tbody>
            {loading && !saidas ? (
              <tr><td colSpan={5}><Loading /></td></tr>
            ) : (saidas || []).map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.id}</td>
                <td>{fmtDate(s.data)}</td>
                <td>{s.usuarioResponsavel}</td>
                <td style={{ color: "var(--text-500)" }}>{s.quantidadeProdutos} produto(s)</td>
                <td className="right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setAbrir(s.id)} className="stk-link-btn stk-focus">Detalhes</button>
                    {ehAdmin && <button onClick={() => setExcluir(s)} className="stk-focus" style={{ color: "var(--red-500)" }} title="Excluir"><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {saidas && saidas.length === 0 && <EmptyRow colSpan={5} texto="Nenhuma saída encontrada." />}
          </tbody>
        </table>
      </div>

      {abrir && <SaidaDetalhes saidaId={abrir} ehAdmin={ehAdmin} onClose={() => setAbrir(null)} onChanged={() => { setAbrir(null); reload(); }} />}
      {excluir && (
        <ConfirmDialog title={`Excluir ${excluir.id}?`} texto="As quantidades desta saída voltam para o estoque. Essa ação não pode ser desfeita."
          confirmar="Excluir" perigo carregando={excluindo} onConfirm={confirmarExclusao} onCancel={() => setExcluir(null)} />
      )}
    </div>
  );
}
