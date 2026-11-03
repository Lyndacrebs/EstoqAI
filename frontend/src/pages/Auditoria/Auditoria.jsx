import { useState } from "react";
import { api } from "../../services/api";
import { useFetch } from "../../hooks/useFetch";
import { daysAgo, todayStr } from "../../utils/dates";
import { NAV_ITEMS } from "../../utils/roles";
import PageHeader from "../../components/ui/PageHeader";
import { DateRangeFields, FilterBar, SelectField } from "../../components/ui/Filters";
import { EmptyRow, ErrorBox, Loading } from "../../components/ui/Feedback";
import AuditoriaDetalhes from "./AuditoriaDetalhes";

// Setores que geram registro, na mesma ordem do menu lateral
const SETORES = ["Nova entrada (NF)", "Saída de estoque", "Produtos", "Saídas", "Usuários"]
  .sort((a, b) => NAV_ITEMS.findIndex((i) => i.label === a) - NAV_ITEMS.findIndex((i) => i.label === b));

export default function Auditoria() {
  const [setor, setSetor] = useState("");
  const [usuarioFiltro, setUsuarioFiltro] = useState("");
  const [de, setDe] = useState(daysAgo(30));
  const [ate, setAte] = useState(todayStr());
  const [abrir, setAbrir] = useState(null);
  const { data: usuarios } = useFetch(() => api.usuarios.listar({ status: "todos" }), []);
  const { data: logs, loading, error, reload } = useFetch(() => api.auditoria.listar({ setor, usuario: usuarioFiltro, de, ate }), [setor, usuarioFiltro, de, ate]);

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Registro de todas as ações realizadas no sistema" />
      <FilterBar>
        <SelectField label="Setor" value={setor} onChange={setSetor} options={[["", "Todos os setores"], ...SETORES.map((s) => [s, s])]} />
        <SelectField label="Usuário" value={usuarioFiltro} onChange={setUsuarioFiltro} options={[["", "Todos os usuários"], ...(usuarios || []).map((u) => [u.nome, u.nome])]} />
        <DateRangeFields from={de} to={ate} setFrom={setDe} setTo={setAte} />
      </FilterBar>
      <ErrorBox mensagem={error} onRetry={reload} />

      <div className="stk-card stk-table-wrap">
        <table className="stk-table">
          <thead>
            <tr><th>Usuário</th><th>Ação</th><th>Data / hora</th><th>Setor</th><th className="right">Detalhes</th></tr>
          </thead>
          <tbody>
            {loading && !logs ? (
              <tr><td colSpan={5}><Loading /></td></tr>
            ) : (logs || []).map((l) => (
              <tr key={l.id}>
                <td data-label="Usuário">{l.usuario}</td>
                <td data-label="Ação">{l.acao}</td>
                <td data-label="Data / hora" className="font-mono text-xs" style={{ color: "var(--text-500)" }}>{l.dataHora}</td>
                <td data-label="Setor"><span className="stk-badge" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>{l.setor}</span></td>
                <td data-label="" className="right"><button onClick={() => setAbrir(l)} className="stk-link-btn stk-focus">Ver detalhes</button></td>
              </tr>
            ))}
            {logs && logs.length === 0 && <EmptyRow colSpan={5} texto="Nenhum registro encontrado." />}
          </tbody>
        </table>
      </div>

      {abrir && <AuditoriaDetalhes registro={abrir} onClose={() => setAbrir(null)} />}
    </div>
  );
}
