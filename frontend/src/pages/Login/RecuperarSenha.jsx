import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { api } from "../../services/api";
import { PERFIS } from "../../utils/roles";
import PasswordInput from "../../components/ui/PasswordInput";

/*
  Recuperação de senha em 2 passos:
  1) a pessoa confirma nome completo, data de nascimento, e-mail e perfil (3 tentativas por e-mail);
  2) se os dados conferem, define a nova senha.
  A contagem de tentativas e o bloqueio ficam no backend.
*/
export default function RecuperarSenha({ emailInicial = "", onVoltar }) {
  const [passo, setPasso] = useState(1); // 1 dados | 2 nova senha | 3 concluído
  const [dados, setDados] = useState({ nome: "", dataNascimento: "", email: emailInicial, perfil: PERFIS.OPERADOR });
  const [chave, setChave] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (campo, valor) => setDados({ ...dados, [campo]: valor });
  const rotulo = { color: "var(--text-500)" };
  const completo = dados.nome.trim() && dados.dataNascimento && dados.email.trim() && dados.perfil;

  const verificar = async () => {
    setErro(""); setEnviando(true);
    try {
      const r = await api.auth.verificarRecuperacao({ ...dados, nome: dados.nome.trim(), email: dados.email.trim() });
      setChave(r.chaveRecuperacao);
      setPasso(2);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const redefinir = async () => {
    if (!senha) { setErro("Informe a nova senha."); return; }
    if (senha !== confirmacao) { setErro("As senhas não são iguais."); return; }
    setErro(""); setEnviando(true);
    try {
      await api.auth.redefinirSenha({ chaveRecuperacao: chave, novaSenha: senha });
      setPasso(3);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <button type="button" onClick={onVoltar} className="stk-focus flex items-center gap-1.5 text-sm mb-5" style={rotulo}>
        <ArrowLeft size={15} /> Voltar para o login
      </button>

      {passo === 1 && (
        <>
          <h2 className="font-display text-xl font-semibold mb-1">Redefinir senha</h2>
          <p className="text-sm mb-4" style={rotulo}>Confirme seus dados de cadastro. Você tem 3 tentativas; se errar, será preciso procurar um usuário administrador.</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium" style={rotulo}>Nome completo</label>
              <input className="stk-input stk-focus mt-1" value={dados.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium" style={rotulo}>Data de nascimento</label>
                <input type="date" className="stk-input stk-focus mt-1" value={dados.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium" style={rotulo}>Tipo de perfil</label>
                <select className="stk-input stk-focus mt-1" value={dados.perfil} onChange={(e) => set("perfil", e.target.value)}>
                  {Object.values(PERFIS).map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium" style={rotulo}>E-mail</label>
              <input type="email" className="stk-input stk-focus mt-1" placeholder="seuemail@empresa.com" value={dados.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            {erro && <p className="text-xs" style={{ color: "var(--red-500)" }}>{erro}</p>}
            <button type="button" onClick={verificar} disabled={!completo || enviando} className="stk-btn-primary stk-focus rounded-lg py-2.5 text-sm">{enviando ? "Verificando…" : "Continuar"}</button>
          </div>
        </>
      )}

      {passo === 2 && (
        <>
          <h2 className="font-display text-xl font-semibold mb-1">Nova senha</h2>
          <p className="text-sm mb-4" style={rotulo}>Dados confirmados. Defina a nova senha de acesso.</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium" style={rotulo}>Nova senha</label>
              <div className="mt-1"><PasswordInput value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
            </div>
            <div>
              <label className="text-xs font-medium" style={rotulo}>Confirmar nova senha</label>
              <div className="mt-1"><PasswordInput value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") redefinir(); }} /></div>
            </div>
            {erro && <p className="text-xs" style={{ color: "var(--red-500)" }}>{erro}</p>}
            <button type="button" onClick={redefinir} disabled={enviando} className="stk-btn-primary stk-focus rounded-lg py-2.5 text-sm">{enviando ? "Salvando…" : "Salvar nova senha"}</button>
          </div>
        </>
      )}

      {passo === 3 && (
        <>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--teal-100)" }}>
            <Check size={20} style={{ color: "var(--teal-600)" }} />
          </div>
          <h2 className="font-display text-lg font-semibold mb-1">Senha alterada</h2>
          <p className="text-sm mb-4" style={rotulo}>Sua senha foi redefinida. Entre com a nova senha.</p>
          <button type="button" onClick={onVoltar} className="stk-btn-primary stk-focus rounded-lg py-2.5 text-sm">Ir para o login</button>
        </>
      )}
    </>
  );
}
