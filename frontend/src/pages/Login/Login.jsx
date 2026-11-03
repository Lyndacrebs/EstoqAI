import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Package } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import PasswordInput from "../../components/ui/PasswordInput";
import DecorBarcode from "../../components/ui/DecorBarcode";
import RecuperarSenha from "./RecuperarSenha";

export default function Login() {
  const { usuario, aviso, entrar, limparAviso } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [esqueci, setEsqueci] = useState(false);

  if (usuario) return <Navigate to="/dashboard" replace />;

  const tentarLogin = async () => {
    if (!email.trim() || !senha) { setErro("Informe e-mail e senha."); return; }
    setErro(""); limparAviso(); setEnviando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const aoApertarEnter = (e) => { if (e.key === "Enter") tentarLogin(); };
  const mensagem = erro || aviso;

  return (
    <div className="login-page">
      <div className="login-card w-full max-w-4xl grid md:grid-cols-2 stk-card overflow-hidden">
        <div className="login-hero p-6 md:p-10 flex flex-col text-white">
          <div>
            <div className="flex items-center gap-2 mb-5 md:mb-8">
              <div className="app-logo" style={{ width: 36, height: 36 }}><Package size={18} /></div>
              <span className="font-display font-semibold text-lg tracking-tight">EstoqAI</span>
            </div>
            <h1 className="font-display text-xl md:text-3xl font-semibold leading-tight md:mb-3">
              Gestão de estoque pensada para pequenas e médias empresas
            </h1>
          </div>
          <div className="hidden md:block opacity-80 mt-auto pt-10">
            <DecorBarcode code="ESTOQAI2026" height={28} />
          </div>
        </div>

        <div className="p-6 md:p-10 flex flex-col justify-center bg-white">
          {!esqueci ? (
            <>
              <h2 className="font-display text-xl font-semibold mb-6">Entrar</h2>
              <div className="flex flex-col gap-3 mb-1">
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>E-mail</label>
                <input type="email" className="stk-input stk-focus" placeholder="seuemail@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={aoApertarEnter} />
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Senha</label>
                <PasswordInput value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={aoApertarEnter} />
                <button type="button" onClick={() => { setEsqueci(true); setErro(""); limparAviso(); }} className="stk-focus text-xs font-medium text-left" style={{ color: "var(--teal-600)" }}>
                  Esqueci minha senha
                </button>
                {mensagem && <p className="text-xs" style={{ color: "var(--red-500)" }}>{mensagem}</p>}
                <button type="button" disabled={enviando} onClick={tentarLogin} className="stk-btn-primary stk-focus rounded-lg py-2.5 text-sm mt-2">{enviando ? "Entrando…" : "Entrar"}</button>
              </div>
            </>
          ) : (
            <RecuperarSenha emailInicial={email} onVoltar={() => { setEsqueci(false); setErro(""); }} />
          )}
        </div>
      </div>
    </div>
  );
}
