import { useState } from "react";
import { api } from "../../services/api";
import { PERFIS } from "../../utils/roles";
import PasswordInput from "../../components/ui/PasswordInput";

/* Formulário de cadastro/edição de usuário (sem senha na edição = mantém a atual) */
export default function UsuarioForm({ usuario, onCancel, onSaved }) {
  const editando = !!usuario;
  const [form, setForm] = useState({
    nome: usuario?.nome || "", dataNascimento: usuario?.dataNascimento || "", email: usuario?.email || "",
    perfil: usuario?.perfil || PERFIS.OPERADOR, senha: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (campo, valor) => setForm({ ...form, [campo]: valor });
  const rotulo = { color: "var(--text-500)" };

  const salvar = async () => {
    if (!form.nome.trim() || !form.dataNascimento || !form.email.trim() || !form.perfil || (!editando && !form.senha)) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    setErro(""); setSalvando(true);
    try {
      const dados = { nome: form.nome.trim(), dataNascimento: form.dataNascimento, email: form.email.trim(), perfil: form.perfil, ...(form.senha ? { senha: form.senha } : {}) };
      if (editando) await api.usuarios.atualizar(usuario.id, dados); else await api.usuarios.criar(dados);
      onSaved();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="stk-card p-4 md:p-5 mb-5 max-w-2xl">
      <p className="font-display font-semibold text-sm mb-3">{editando ? "Editar usuário" : "Novo usuário"}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium" style={rotulo}>Nome completo</label>
          <input className="stk-input stk-focus mt-1" value={form.nome} onChange={(e) => set("nome", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium" style={rotulo}>Data de nascimento</label>
          <input type="date" className="stk-input stk-focus mt-1" value={form.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium" style={rotulo}>E-mail</label>
          <input type="email" className="stk-input stk-focus mt-1" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium" style={rotulo}>Tipo de perfil</label>
          <select className="stk-input stk-focus mt-1" value={form.perfil} onChange={(e) => set("perfil", e.target.value)}>
            {Object.values(PERFIS).map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium" style={rotulo}>{editando ? "Nova senha (deixe em branco para manter a atual)" : "Senha"}</label>
          <div className="mt-1"><PasswordInput value={form.senha} onChange={(e) => set("senha", e.target.value)} /></div>
        </div>
      </div>
      {erro && <p className="text-xs mt-3" style={{ color: "var(--red-500)" }}>{erro}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="stk-btn-outline stk-focus px-4 py-2 rounded-lg text-sm">Cancelar</button>
        <button onClick={salvar} disabled={salvando} className="stk-btn-primary stk-focus px-4 py-2 rounded-lg text-sm">{salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar usuário"}</button>
      </div>
    </div>
  );
}
