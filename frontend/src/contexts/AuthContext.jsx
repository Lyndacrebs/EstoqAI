import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { setAuthErrorHandler } from "../services/http";
import { clearSession, getStoredUser, getToken, saveSession } from "../services/session";

/*
  Guarda quem está logado e cuida do ciclo da sessão:
  - login / logout;
  - se o usuário for desativado (ou o token vencer), volta ao login com um aviso;
  - consulta /usuarios/me a cada 15 s para encerrar a sessão logo após a desativação.
*/

const AuthContext = createContext(null);
const INTERVALO_VERIFICACAO = 15000;

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => (getToken() ? getStoredUser() : null));
  const [aviso, setAviso] = useState("");
  const [verificando, setVerificando] = useState(() => !!getToken());
  const usuarioRef = useRef(usuario);
  usuarioRef.current = usuario;

  const sair = useCallback((mensagem = "") => {
    clearSession();
    setUsuario(null);
    setAviso(mensagem);
  }, []);

  // qualquer resposta 401/403 de sessão vinda da API cai aqui
  useEffect(() => {
    setAuthErrorHandler((err) => {
      if (!usuarioRef.current) return;
      sair(err.status === 403 ? err.message : "Sua sessão expirou. Entre novamente.");
    });
    return () => setAuthErrorHandler(null);
  }, [sair]);

  // ao abrir o sistema com token salvo, confere se ele ainda vale
  useEffect(() => {
    if (!getToken()) { setVerificando(false); return; }
    api.auth.me()
      .then((u) => { setUsuario(u); saveSession(getToken(), u); })
      .catch(() => { /* o handler de sessão já tratou 401/403 */ })
      .finally(() => setVerificando(false));
  }, []);

  // checagem periódica enquanto logado
  useEffect(() => {
    if (!usuario) return undefined;
    const t = setInterval(() => { api.auth.me().catch(() => {}); }, INTERVALO_VERIFICACAO);
    return () => clearInterval(t);
  }, [usuario]);

  const entrar = useCallback(async (email, senha) => {
    const { token, usuario: u } = await api.auth.login(email, senha);
    saveSession(token, u);
    setAviso("");
    setUsuario(u);
    return u;
  }, []);

  const valor = useMemo(() => ({
    usuario, aviso, verificando, entrar,
    sair: () => sair(""),
    limparAviso: () => setAviso(""),
  }), [usuario, aviso, verificando, entrar, sair]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
