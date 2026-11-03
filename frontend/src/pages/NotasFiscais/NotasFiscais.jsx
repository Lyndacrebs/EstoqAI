import { useState } from "react";
import { api } from "../../services/api";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { fmtDate } from "../../utils/dates";
import PageHeader from "../../components/ui/PageHeader";
import { DateRangeFields, FilterBar, SearchField } from "../../components/ui/Filters";
import { EmptyRow, ErrorBox, Loading } from "../../components/ui/Feedback";
import NFDetalhes from "./NFDetalhes";

export default function NotasFiscais() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [busca, setBusca] = useState("");
  const [abrir, setAbrir] = useState(null);
  const buscaAtraso = useDebounce(busca);
  const { data: notas, loading, error, reload } = useFetch(() => api.notasFiscais.listar({ busca: buscaAtraso, de, ate }), [buscaAtraso, de, ate]);

  return (
    <div>
      <PageHeader title="Notas fiscais" subtitle="Histórico de NF cadastradas por leitura na entrada de produtos" />
      <FilterBar>
        <SearchField placeholder="Fornecedor ou CNPJ…" value={busca} onChange={setBusca} />
        <DateRangeFields from={de} to={ate} setFrom={setDe} setTo={setAte} />
      </FilterBar>
      <ErrorBox mensagem={error} onRetry={reload} />

      <div className="stk-card overflow-hidden">
        <table className="stk-table">
          <thead>
            <tr><th>Nome da NF</th><th>Data</th><th>Produtos</th><th>Usuário responsável</th><th className="right">Ações</th></tr>
          </thead>
          <tbody>
            {loading && !notas ? (
              <tr><td colSpan={5}><Loading /></td></tr>
            ) : (notas || []).map((nf) => (
              <tr key={nf.id}>
                <td>
                  <p className="font-medium">{nf.nome}</p>
                  <p className="text-xs font-mono" style={{ color: "var(--text-300)" }}>{nf.id}</p>
                </td>
                <td>{fmtDate(nf.data)}</td>
                <td style={{ color: "var(--text-500)" }}>{nf.quantidadeProdutos} produto(s)</td>
                <td>{nf.usuarioResponsavel}</td>
                <td className="right"><button onClick={() => setAbrir(nf.id)} className="stk-link-btn stk-focus">Detalhes</button></td>
              </tr>
            ))}
            {notas && notas.length === 0 && <EmptyRow colSpan={5} texto="Nenhuma nota fiscal encontrada." />}
          </tbody>
        </table>
      </div>

      {abrir && <NFDetalhes notaId={abrir} onClose={() => setAbrir(null)} />}
    </div>
  );
}
