import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { podeAcessar } from "../../utils/roles";
import { Loading } from "../ui/Feedback";

/* Protege as rotas: sem login volta ao /login; sem permissão volta ao Dashboard */
export default function RequireRole() {
  const { usuario, verificando } = useAuth();
  const { pathname } = useLocation();
  if (verificando) return <Loading />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!podeAcessar(usuario.perfil, pathname)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
