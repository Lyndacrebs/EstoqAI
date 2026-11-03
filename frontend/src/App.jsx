import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import RequireRole from "./components/layout/RequireRole";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import NovaEntrada from "./pages/NovaEntrada/NovaEntrada";
import SaidaEstoque from "./pages/SaidaEstoque/SaidaEstoque";
import Produtos from "./pages/Produtos/Produtos";
import NotasFiscais from "./pages/NotasFiscais/NotasFiscais";
import Saidas from "./pages/Saidas/Saidas";
import Auditoria from "./pages/Auditoria/Auditoria";
import Usuarios from "./pages/Usuarios/Usuarios";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireRole />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nova-entrada" element={<NovaEntrada />} />
              <Route path="/saida" element={<SaidaEstoque />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/notas-fiscais" element={<NotasFiscais />} />
              <Route path="/saidas" element={<Saidas />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
