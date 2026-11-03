import { useState } from "react";
import { Edit2, Plus } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { DESCRICAO_PERFIS } from "../../utils/roles";
import PageHeader from "../../components/ui/PageHeader";
import { FilterBar, SearchField, StatusTabsField } from "../../components/ui/Filters";
import { EmptyRow, ErrorBox, Loading } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import UsuarioForm from "./UsuarioForm";

export default function Usuarios() {
  const { usuario: logado } = useAuth();
  const [aba, setAba] = useState("ativos");
  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [erroAcao, setErroAcao] = useState("");
  const [confirmar, setConfirmar] = useState(null); // usuário aguardando confirmação (desativar ou reativar)
  const buscaAtraso = useDebounce(busca);
  const { data: usuarios, loading, error, reload } = useFetch(() => api.usuarios.listar({ status: aba, busca: buscaAtraso }), [aba, buscaAtraso]);

  const alternar = async (u) => {
    setErroAcao("");
    try {
      if (u.ativo) await api.usuarios.desativar(u.id); else await api.usuarios.reativar(u.id);
      setConfirmar(null);
      reload();
    } catch (e) {
      setErroAcao(e.message);
      setConfirmar(null);
    }
  };
  const fechar = () => { setFormAberto(false); setEditando(null); };

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gerenciamento do cadastro de usuários"
        action={<button onClick={() => { setEditando(null); setFormAberto(true); }} className="stk-btn-primary stk-focus px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"><Plus size={15} /> Novo usuário</button>} />

      {formAberto && <UsuarioForm usuario={editando} onCancel={fechar} onSaved={() => { fechar(); reload(); }} />}

      <FilterBar>
        <StatusTabsField tab={aba} setTab={setAba} />
        <SearchField placeholder="Nome do usuário…" value={busca} onChange={setBusca} />
      </FilterBar>
      <ErrorBox mensagem={error || erroAcao} onRetry={error ? reload : undefined} />

      <div className="stk-card stk-table-wrap">
        <table className="stk-table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th className="right">Ações</th></tr>
          </thead>
          <tbody>
            {loading && !usuarios ? (
              <tr><td colSpan={5}><Loading /></td></tr>
            ) : (usuarios || []).map((u) => (
              <tr key={u.id}>
                <td data-label="Nome">{u.nome}</td>
                <td data-label="E-mail" style={{ color: "var(--text-500)" }}>{u.email}</td>
                <td data-label="Perfil"><span className="stk-badge" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>{u.perfil}</span></td>
                <td data-label="Status">
                  <span className="stk-badge" style={{ background: u.ativo ? "var(--green-100)" : "var(--red-100)", color: u.ativo ? "var(--green-600)" : "var(--red-500)" }}>{u.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td data-label="" className="right">
                  <div className="flex items-center justify-end gap-3">
                    {u.ativo && <button onClick={() => { setEditando(u); setFormAberto(true); }} className="stk-focus" style={{ color: "var(--teal-600)" }} title="Editar usuário"><Edit2 size={15} /></button>}
                    {u.id === logado.id ? (
                      <span className="text-xs" style={{ color: "var(--text-300)" }} title="Você não pode desativar o próprio cadastro">Você</span>
                    ) : (
                      <button onClick={() => setConfirmar(u)} className="stk-focus text-xs font-semibold" style={{ color: u.ativo ? "var(--red-500)" : "var(--green-600)" }}>{u.ativo ? "Desativar" : "Reativar"}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {usuarios && usuarios.length === 0 && <EmptyRow colSpan={5} texto="Nenhum usuário encontrado." />}
          </tbody>
        </table>
      </div>

      {confirmar && (
        <ConfirmDialog
          title={`${confirmar.ativo ? "Desativar" : "Reativar"} "${confirmar.nome}"?`}
          confirmar={confirmar.ativo ? "Desativar" : "Reativar"} perigo={confirmar.ativo} positivo={!confirmar.ativo}
          texto={confirmar.ativo
            ? "Essa pessoa perde o acesso ao sistema imediatamente, mesmo que esteja logada agora. O cadastro e o histórico são mantidos, e você pode reativar depois."
            : "Essa pessoa volta a ter acesso ao sistema com o perfil e a senha do cadastro atual."}
          onConfirm={() => alternar(confirmar)} onCancel={() => setConfirmar(null)} />
      )}

      <p className="font-display font-semibold text-sm mt-6 mb-3">O que cada perfil pode fazer</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DESCRICAO_PERFIS.map((d) => (
          <div key={d.perfil} className="stk-card p-4">
            <p className="font-semibold text-sm mb-1.5">{d.perfil}</p>
            <p className="text-xs" style={{ color: "var(--text-500)" }}>{d.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
