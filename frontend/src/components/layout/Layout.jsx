import { NavLink, Outlet } from "react-router-dom";
import { LogOut, Package } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { NAV_ITEMS } from "../../utils/roles";

/* Menu lateral + área de conteúdo. Mostra só as abas permitidas ao perfil. */
export default function Layout() {
  const { usuario, sair } = useAuth();
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <div className="flex items-center justify-between px-2 mb-6 mt-1">
            <div className="flex items-center gap-2">
              <div className="app-logo"><Package size={16} /></div>
              <span className="font-display font-semibold tracking-tight">EstoqAI</span>
            </div>
            <button onClick={sair} className="stk-focus flex items-center gap-1 text-xs font-medium" style={{ color: "var(--text-300)" }}>
              <LogOut size={13} /> Sair
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.filter((i) => i.perfis.includes(usuario.perfil)).map((item) => (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) => `stk-nav-item stk-focus flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${isActive ? "active" : ""}`}>
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="app-user-card">
          <p className="text-sm font-semibold">{usuario.nome}</p>
          <p className="text-xs font-mono truncate" style={{ color: "var(--text-300)" }}>{usuario.email}</p>
          <p className="text-xs mt-1" style={{ color: "var(--teal-500)" }}>{usuario.perfil}</p>
        </div>
      </aside>
      <main className="app-main stk-fadein">
        <Outlet />
      </main>
    </div>
  );
}
