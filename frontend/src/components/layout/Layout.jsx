import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, Package, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { NAV_ITEMS } from "../../utils/roles";

/* Menu lateral + área de conteúdo. Mostra só as abas permitidas ao perfil.
   No celular/tablet o menu fica escondido e abre pelo botão no topo (ver styles/responsive.css). */
export default function Layout() {
  const { usuario, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  // ao escolher uma aba, o menu fecha sozinho
  useEffect(() => { setMenuAberto(false); }, [pathname]);

  // a tecla Esc também fecha o menu
  useEffect(() => {
    if (!menuAberto) return undefined;
    const fechar = (e) => { if (e.key === "Escape") setMenuAberto(false); };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [menuAberto]);

  return (
    <div className="app-shell">
      {/* barra do topo: só aparece no celular/tablet */}
      <header className="app-topbar">
        <button type="button" onClick={() => setMenuAberto(true)} className="app-menu-btn stk-focus" aria-label="Abrir menu" aria-expanded={menuAberto}>
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="app-logo"><Package size={16} /></div>
          <span className="font-display font-semibold tracking-tight">EstoqAI</span>
        </div>
      </header>

      {menuAberto && <div className="app-backdrop" onClick={() => setMenuAberto(false)} aria-hidden="true" />}

      <aside className={`app-sidebar ${menuAberto ? "aberto" : ""}`}>
        <div>
          <div className="flex items-center justify-between px-2 mb-6 mt-1">
            <div className="flex items-center gap-2">
              <div className="app-logo"><Package size={16} /></div>
              <span className="font-display font-semibold tracking-tight">EstoqAI</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={sair} className="stk-focus flex items-center gap-1 text-xs font-medium" style={{ color: "var(--text-300)" }}>
                <LogOut size={13} /> Sair
              </button>
              <button type="button" onClick={() => setMenuAberto(false)} className="app-close-btn stk-focus" aria-label="Fechar menu"><X size={18} /></button>
            </div>
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
