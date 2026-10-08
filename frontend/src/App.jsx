import React, { useState, useMemo } from "react";
import {
  LayoutDashboard, Upload, Camera, Package, PackageMinus, Users, FileBarChart,
  LogOut, Search, Plus, Edit2, Check, X, AlertTriangle, Printer, Scan,
  ChevronRight, Tag, TrendingUp, TrendingDown, FileText, ArrowLeft, ArrowRight,
  ImagePlus, Sparkles, ShieldCheck, Eye, EyeOff, ClipboardList, Calendar,
  Download, ClipboardCheck, Lock, ExternalLink, Trash2, History, FileStack
} from "lucide-react";

/* ---------------------------------------------------------
   DESIGN TOKENS
   Paleta "controle de armazém": navy operacional + teal de
   ação + âmbar de alerta. Tipografia: display geométrica
   (Space Grotesk) + corpo (Inter) + mono para códigos/IDs
   (JetBrains Mono), reforçando o universo de etiquetas e
   códigos de barra do sistema.
---------------------------------------------------------- */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .stk-root {
      --bg: #F5F7FA;
      --surface: #FFFFFF;
      --navy-900: #12203D;
      --navy-800: #182A4C;
      --navy-700: #23385F;
      --teal-500: #0EA5A0;
      --teal-600: #0A8B87;
      --teal-100: #E1F5F3;
      --amber-500: #EE9E1F;
      --amber-100: #FDF0DA;
      --red-500: #E15252;
      --red-100: #FBE6E6;
      --green-600: #3F8F5F;
      --green-100: #E4F3E9;
      --text-900: #14213D;
      --text-500: #62708A;
      --text-300: #A2AEC2;
      --border: #E3E7EE;
      font-family: 'Inter', sans-serif;
      color: var(--text-900);
      background: var(--bg);
    }
    .stk-root .font-display { font-family: 'Space Grotesk', sans-serif; }
    .stk-root .font-mono { font-family: 'JetBrains Mono', monospace; }

    .stk-barcode {
      display: inline-flex; align-items: stretch; gap: 2px; height: 34px;
    }
    .stk-barcode span { display: block; background: var(--navy-900); }

    .stk-scanline {
      position: absolute; left: 4%; right: 4%; height: 2px;
      background: linear-gradient(90deg, transparent, var(--teal-500), transparent);
      animation: stk-scan 1.6s ease-in-out infinite;
      box-shadow: 0 0 12px 1px var(--teal-500);
    }
    @keyframes stk-scan {
      0% { top: 8%; opacity: 0; }
      15% { opacity: 1; }
      50% { top: 88%; opacity: 1; }
      85% { opacity: 1; }
      100% { top: 92%; opacity: 0; }
    }

    .stk-fadein { animation: stk-fadein .25s ease-out; }
    @keyframes stk-fadein { from { opacity: 0; transform: translateY(4px);} to { opacity:1; transform:none; } }

    .stk-btn-primary {
      background: var(--teal-500); color: white; font-weight: 600;
      transition: background .15s ease;
    }
    .stk-btn-primary:hover { background: var(--teal-600); }
    .stk-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

    .stk-nav-item { transition: background .15s ease, color .15s ease; }
    .stk-nav-item.active { background: var(--teal-500); color: white; }
    .stk-nav-item:not(.active):hover { background: var(--navy-700); color: white; }

    .stk-input {
      border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px;
      font-size: 14px; width: 100%; background: white; color: var(--text-900);
      transition: border-color .15s ease;
    }
    .stk-input:focus { outline: none; border-color: var(--teal-500); }

    .stk-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; }
    .stk-focus:focus-visible { outline: 2px solid var(--teal-500); outline-offset: 2px; }
  `}</style>
);

/* ---------------------------------------------------------
   BARCODE (visual only) — gera barras pseudo-aleatórias
   determinísticas a partir do código do produto
---------------------------------------------------------- */
function Barcode({ code, height = 34 }) {
  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i) * (i + 1);
    const arr = [];
    for (let i = 0; i < 28; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      arr.push(1 + (seed % 4));
    }
    return arr;
  }, [code]);
  return (
    <div className="stk-barcode" style={{ height }}>
      {bars.map((w, i) => (
        <span key={i} style={{ width: w }} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   MOCK DATA
---------------------------------------------------------- */
const initialProducts = [
  { id: "EST-0001", name: "Papel A4 75g (pacote 500fl)", quantity: 42, unit: "pct", category: "Papelaria", description: "Pacote com 500 folhas, papel branco 75g.", keywords: ["papel sulfite", "resma a4"], lowStockLimit: 10, active: true, isNew: false, dateAdded: "2026-07-02" },
  { id: "EST-0002", name: "Caneta esferográfica azul", quantity: 8, unit: "un", category: "Papelaria", description: "Caneta esferográfica ponta 1.0mm.", keywords: ["caneta azul bic"], lowStockLimit: 15, active: true, isNew: false, dateAdded: "2026-06-18" },
  { id: "EST-0003", name: "Detergente neutro 500ml", quantity: 3, unit: "un", category: "Limpeza", description: "Detergente concentrado neutro.", keywords: ["detergente incolor"], lowStockLimit: 5, active: true, isNew: false, dateAdded: "2026-05-30" },
  { id: "EST-0004", name: "Copo descartável 200ml (pacote c/100)", quantity: 60, unit: "pct", category: "Cozinha", description: "Copos plásticos descartáveis translúcidos.", keywords: ["copo plastico", "copo agua"], lowStockLimit: 20, active: true, isNew: false, dateAdded: "2026-04-11" },
  { id: "EST-0005", name: "Álcool em gel 500ml", quantity: 25, unit: "un", category: "Limpeza", description: "Álcool em gel 70%.", keywords: ["alcool gel"], lowStockLimit: 10, active: false, isNew: false, dateAdded: "2026-03-20" },
];

const initialUsers = [
  { id: "USR-0001", name: "Usuário Teste 1", email: "usuarioteste1@empresa.com", birthdate: "1990-04-12", role: "Admin", active: true },
  { id: "USR-0002", name: "Usuário Teste 2", email: "usuarioteste2@empresa.com", birthdate: "1995-09-03", role: "Operador", active: true },
  { id: "USR-0003", name: "Usuário Teste 3", email: "usuarioteste3@empresa.com", birthdate: "1998-01-22", role: "Visualizador", active: true },
  { id: "USR-0004", name: "Usuário Teste 4", email: "usuarioteste4@empresa.com", birthdate: "1993-11-30", role: "Operador", active: false },
];

const initialRequisicoes = [
  { id: "REQ-0001", date: "2026-08-15", requestedBy: "Usuário Teste 2", items: [{ productId: "EST-0002", name: "Caneta esferográfica azul", qty: 12, unit: "un" }], description: "Saída para setor de vendas" },
  { id: "REQ-0002", date: "2026-08-14", requestedBy: "Usuário Teste 2", items: [{ productId: "EST-0004", name: "Copo descartável 200ml (pacote c/100)", qty: 40, unit: "pct" }], description: "" },
  { id: "REQ-0003", date: "2026-08-10", requestedBy: "Usuário Teste 1", items: [{ productId: "EST-0001", name: "Papel A4 75g (pacote 500fl)", qty: 5, unit: "pct" }], description: "Reposição sala de reuniões" },
  { id: "REQ-0004", date: "2026-07-22", requestedBy: "Usuário Teste 2", items: [{ productId: "EST-0003", name: "Detergente neutro 500ml", qty: 6, unit: "un" }], description: "Limpeza semanal" },
  { id: "REQ-0005", date: "2026-06-30", requestedBy: "Usuário Teste 1", items: [{ productId: "EST-0005", name: "Álcool em gel 500ml", qty: 10, unit: "un" }], description: "" },
];

const reportTypes = [
  { key: "movimentacao", label: "Movimentação de estoque", desc: "Entradas x saídas por período" },
  { key: "posicao", label: "Posição de estoque", desc: "Quantidade de cada produto agora" },
  { key: "estoque-baixo", label: "Estoque baixo", desc: "Produtos abaixo do limite configurado" },
  { key: "mais-movimentados", label: "Produtos mais movimentados", desc: "Ranking por quantidade de saída" },
  { key: "entradas-nf", label: "Entradas por nota fiscal", desc: "Histórico de entradas vinculadas a cada NF" },
  { key: "cobertura", label: "Cobertura de estoque", desc: "Para quantos dias o estoque atual é suficiente, com base nas saídas recentes" },
  { key: "sem-giro", label: "Produtos sem giro", desc: "Itens sem nenhuma movimentação há X dias" },
];

const orderOptions = [
  { key: "az", label: "Nome (A-Z)" },
  { key: "za", label: "Nome (Z-A)" },
  { key: "qty-desc", label: "Quantidade (maior primeiro)" },
  { key: "qty-asc", label: "Quantidade (menor primeiro)" },
  { key: "recent", label: "Mais recentes primeiro" },
];

const initialReports = [
  { id: "REL-0001", name: "Movimentação — julho/2026", type: "movimentacao", generatedBy: "Usuário Teste 1", generatedByEmail: "usuarioteste1@empresa.com", date: "2026-08-01" },
  { id: "REL-0002", name: "Estoque baixo — semanal", type: "estoque-baixo", generatedBy: "Usuário Teste 2", generatedByEmail: "usuarioteste2@empresa.com", date: "2026-08-10" },
  { id: "REL-0003", name: "Cobertura de estoque — agosto/2026", type: "cobertura", generatedBy: "Usuário Teste 1", generatedByEmail: "usuarioteste1@empresa.com", date: "2026-08-16" },
];

const initialNotasFiscais = [
  { id: "NF-0001", name: "Papelaria Nova Ltda — CNPJ 12.345.678/0001-90", date: "2026-08-15", uploadedBy: "Usuário Teste 2", items: [{ name: "Papel A4 75g (pacote 500fl)", quantity: 20, unit: "pct", unitPrice: 24.9 }] },
  { id: "NF-0002", name: "Distribuidora Limpa Bem — CNPJ 98.765.432/0001-11", date: "2026-08-09", uploadedBy: "Usuário Teste 1", items: [{ name: "Detergente neutro 500ml", quantity: 30, unit: "un", unitPrice: 2.3 }, { name: "Álcool em gel 500ml", quantity: 15, unit: "un", unitPrice: 9.5 }] },
  { id: "NF-0003", name: "Tech Supply Comércio — CNPJ 45.678.912/0001-22", date: "2026-07-28", uploadedBy: "Usuário Teste 2", items: [{ name: "Mouse óptico USB preto", quantity: 10, unit: "un", unitPrice: 19.9 }] },
];

const initialAuditLog = [
  { id: "LOG-0001", date: "2026-08-16 09:12", user: "Usuário Teste 1", action: "Desativou usuário", setor: "Usuários", details: "Usuário Teste 4", before: "Status: Ativo", after: "Status: Inativo" },
  { id: "LOG-0002", date: "2026-08-15 14:40", user: "Usuário Teste 2", action: "Registrou saída de estoque", setor: "Estoque", details: "REQ-0001 — Caneta esferográfica azul (12 un)", before: "Quantidade: 20 un", after: "Quantidade: 8 un" },
  { id: "LOG-0003", date: "2026-08-15 11:05", user: "Usuário Teste 2", action: "Deu entrada por NF", setor: "Notas fiscais", details: "NF-0001 — Papelaria Nova Ltda", before: "—", after: "20 pct de Papel A4 75g adicionados" },
  { id: "LOG-0004", date: "2026-08-10 16:20", user: "Usuário Teste 1", action: "Editou produto", setor: "Produtos", details: "EST-0003 — Detergente neutro 500ml", before: "Limite de estoque baixo: 3", after: "Limite de estoque baixo: 5" },
  { id: "LOG-0005", date: "2026-08-01 08:47", user: "Usuário Teste 1", action: "Gerou relatório", setor: "Relatórios", details: "Movimentação — julho/2026", before: "—", after: "—" },
];

const mockNFItems = [
  { id: 1, rawName: "PAPEL SULFITE A4 75G 500FL", quantity: 20, unit: "pct", unitPrice: 24.9, matchId: "EST-0001", matchName: "Papel A4 75g (pacote 500fl)" },
  { id: 2, rawName: "DETERGENTE INCOLOR 500ML", quantity: 30, unit: "un", unitPrice: 2.3, matchId: "EST-0003", matchName: "Detergente neutro 500ml" },
  { id: 3, rawName: "GARRAFA TERMICA INOX 1L", quantity: 6, unit: "un", unitPrice: 58.0, matchId: null, matchName: null },
  { id: 4, rawName: "MOUSE OPTICO USB PRETO", quantity: 10, unit: "un", unitPrice: 19.9, matchId: null, matchName: null },
];

const activityLog = [
  { type: "entrada", text: "Papel A4 75g — entrada de 20 pct", time: "há 1h" },
  { type: "saida", text: "Caneta esferográfica azul — saída de 12 un", time: "há 3h" },
  { type: "entrada", text: "Detergente neutro 500ml — entrada de 30 un", time: "há 5h" },
  { type: "saida", text: "Copo descartável 200ml — saída de 40 pct", time: "ontem" },
];

const weekMovement = [
  { day: "Seg", entradas: 32, saidas: 18 },
  { day: "Ter", entradas: 14, saidas: 22 },
  { day: "Qua", entradas: 40, saidas: 10 },
  { day: "Qui", entradas: 8, saidas: 26 },
  { day: "Sex", entradas: 22, saidas: 15 },
  { day: "Sáb", entradas: 5, saidas: 6 },
];

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Operador", "Visualizador"] },
  { key: "nf-upload", label: "Nova entrada (NF)", icon: Upload, roles: ["Admin", "Operador"] },
  { key: "saida", label: "Saída de estoque", icon: ExternalLink, roles: ["Admin", "Operador"] },
  { key: "produtos", label: "Produtos", icon: Package, roles: ["Admin", "Operador", "Visualizador"] },
  { key: "notas-fiscais", label: "Notas fiscais", icon: FileStack, roles: ["Admin", "Operador", "Visualizador"] },
  { key: "requisicoes", label: "Saídas", icon: ClipboardCheck, roles: ["Admin", "Operador", "Visualizador"] },
  { key: "relatorios", label: "Relatórios", icon: FileBarChart, roles: ["Admin", "Operador", "Visualizador"] },
  { key: "auditoria", label: "Auditoria", icon: History, roles: ["Admin"] },
  { key: "usuarios", label: "Usuários", icon: Users, roles: ["Admin"] },
];

function genId(products) {
  const n = products.length + 1;
  return "EST-" + String(n).padStart(4, "0");
}

/* ===========================================================
   LOGIN
=========================================================== */
function LoginScreen({ onLogin, users }) {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const attemptLogin = () => {
    const normalized = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normalized);
    if (!user) {
      setError("E-mail não encontrado. Confira se digitou corretamente.");
      return;
    }
    if (!user.active) {
      setError("Este usuário está desativado. Fale com um administrador.");
      return;
    }
    setError("");
    onLogin(user);
  };

  const sendReset = () => {
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
  };

  return (
    <div className="stk-root min-h-full w-full flex items-center justify-center p-6" style={{ background: "var(--navy-900)", minHeight: "100vh" }}>
      <GlobalStyle />
      <div className="w-full max-w-4xl grid md:grid-cols-2 stk-card overflow-hidden" style={{ minHeight: 480 }}>
        <div className="p-10 flex flex-col text-white" style={{ background: "linear-gradient(160deg, var(--navy-900), var(--navy-700))" }}>
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--teal-500)" }}>
                <Package size={18} />
              </div>
              <span className="font-display font-semibold text-lg tracking-tight">EstoqAI</span>
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight mb-3">
              Gestão de estoque pensada para pequenas e médias empresas
            </h1>
          </div>
          <div className="opacity-80 mt-auto pt-10">
            <Barcode code="ESTOQAI2026" height={28} />
          </div>
        </div>

        <div className="p-10 flex flex-col justify-center bg-white">
          {!forgotOpen ? (
            <>
              <h2 className="font-display text-xl font-semibold mb-6">Entrar</h2>
              <div className="flex flex-col gap-3 mb-1">
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>E-mail</label>
                <input
                  type="email"
                  className="stk-input stk-focus"
                  placeholder="seuemail@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") attemptLogin(); }}
                />
                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Senha</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="stk-input stk-focus"
                    defaultValue="12345678"
                    onKeyDown={e => { if (e.key === "Enter") attemptLogin(); }}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-500)" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="button" onClick={() => { setForgotOpen(true); setForgotSent(false); setForgotEmail(email); }} className="stk-focus text-xs font-medium text-left" style={{ color: "var(--teal-600)" }}>
                  Esqueci minha senha
                </button>
                {error && <p className="text-xs" style={{ color: "var(--red-500)" }}>{error}</p>}
                <button type="button" onClick={attemptLogin} className="stk-btn-primary stk-focus rounded-lg py-2.5 text-sm mt-2">Entrar</button>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setForgotOpen(false)} className="stk-focus flex items-center gap-1.5 text-sm mb-5" style={{ color: "var(--text-500)" }}>
                <ArrowLeft size={15} /> Voltar para o login
              </button>
              {!forgotSent ? (
                <>
                  <h2 className="font-display text-xl font-semibold mb-1">Redefinir senha</h2>
                  <p className="text-sm mb-5" style={{ color: "var(--text-500)" }}>Informe o e-mail cadastrado e enviaremos as instruções de redefinição</p>
                  <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>E-mail</label>
                  <input type="email" className="stk-input stk-focus mt-1 mb-4" placeholder="seuemail@empresa.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                  <button type="button" onClick={sendReset} className="stk-btn-primary stk-focus rounded-lg py-2.5 text-sm">Enviar instruções</button>
                </>
              ) : (
                <>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--teal-100)" }}>
                    <Check size={20} style={{ color: "var(--teal-600)" }} />
                  </div>
                  <h2 className="font-display text-lg font-semibold mb-1">Instruções enviadas</h2>
                  <p className="text-sm" style={{ color: "var(--text-500)" }}>Se {forgotEmail} estiver cadastrado, você vai receber um e-mail com o passo a passo para criar uma nova senha</p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   LAYOUT (sidebar + topbar)
=========================================================== */
function Layout({ currentUser, screen, setScreen, onLogout, children }) {
  const role = currentUser.role;
  const firstName = currentUser.name.split(" ")[0];
  return (
    <div className="stk-root flex" style={{ minHeight: "100vh" }}>
      <GlobalStyle />
      <aside className="flex flex-col justify-between text-white p-4" style={{ width: 232, background: "var(--navy-900)" }}>
        <div>
          <div className="flex items-center justify-between px-2 mb-6 mt-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--teal-500)" }}>
                <Package size={16} />
              </div>
              <span className="font-display font-semibold tracking-tight">EstoqAI</span>
            </div>
            <button onClick={onLogout} className="stk-focus flex items-center gap-1 text-xs font-medium" style={{ color: "var(--text-300)" }}>
              <LogOut size={13} /> Sair
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.filter(i => i.roles.includes(role)).map(item => (
              <button
                key={item.key}
                onClick={() => setScreen(item.key)}
                className={`stk-nav-item stk-focus flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${screen === item.key ? "active" : ""}`}
                style={{ color: screen === item.key ? "white" : "var(--text-300)" }}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="px-3 py-3 rounded-lg" style={{ background: "var(--navy-700)" }}>
          <p className="text-sm font-semibold">{currentUser.name}</p>
          <p className="text-xs font-mono truncate" style={{ color: "var(--text-300)" }}>{currentUser.email}</p>
          <p className="text-xs mt-1" style={{ color: "var(--teal-500)" }}>{role}</p>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto stk-fadein" style={{ maxHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-500)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ===========================================================
   1. DASHBOARD
=========================================================== */
function Dashboard({ products, setScreen, role }) {
  const active = products.filter(p => p.active);
  const lowStock = active.filter(p => p.quantity <= p.lowStockLimit);
  const newOnes = products.filter(p => p.isNew);
  const maxMove = Math.max(...weekMovement.map(d => Math.max(d.entradas, d.saidas)));
  const canClick = role !== "Visualizador";
  const Card = canClick ? "button" : "div";

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do estoque em tempo real" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stk-card p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Produtos ativos</p>
          <p className="font-display text-3xl font-semibold">{active.length}</p>
        </div>
        <div className="stk-card p-5" style={{ borderColor: lowStock.length ? "var(--amber-500)" : "var(--border)" }}>
          <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--text-500)" }}><AlertTriangle size={12} /> Estoque baixo</p>
          <p className="font-display text-3xl font-semibold" style={{ color: lowStock.length ? "var(--amber-500)" : "var(--text-900)" }}>{lowStock.length}</p>
        </div>
        <div className="stk-card p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Novos esta semana</p>
          <p className="font-display text-3xl font-semibold">{newOnes.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card onClick={canClick ? () => setScreen("nf-upload") : undefined} className={`stk-btn-primary rounded-xl p-5 text-left flex items-center justify-between ${canClick ? "stk-focus" : ""}`} style={!canClick ? { cursor: "default" } : undefined}>
          <div>
            <p className="font-display font-semibold">Nova entrada (ler NF)</p>
            <p className="text-xs opacity-90 mt-0.5">Câmera ou upload de foto</p>
          </div>
          <Upload size={22} />
        </Card>
        <Card onClick={canClick ? () => setScreen("saida") : undefined} className={`rounded-xl p-5 text-left flex items-center justify-between stk-card ${canClick ? "stk-focus" : ""}`} style={!canClick ? { cursor: "default" } : undefined}>
          <div>
            <p className="font-display font-semibold">Registrar saída</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-500)" }}>Ler etiqueta / código de barras</p>
          </div>
          <Scan size={22} style={{ color: "var(--teal-500)" }} />
        </Card>
        <Card onClick={canClick ? () => setScreen("produtos") : undefined} className={`rounded-xl p-5 text-left flex items-center justify-between stk-card ${canClick ? "stk-focus" : ""}`} style={!canClick ? { cursor: "default" } : undefined}>
          <div>
            <p className="font-display font-semibold">Ver produtos</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-500)" }}>Consultar e editar itens</p>
          </div>
          <Package size={22} style={{ color: "var(--teal-500)" }} />
        </Card>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="stk-card p-5 col-span-3">
          <p className="font-display font-semibold mb-4">Movimentação da semana</p>
          <div className="flex items-end gap-4" style={{ height: 140 }}>
            {weekMovement.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end gap-1" style={{ height: 110 }}>
                  <div className="flex-1 rounded-t" style={{ height: `${(d.entradas / maxMove) * 100}%`, background: "var(--teal-500)" }} title={`Entradas: ${d.entradas}`} />
                  <div className="flex-1 rounded-t" style={{ height: `${(d.saidas / maxMove) * 100}%`, background: "var(--amber-500)" }} title={`Saídas: ${d.saidas}`} />
                </div>
                <span className="text-xs" style={{ color: "var(--text-500)" }}>{d.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: "var(--text-500)" }}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "var(--teal-500)" }} /> Entradas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "var(--amber-500)" }} /> Saídas</span>
          </div>
        </div>

        <div className="stk-card p-5 col-span-2">
          <p className="font-display font-semibold mb-4">Atividade recente</p>
          <div className="flex flex-col gap-3">
            {activityLog.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {a.type === "entrada" ? <TrendingUp size={15} style={{ color: "var(--green-600)", marginTop: 2 }} /> : <TrendingDown size={15} style={{ color: "var(--amber-500)", marginTop: 2 }} />}
                <div>
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs" style={{ color: "var(--text-300)" }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="stk-card p-5 mt-6" style={{ borderColor: "var(--amber-500)", background: "var(--amber-100)" }}>
          <p className="font-display font-semibold mb-3 flex items-center gap-2" style={{ color: "#8A5A0C" }}><AlertTriangle size={16} /> Alertas de estoque baixo</p>
          <div className="flex flex-col gap-2">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <span className="font-mono" style={{ color: "#8A5A0C" }}>{p.quantity} {p.unit} (limite: {p.lowStockLimit})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   3. UPLOAD / CAPTURA DE NF
=========================================================== */
function NFUpload({ onScanned }) {
  const [mode, setMode] = useState(null); // 'camera' | 'upload'
  const [scanning, setScanning] = useState(false);

  const startScan = (m) => {
    setMode(m);
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onScanned();
    }, 2200);
  };

  return (
    <div>
      <PageHeader title="Nova entrada (NF)" subtitle="Entrada de produtos por leitura de NF" />
      <div className="grid grid-cols-2 gap-5 max-w-3xl">
        <button onClick={() => startScan("camera")} className="stk-card stk-focus p-8 flex flex-col items-center gap-3 hover:shadow-sm" disabled={scanning}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--teal-100)" }}>
            <Camera size={24} style={{ color: "var(--teal-600)" }} />
          </div>
          <p className="font-display font-semibold">Usar câmera do celular</p>
          <p className="text-xs text-center" style={{ color: "var(--text-500)" }}>Aponte para a NF impressa e capture a imagem.</p>
        </button>
        <button onClick={() => startScan("upload")} className="stk-card stk-focus p-8 flex flex-col items-center gap-3 hover:shadow-sm" disabled={scanning}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--teal-100)" }}>
            <ImagePlus size={24} style={{ color: "var(--teal-600)" }} />
          </div>
          <p className="font-display font-semibold">Subir uma foto</p>
          <p className="text-xs text-center" style={{ color: "var(--text-500)" }}>Selecione uma imagem da NF já tirada anteriormente.</p>
        </button>
      </div>

      {mode && (
        <div className="stk-card mt-6 max-w-3xl p-6">
          <div className="relative rounded-lg overflow-hidden flex items-center justify-center" style={{ height: 260, background: "var(--navy-900)" }}>
            <FileText size={64} style={{ color: "var(--navy-700)" }} />
            {scanning && <div className="stk-scanline" />}
          </div>
          <div className="flex items-center gap-2 mt-4">
            {scanning ? (
              <>
                <Sparkles size={16} style={{ color: "var(--teal-500)" }} className="animate-pulse" />
                <p className="text-sm font-medium">Agente de IA lendo a nota fiscal…</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-500)" }}>Leitura concluída.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   4. CONFERÊNCIA (pop-up com dados lidos da NF)
=========================================================== */
function NFReview({ items, setItems, nfName, setNfName, onConfirm, onCancel }) {
  const update = (id, field, value) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(18,32,61,0.55)" }}>
      <div className="stk-card w-full max-w-3xl p-6 stk-fadein" style={{ maxHeight: "88vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="font-display text-lg font-semibold flex items-center gap-2"><Sparkles size={17} style={{ color: "var(--teal-500)" }} /> Conferência da leitura</p>
            <p className="text-sm" style={{ color: "var(--text-500)" }}>Revise os itens lidos pela IA. Corrija o que estiver errado antes de confirmar a entrada.</p>
          </div>
          <button onClick={onCancel} className="stk-focus"><X size={18} /></button>
        </div>

        <div className="mt-5">
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Nome para salvar esta nota fiscal</label>
          <input className="stk-input stk-focus mt-1" value={nfName} onChange={e => setNfName(e.target.value)} />
          <p className="text-xs mt-1" style={{ color: "var(--text-300)" }}>Sugestão baseada no fornecedor e CNPJ identificados na NF — pode editar se necessário</p>
        </div>

        <div className="flex flex-col gap-3 mt-5">
          {items.map(it => (
            <div key={it.id} className="p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Item lido na NF</label>
                  <input className="stk-input stk-focus mt-1" value={it.rawName} onChange={e => update(it.id, "rawName", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Qtd.</label>
                  <input type="number" className="stk-input stk-focus mt-1 font-mono" value={it.quantity} onChange={e => update(it.id, "quantity", Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Unid.</label>
                  <input className="stk-input stk-focus mt-1" value={it.unit} onChange={e => update(it.id, "unit", e.target.value)} />
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Vínculo no estoque</label>
                  {it.matchId ? (
                    <div className="mt-1 text-xs font-medium px-2.5 py-2 rounded-md flex items-center gap-1.5" style={{ background: "var(--green-100)", color: "var(--green-600)" }}>
                      <Check size={13} /> {it.matchName}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs font-medium px-2.5 py-2 rounded-md flex items-center gap-1.5" style={{ background: "var(--amber-100)", color: "#8A5A0C" }}>
                      <Plus size={13} /> Produto novo
                    </div>
                  )}
                </div>
              </div>
              {it.matchId && (
                <p className="text-xs mt-2" style={{ color: "var(--text-300)" }}>Identificado automaticamente por palavra-chave cadastrada — nenhum produto duplicado será criado.</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="stk-focus px-4 py-2.5 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
          <button onClick={onConfirm} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">
            <Check size={15} /> Confirmar e dar entrada
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   5. CADASTRO DE PRODUTO (após NF) — só campos que faltam
=========================================================== */
function ProductForm({ nfItem, index, total, onSave, onSkipToLabel }) {
  const [form, setForm] = useState({
    category: "", description: "", keywords: "", lowStockLimit: 10,
  });
  const set = (f, v) => setForm({ ...form, [f]: v });

  return (
    <div>
      <PageHeader
        title="Completar cadastro do produto"
        subtitle={`Produto novo identificado na NF (${index + 1} de ${total}) — os dados já lidos não precisam ser repetidos`}
      />
      <div className="stk-card p-6 max-w-2xl">
        <div className="p-3 rounded-lg mb-5 flex items-center justify-between text-sm" style={{ background: "var(--bg)" }}>
          <div>
            <p className="font-semibold">{nfItem.rawName}</p>
            <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-500)" }}>{nfItem.quantity} {nfItem.unit} · já obtido pela leitura da NF</p>
          </div>
          <Sparkles size={16} style={{ color: "var(--teal-500)" }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Categoria</label>
            <input className="stk-input stk-focus mt-1" placeholder="Ex: Eletrônicos" value={form.category} onChange={e => set("category", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Limite de estoque baixo</label>
            <input type="number" className="stk-input stk-focus mt-1 font-mono" value={form.lowStockLimit} onChange={e => set("lowStockLimit", Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Descrição</label>
            <textarea className="stk-input stk-focus mt-1" rows={2} placeholder="Detalhes do produto" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Palavras-chave (variações de nome)</label>
            <input className="stk-input stk-focus mt-1" placeholder="separadas por vírgula — ex: garrafa inox, squeeze termico" value={form.keywords} onChange={e => set("keywords", e.target.value)} />
            <p className="text-xs mt-1" style={{ color: "var(--text-300)" }}>Sempre que uma NF trouxer um desses termos, o sistema reconhece como este mesmo produto. Você pode adicionar mais depois, na edição do produto.</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={() => onSave(form)} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">
            Salvar produto e gerar etiqueta <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   6. CONFIRMAÇÃO / ETIQUETA
=========================================================== */
function LabelConfirm({ product, hasNext, onNext, onFinish }) {
  const [printed, setPrinted] = useState(false);
  return (
    <div>
      <PageHeader title="Produto cadastrado" subtitle="Etiqueta gerada automaticamente com ID único e código de barras" />
      <div className="stk-card p-6 max-w-md">
        <div className="border-2 border-dashed rounded-xl p-5 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="font-display font-semibold text-sm mb-1">{product.name}</p>
          <p className="font-mono text-xs mb-3" style={{ color: "var(--text-500)" }}>{product.id}</p>
          <div className="flex justify-center mb-2">
            <Barcode code={product.id} />
          </div>
          <p className="font-mono text-xs" style={{ color: "var(--text-300)" }}>Cole na prateleira de armazenamento</p>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm" style={{ color: "var(--green-600)" }}>
          <Check size={16} /> Produto adicionado ao estoque com sucesso
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => setPrinted(true)} className="stk-focus flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border flex items-center justify-center gap-2" style={{ borderColor: "var(--border)" }}>
            <Printer size={15} /> {printed ? "Enviado para impressão" : "Imprimir agora"}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-300)" }}>Não precisa imprimir agora — a etiqueta fica disponível a qualquer momento na página do produto.</p>

        <div className="flex justify-end mt-5">
          {hasNext ? (
            <button onClick={onNext} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">Próximo produto <ArrowRight size={15} /></button>
          ) : (
            <button onClick={onFinish} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">Concluir e ver produtos <ArrowRight size={15} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   7 & 7b. LISTA DE PRODUTOS + DETALHE/EDIÇÃO
=========================================================== */
function ProductList({ products, setProducts, role }) {
  const [tab, setTab] = useState("ativos");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const filtered = products.filter(p => {
    if (tab === "ativos" && !p.active) return false;
    if (tab === "inativos" && p.active) return false;
    return p.name.toLowerCase().includes(query.toLowerCase());
  });

  if (editing) {
    return (
      <ProductDetail
        product={editing}
        readOnly={role === "Visualizador"}
        onBack={() => setEditing(null)}
        onSave={(updated) => {
          setProducts(products.map(p => p.id === updated.id ? updated : p));
          setEditing(null);
        }}
        onToggleActive={() => {
          const updated = { ...editing, active: !editing.active };
          setProducts(products.map(p => p.id === updated.id ? updated : p));
          setEditing(updated);
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Produtos" subtitle="Itens cadastrados no estoque" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--border)" }}>
          {[["ativos", "Ativos"], ["inativos", "Inativos"], ["todos", "Todos"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className="stk-focus px-3.5 py-1.5 rounded-md text-sm font-medium" style={{ background: tab === k ? "white" : "transparent", color: tab === k ? "var(--text-900)" : "var(--text-500)" }}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex items-center" style={{ width: 240 }}>
          <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
          <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder="Buscar produto…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="stk-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Nome</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Quantidade</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Unidade de medida</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Status</th>
              <th className="text-right font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Editar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {p.name}
                    {p.isNew && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>Novo</span>}
                    {p.quantity <= p.lowStockLimit && p.active && <AlertTriangle size={13} style={{ color: "var(--amber-500)" }} />}
                  </div>
                </td>
                <td className="px-5 py-3 font-mono">{p.quantity}</td>
                <td className="px-5 py-3 font-mono">{p.unit}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: p.active ? "var(--green-100)" : "var(--red-100)", color: p.active ? "var(--green-600)" : "var(--red-500)" }}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {p.active ? (
                    <button onClick={() => setEditing(p)} className="stk-focus" style={{ color: "var(--teal-600)" }}><Edit2 size={15} /></button>
                  ) : role !== "Visualizador" ? (
                    <button onClick={() => setProducts(products.map(x => x.id === p.id ? { ...x, active: true } : x))} className="stk-focus text-xs font-semibold" style={{ color: "var(--green-600)" }}>Reativar</button>
                  ) : (
                    <button onClick={() => setEditing(p)} className="stk-focus" style={{ color: "var(--teal-600)" }}><Edit2 size={15} /></button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--text-300)" }}>Nenhum produto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductDetail({ product, onBack, onSave, onToggleActive, readOnly }) {
  const [form, setForm] = useState({ ...product, keywords: product.keywords.join(", ") });
  const set = (f, v) => setForm({ ...form, [f]: v });
  const fieldsDisabled = readOnly || !product.active;

  return (
    <div>
      <button onClick={onBack} className="stk-focus flex items-center gap-1.5 text-sm mb-4" style={{ color: "var(--text-500)" }}>
        <ArrowLeft size={15} /> Voltar para produtos
      </button>
      <PageHeader
        title={product.name}
        subtitle={`ID do produto: ${product.id}`}
        action={
          !readOnly && (
            <button onClick={onToggleActive} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: product.active ? "var(--red-500)" : "var(--green-600)", color: product.active ? "var(--red-500)" : "var(--green-600)" }}>
              {product.active ? "Desativar" : "Reativar"}
            </button>
          )
        }
      />

      {!product.active && !readOnly && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "var(--amber-100)", color: "#8A5A0C" }}>
          Este produto está inativo. Reative para poder editar os campos.
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="stk-card p-6 col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Nome</label><input disabled={fieldsDisabled} className="stk-input stk-focus mt-1" value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div><label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Categoria</label><input disabled={fieldsDisabled} className="stk-input stk-focus mt-1" value={form.category} onChange={e => set("category", e.target.value)} /></div>
            <div><label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Quantidade</label><input disabled={fieldsDisabled} type="number" className="stk-input stk-focus mt-1 font-mono" value={form.quantity} onChange={e => set("quantity", Number(e.target.value))} /></div>
            <div><label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Unidade de medida</label><input disabled={fieldsDisabled} className="stk-input stk-focus mt-1" value={form.unit} onChange={e => set("unit", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Descrição</label><textarea disabled={fieldsDisabled} rows={2} className="stk-input stk-focus mt-1" value={form.description} onChange={e => set("description", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Palavras-chave</label><input disabled={fieldsDisabled} className="stk-input stk-focus mt-1" value={form.keywords} onChange={e => set("keywords", e.target.value)} /></div>
            <div><label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Limite de estoque baixo</label><input disabled={fieldsDisabled} type="number" className="stk-input stk-focus mt-1 font-mono" value={form.lowStockLimit} onChange={e => set("lowStockLimit", Number(e.target.value))} /></div>
          </div>
          {!fieldsDisabled && (
            <div className="flex justify-end mt-6">
              <button onClick={() => onSave({ ...form, keywords: form.keywords.split(",").map(k => k.trim()).filter(Boolean) })} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm">Salvar alterações</button>
            </div>
          )}
        </div>

        <div className="stk-card p-6">
          <p className="font-display font-semibold text-sm mb-4">Etiqueta do produto</p>
          <div className="border-2 border-dashed rounded-xl p-4 text-center" style={{ borderColor: "var(--border)" }}>
            <p className="font-mono text-xs mb-3" style={{ color: "var(--text-500)" }}>{product.id}</p>
            <div className="flex justify-center mb-2"><Barcode code={product.id} /></div>
          </div>
          <button className="stk-focus w-full mt-4 px-4 py-2.5 rounded-lg text-sm font-semibold border flex items-center justify-center gap-2" style={{ borderColor: "var(--border)" }}>
            <Printer size={14} /> Reimprimir etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   8. SAÍDA DE ESTOQUE
=========================================================== */
function StockOut({ products, setProducts, currentUser, addRequisicao }) {
  const [cart, setCart] = useState([]);
  const [description, setDescription] = useState("");
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const availableToScan = products.filter(p => p.active && !cart.find(c => c.id === p.id));

  const simulateScan = () => {
    if (availableToScan.length === 0) return;
    setScanning(true);
    setTimeout(() => {
      const next = availableToScan[0];
      setCart([...cart, { ...next, exitQty: 1 }]);
      setScanning(false);
    }, 900);
  };

  const updateQty = (id, qty) => setCart(cart.map(c => c.id === id ? { ...c, exitQty: qty } : c));
  const removeItem = (id) => setCart(cart.filter(c => c.id !== id));

  const confirmExit = () => {
    setProducts(products.map(p => {
      const item = cart.find(c => c.id === p.id);
      return item ? { ...p, quantity: Math.max(0, p.quantity - item.exitQty) } : p;
    }));
    addRequisicao({
      date: new Date().toISOString().slice(0, 10),
      requestedBy: currentUser.name,
      items: cart.map(c => ({ productId: c.id, name: c.name, qty: c.exitQty, unit: c.unit })),
      description,
    });
    setDone(true);
  };

  if (done) {
    return (
      <div>
        <PageHeader title="Saída registrada" />
        <div className="stk-card p-6 max-w-md flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--green-100)" }}>
            <Check size={22} style={{ color: "var(--green-600)" }} />
          </div>
          <p className="font-display font-semibold">Saída concluída</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-500)" }}>{cart.length} produto(s) atualizados no estoque.</p>
          <button onClick={() => { setCart([]); setDescription(""); setDone(false); }} className="stk-btn-primary stk-focus mt-5 px-5 py-2.5 rounded-lg text-sm">Nova saída</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Saída de estoque" subtitle="Leia a etiqueta de cada item retirado da prateleira" />
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 stk-card p-6">
          <button onClick={simulateScan} disabled={scanning || availableToScan.length === 0} className="stk-btn-primary stk-focus w-full py-4 rounded-lg flex items-center justify-center gap-2 mb-5">
            <Scan size={18} /> {scanning ? "Lendo código de barras…" : "Ler etiqueta (código de barras)"}
          </button>

          {cart.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-300)" }}>Nenhum item lido ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="font-mono text-xs" style={{ color: "var(--text-300)" }}>{item.id} · disponível: {item.quantity} {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" min={1} max={item.quantity} className="stk-input stk-focus font-mono" style={{ width: 72 }} value={item.exitQty} onChange={e => updateQty(item.id, Number(e.target.value))} />
                    <button onClick={() => removeItem(item.id)} className="stk-focus" style={{ color: "var(--red-500)" }}><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stk-card p-6 h-fit">
          <p className="font-display font-semibold text-sm mb-3">Detalhes da saída</p>
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Descrição / motivo (opcional)</label>
          <textarea className="stk-input stk-focus mt-1" rows={3} placeholder="Ex: saída para setor de vendas" value={description} onChange={e => setDescription(e.target.value)} />
          <button onClick={confirmExit} disabled={cart.length === 0} className="stk-btn-primary stk-focus w-full mt-4 py-2.5 rounded-lg text-sm">Confirmar saída</button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   REQUISIÇÕES (histórico de saídas)
=========================================================== */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function Requisicoes({ requisicoes, setRequisicoes, products, role }) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [addProductId, setAddProductId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = requisicoes
    .filter(r => r.date >= from && r.date <= to)
    .filter(r => {
      const q = query.toLowerCase();
      if (!q) return true;
      return r.id.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const openEdit = (r) => {
    setEditForm({ ...r, description: r.description || "", items: r.items.map(it => ({ ...it })) });
    setAddProductId("");
    setViewing(r);
  };

  const updateEditQty = (idx, qty) => {
    setEditForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, qty } : it) }));
  };

  const removeEditItem = (idx) => {
    setEditForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const addEditItem = () => {
    if (!addProductId) return;
    const product = products.find(p => p.id === addProductId);
    if (!product || editForm.items.some(it => it.productId === product.id)) return;
    setEditForm(f => ({ ...f, items: [...f.items, { productId: product.id, name: product.name, qty: 1, unit: product.unit }] }));
    setAddProductId("");
  };

  const availableToAdd = editForm ? products.filter(p => p.active && !editForm.items.some(it => it.productId === p.id)) : [];

  const saveEdit = () => {
    setRequisicoes(requisicoes.map(r => r.id === editForm.id ? editForm : r));
    setViewing(null);
    setEditForm(null);
  };

  const deleteRequisicao = (id) => {
    setRequisicoes(requisicoes.filter(r => r.id !== id));
    setConfirmDelete(null);
    setViewing(null);
  };

  return (
    <div>
      <PageHeader title="Saídas" subtitle="Histórico de saídas registradas no estoque" />

      <div className="stk-card p-4 mb-5 flex items-end gap-4 flex-wrap">
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>De</label>
          <input type="date" className="stk-input stk-focus mt-1" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Até</label>
          <input type="date" className="stk-input stk-focus mt-1" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="relative flex items-center" style={{ width: 240 }}>
          <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
          <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder="Buscar por ID, solicitante…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <p className="text-xs ml-auto" style={{ color: "var(--text-300)" }}>{filtered.length} saída(s) no período</p>
      </div>

      <div className="stk-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>ID</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Data</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Solicitante</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Itens</th>
              <th className="text-right font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-5 py-3 font-mono text-xs">{r.id}</td>
                <td className="px-5 py-3">{r.date.split("-").reverse().join("/")}</td>
                <td className="px-5 py-3">{r.requestedBy}</td>
                <td className="px-5 py-3" style={{ color: "var(--text-500)" }}>{r.items.length} produto(s)</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => { setViewing(r); setEditForm(null); }} className="stk-focus text-xs font-semibold" style={{ color: "var(--teal-600)" }}>Ver</button>
                    <button className="stk-focus" style={{ color: "var(--text-500)" }}><Printer size={14} /></button>
                    {role === "Admin" && <button onClick={() => openEdit(r)} className="stk-focus" style={{ color: "var(--teal-600)" }}><Edit2 size={14} /></button>}
                    {role === "Admin" && <button onClick={() => setConfirmDelete(r)} className="stk-focus" style={{ color: "var(--red-500)" }}><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--text-300)" }}>Nenhuma saída encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(18,32,61,0.55)" }}>
          <div className="stk-card w-full max-w-lg p-6 stk-fadein">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-display text-lg font-semibold">{viewing.id}</p>
                <p className="text-xs font-mono" style={{ color: "var(--text-500)" }}>{viewing.date.split("-").reverse().join("/")} · solicitado por {viewing.requestedBy}</p>
              </div>
              <button onClick={() => { setViewing(null); setEditForm(null); }} className="stk-focus"><X size={18} /></button>
            </div>

            {editForm ? (
              <>
                <div className="flex flex-col gap-2 mb-3">
                  {editForm.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                      <span>{it.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min={0} className="stk-input stk-focus font-mono" style={{ width: 72 }} value={it.qty} onChange={e => updateEditQty(i, Number(e.target.value))} />
                        <span className="text-xs" style={{ color: "var(--text-500)" }}>{it.unit}</span>
                        <button onClick={() => removeEditItem(i)} className="stk-focus" style={{ color: "var(--red-500)" }}><X size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {editForm.items.length === 0 && (
                    <p className="text-xs text-center py-3" style={{ color: "var(--text-300)" }}>Nenhum produto nesta saída.</p>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <select className="stk-input stk-focus flex-1" value={addProductId} onChange={e => setAddProductId(e.target.value)}>
                    <option value="">Adicionar produto…</option>
                    {availableToAdd.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={addEditItem} disabled={!addProductId} className="stk-btn-primary stk-focus px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Plus size={14} /> Adicionar</button>
                </div>

                <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Descrição / motivo</label>
                <textarea className="stk-input stk-focus mt-1" rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setEditForm(null)} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
                  <button onClick={saveEdit} className="stk-btn-primary stk-focus px-4 py-2 rounded-lg text-sm">Salvar alterações</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2 mb-4">
                  {viewing.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                      <span>{it.name}</span>
                      <span className="font-mono">{it.qty} {it.unit}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Descrição / motivo</p>
                <p className="text-sm mb-4" style={{ color: viewing.description ? "var(--text-900)" : "var(--text-300)" }}>{viewing.description || "Nenhuma descrição informada"}</p>
                <div className="flex justify-end gap-2">
                  <button className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2" style={{ borderColor: "var(--border)" }}><Printer size={14} /> Imprimir</button>
                  {role === "Admin" && <button onClick={() => openEdit(viewing)} className="stk-btn-primary stk-focus px-4 py-2 rounded-lg text-sm">Alterar saída</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(18,32,61,0.55)" }}>
          <div className="stk-card w-full max-w-sm p-6 stk-fadein">
            <p className="font-display font-semibold mb-1">Excluir {confirmDelete.id}?</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-500)" }}>Essa ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
              <button onClick={() => deleteRequisicao(confirmDelete.id)} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--red-500)" }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   9. CADASTRO DE USUÁRIOS (admin)
=========================================================== */
const emptyUserForm = { name: "", birthdate: "", role: "Operador", email: "", password: "" };

function UserManagement({ users, setUsers }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyUserForm);
  const [tab, setTab] = useState("ativos");
  const [query, setQuery] = useState("");

  const filtered = users.filter(u => {
    if (tab === "ativos" && !u.active) return false;
    if (tab === "inativos" && u.active) return false;
    return u.name.toLowerCase().includes(query.toLowerCase());
  });

  const startCreate = () => {
    setForm(emptyUserForm);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (u) => {
    setForm({ name: u.name, birthdate: u.birthdate || "", role: u.role, email: u.email, password: "" });
    setEditingId(u.id);
    setShowForm(true);
  };

  const saveUser = () => {
    if (!form.name || !form.email) return;
    if (editingId) {
      setUsers(users.map(u => u.id === editingId ? { ...u, ...form } : u));
    } else {
      const id = "USR-" + String(users.length + 1).padStart(4, "0");
      setUsers([...users, { id, ...form, active: true }]);
    }
    setShowForm(false);
    setForm(emptyUserForm);
    setEditingId(null);
  };

  const toggleActive = (u) => setUsers(users.map(x => x.id === u.id ? { ...x, active: !x.active } : x));

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gerenciamento do cadastro de usuários"
        action={<button onClick={startCreate} className="stk-btn-primary stk-focus px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"><Plus size={15} /> Novo usuário</button>}
      />

      {showForm && (
        <div className="stk-card p-5 mb-5 max-w-2xl">
          <p className="font-display font-semibold text-sm mb-3">{editingId ? "Editar usuário" : "Novo usuário"}</p>
          <div className="grid grid-cols-2 gap-3">
            <input className="stk-input stk-focus" placeholder="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <div className="relative">
              <input type="date" className="stk-input stk-focus" value={form.birthdate} onChange={e => setForm({ ...form, birthdate: e.target.value })} />
            </div>
            <input type="email" className="stk-input stk-focus" placeholder="E-mail" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <select className="stk-input stk-focus" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option>Admin</option>
              <option>Operador</option>
              <option>Visualizador</option>
            </select>
            <input type="password" className="stk-input stk-focus col-span-2" placeholder={editingId ? "Nova senha (opcional)" : "Senha"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
            <button onClick={saveUser} className="stk-btn-primary stk-focus px-4 py-2 rounded-lg text-sm">{editingId ? "Salvar alterações" : "Criar usuário"}</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--border)" }}>
          {[["ativos", "Ativos"], ["inativos", "Inativos"], ["todos", "Todos"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className="stk-focus px-3.5 py-1.5 rounded-md text-sm font-medium" style={{ background: tab === k ? "white" : "transparent", color: tab === k ? "var(--text-900)" : "var(--text-500)" }}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex items-center" style={{ width: 240 }}>
          <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
          <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder="Buscar por nome…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="stk-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Nome</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>E-mail</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Permissão</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Status</th>
              <th className="text-right font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-5 py-3">{u.name}</td>
                <td className="px-5 py-3" style={{ color: "var(--text-500)" }}>{u.email}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>{u.role}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: u.active ? "var(--green-100)" : "var(--red-100)", color: u.active ? "var(--green-600)" : "var(--red-500)" }}>{u.active ? "Ativo" : "Inativo"}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => startEdit(u)} className="stk-focus" style={{ color: "var(--teal-600)" }}><Edit2 size={15} /></button>
                    <button onClick={() => toggleActive(u)} className="stk-focus text-xs font-semibold" style={{ color: u.active ? "var(--red-500)" : "var(--green-600)" }}>
                      {u.active ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--text-300)" }}>Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="font-display font-semibold text-sm mt-6 mb-3">O que cada permissão pode fazer</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="stk-card p-4">
          <p className="font-semibold text-sm mb-1.5">Admin</p>
          <p className="text-xs" style={{ color: "var(--text-500)" }}>Acesso total em todas as abas e funções do sistema</p>
        </div>
        <div className="stk-card p-4">
          <p className="font-semibold text-sm mb-1.5">Operador</p>
          <p className="text-xs" style={{ color: "var(--text-500)" }}>Visualização de todas as abas (exceto usuários) e lança entrada (NF) e saída de estoque</p>
        </div>
        <div className="stk-card p-4">
          <p className="font-semibold text-sm mb-1.5">Visualizador</p>
          <p className="text-xs" style={{ color: "var(--text-500)" }}>Visualização do Dashboard, produtos, saídas e relatórios</p>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   10. RELATÓRIOS
=========================================================== */
function Reports({ reports, setReports, currentUser, role }) {
  const canCreate = role !== "Visualizador";
  const canDelete = role === "Admin";
  const [showForm, setShowForm] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [reportName, setReportName] = useState("");
  const [periodFrom, setPeriodFrom] = useState(daysAgo(30));
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().slice(0, 10));
  const [order, setOrder] = useState("az");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const toggleType = (key) => setSelectedTypes(t => t.includes(key) ? t.filter(k => k !== key) : [...t, key]);

  const generateReport = () => {
    if (!reportName || selectedTypes.length === 0) return;
    const id = "REL-" + String(reports.length + 1).padStart(4, "0");
    setReports([{
      id, name: reportName, type: selectedTypes[0], types: selectedTypes,
      periodFrom, periodTo, order,
      generatedBy: currentUser.name, generatedByEmail: currentUser.email,
      date: new Date().toISOString().slice(0, 10),
    }, ...reports]);
    setReportName("");
    setSelectedTypes([]);
    setShowForm(false);
  };

  const deleteReport = (id) => {
    setReports(reports.filter(r => r.id !== id));
    setConfirmDelete(null);
  };

  const filtered = reports.filter(r => {
    if (!r.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios de movimentação e situação do estoque"
        action={canCreate && <button onClick={() => setShowForm(s => !s)} className="stk-btn-primary stk-focus px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"><Plus size={15} /> Novo relatório</button>}
      />

      {showForm && canCreate && (
        <div className="stk-card p-5 mb-6">
          <p className="font-display font-semibold text-sm mb-3">Gerar novo relatório</p>
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Nome do relatório</label>
          <input className="stk-input stk-focus mt-1 mb-4" placeholder="Ex: Movimentação — agosto/2026" value={reportName} onChange={e => setReportName(e.target.value)} />

          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-500)" }}>Quais informações este relatório deve conter?</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {reportTypes.map(t => (
              <button key={t.key} onClick={() => toggleType(t.key)} className="stk-focus text-left p-3 rounded-lg border flex items-start gap-2.5" style={{ borderColor: selectedTypes.includes(t.key) ? "var(--teal-500)" : "var(--border)", background: selectedTypes.includes(t.key) ? "var(--teal-100)" : "white" }}>
                <div className="w-4 h-4 rounded flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: selectedTypes.includes(t.key) ? "var(--teal-500)" : "white", border: `1px solid ${selectedTypes.includes(t.key) ? "var(--teal-500)" : "var(--border)"}` }}>
                  {selectedTypes.includes(t.key) && <Check size={11} color="white" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-500)" }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Período — de</label>
              <input type="date" className="stk-input stk-focus mt-1" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Período — até</label>
              <input type="date" className="stk-input stk-focus mt-1" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Ordenar por</label>
              <select className="stk-input stk-focus mt-1" value={order} onChange={e => setOrder(e.target.value)}>
                {orderOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
            <button onClick={generateReport} disabled={!reportName || selectedTypes.length === 0} className="stk-btn-primary stk-focus px-4 py-2 rounded-lg text-sm">Gerar relatório</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex items-center" style={{ width: 240 }}>
          <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
          <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder="Buscar por nome…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <input type="date" className="stk-input stk-focus" style={{ width: 160 }} value={from} onChange={e => setFrom(e.target.value)} />
        <span className="text-sm" style={{ color: "var(--text-300)" }}>até</span>
        <input type="date" className="stk-input stk-focus" style={{ width: 160 }} value={to} onChange={e => setTo(e.target.value)} />
      </div>

      <div className="stk-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Nome</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Gerado por</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Data</th>
              <th className="text-right font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-5 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs font-mono" style={{ color: "var(--text-300)" }}>{r.id}</p>
                </td>
                <td className="px-5 py-3">
                  <p>{r.generatedBy}</p>
                  <p className="text-xs" style={{ color: "var(--text-300)" }}>{r.generatedByEmail}</p>
                </td>
                <td className="px-5 py-3">{r.date.split("-").reverse().join("/")}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button className="stk-focus" style={{ color: "var(--text-500)" }}><Download size={14} /></button>
                    {canDelete && <button onClick={() => setConfirmDelete(r)} className="stk-focus" style={{ color: "var(--red-500)" }}><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: "var(--text-300)" }}>Nenhum relatório encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(18,32,61,0.55)" }}>
          <div className="stk-card w-full max-w-sm p-6 stk-fadein">
            <p className="font-display font-semibold mb-1">Excluir "{confirmDelete.name}"?</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-500)" }}>Essa ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
              <button onClick={() => deleteReport(confirmDelete.id)} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--red-500)" }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   NOTAS FISCAIS (histórico de entradas por NF)
=========================================================== */
function NFImageMock({ nf }) {
  // Representação visual simulada da imagem/foto da NF enviada ao sistema
  const lineSeed = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < nf.id.length; i++) seed += nf.id.charCodeAt(i) * (i + 2);
    return seed;
  }, [nf.id]);
  const lineWidths = Array.from({ length: 14 }, (_, i) => 35 + ((lineSeed * (i + 3)) % 55));

  return (
    <div className="rounded-lg p-5" style={{ background: "#EDEFF3" }}>
      <div className="mx-auto bg-white rounded shadow-sm" style={{ width: "100%", maxWidth: 280, padding: "18px 16px", transform: "rotate(-0.4deg)" }}>
        <p className="font-mono text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-900)" }}>NOTA FISCAL ELETRÔNICA</p>
        <p className="font-mono text-[9px] mb-2" style={{ color: "var(--text-500)" }}>{nf.name}</p>
        <div className="flex flex-col gap-1 mb-2">
          {lineWidths.map((w, i) => (
            <div key={i} style={{ width: `${w}%`, height: 3, background: i % 4 === 0 ? "var(--text-300)" : "#DADFE8" }} />
          ))}
        </div>
        <div className="flex justify-center mt-3"><Barcode code={nf.id} height={20} /></div>
      </div>
      <p className="text-center text-xs mt-3" style={{ color: "var(--text-500)" }}>Imagem da NF enviada ao sistema</p>
    </div>
  );
}

function NotasFiscais({ notasFiscais }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);

  const filtered = notasFiscais
    .filter(nf => {
      if (from && nf.date < from) return false;
      if (to && nf.date > to) return false;
      return nf.name.toLowerCase().includes(query.toLowerCase());
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <PageHeader title="Notas fiscais" subtitle="Histórico de NF cadastradas por leitura na entrada de produtos" />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex items-center" style={{ width: 280 }}>
          <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
          <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder="Buscar por fornecedor ou CNPJ…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <input type="date" className="stk-input stk-focus" style={{ width: 160 }} value={from} onChange={e => setFrom(e.target.value)} />
        <span className="text-sm" style={{ color: "var(--text-300)" }}>até</span>
        <input type="date" className="stk-input stk-focus" style={{ width: 160 }} value={to} onChange={e => setTo(e.target.value)} />
      </div>

      <div className="stk-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Nome da NF</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Data</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Itens</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Enviado por</th>
              <th className="text-right font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(nf => (
              <tr key={nf.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-5 py-3">
                  <p className="font-medium">{nf.name}</p>
                  <p className="text-xs font-mono" style={{ color: "var(--text-300)" }}>{nf.id}</p>
                </td>
                <td className="px-5 py-3">{nf.date.split("-").reverse().join("/")}</td>
                <td className="px-5 py-3" style={{ color: "var(--text-500)" }}>{nf.items.length} produto(s)</td>
                <td className="px-5 py-3">{nf.uploadedBy}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setViewing(nf)} className="stk-focus text-xs font-semibold" style={{ color: "var(--teal-600)" }}>Ver</button>
                    <button onClick={() => setViewing(nf)} className="stk-focus" style={{ color: "var(--text-500)" }}><Printer size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--text-300)" }}>Nenhuma nota fiscal encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(18,32,61,0.55)" }}>
          <div className="stk-card w-full max-w-2xl p-6 stk-fadein" style={{ maxHeight: "88vh", overflowY: "auto" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-display text-lg font-semibold">{viewing.name}</p>
                <p className="text-xs font-mono" style={{ color: "var(--text-500)" }}>{viewing.id} · {viewing.date.split("-").reverse().join("/")} · enviado por {viewing.uploadedBy}</p>
              </div>
              <button onClick={() => setViewing(null)} className="stk-focus"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <NFImageMock nf={viewing} />
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-500)" }}>Itens lançados a partir desta NF</p>
                <div className="flex flex-col gap-2 mb-5">
                  {viewing.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                      <span>{it.name}</span>
                      <span className="font-mono">{it.quantity} {it.unit} · R$ {it.unitPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <button className="stk-focus w-full py-2.5 rounded-lg text-sm font-semibold border flex items-center justify-center gap-2" style={{ borderColor: "var(--border)" }}><Printer size={14} /> Imprimir NF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   AUDITORIA (log de ações do sistema — admin)
=========================================================== */
function Auditoria({ auditLog }) {
  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState("todos");
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [viewing, setViewing] = useState(null);
  const uniqueUsers = ["todos", ...Array.from(new Set(auditLog.map(l => l.user)))];

  const filtered = auditLog.filter(l => {
    if (userFilter !== "todos" && l.user !== userFilter) return false;
    const logDate = l.date.slice(0, 10);
    if (from && logDate < from) return false;
    if (to && logDate > to) return false;
    const q = query.toLowerCase();
    if (!q) return true;
    return l.action.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.user.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Registro de todas as ações realizadas no sistema" />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex items-center" style={{ width: 260 }}>
          <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
          <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder="Buscar por ação, detalhe…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="stk-input stk-focus" style={{ width: 200 }} value={userFilter} onChange={e => setUserFilter(e.target.value)}>
          {uniqueUsers.map(u => <option key={u} value={u}>{u === "todos" ? "Todos os usuários" : u}</option>)}
        </select>
        <input type="date" className="stk-input stk-focus" style={{ width: 160 }} value={from} onChange={e => setFrom(e.target.value)} />
        <span className="text-sm" style={{ color: "var(--text-300)" }}>até</span>
        <input type="date" className="stk-input stk-focus" style={{ width: 160 }} value={to} onChange={e => setTo(e.target.value)} />
      </div>

      <div className="stk-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Usuário</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Ação</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Data / hora</th>
              <th className="text-left font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Setor</th>
              <th className="text-right font-medium px-5 py-3" style={{ color: "var(--text-500)" }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-5 py-3">{l.user}</td>
                <td className="px-5 py-3">{l.action}</td>
                <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--text-500)" }}>{l.date}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>{l.setor}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => setViewing(l)} className="stk-focus text-xs font-semibold" style={{ color: "var(--teal-600)" }}>Ver detalhes</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--text-300)" }}>Nenhum registro encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(18,32,61,0.55)" }}>
          <div className="stk-card w-full max-w-lg p-6 stk-fadein">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-display text-lg font-semibold">{viewing.action}</p>
                <p className="text-xs font-mono" style={{ color: "var(--text-500)" }}>{viewing.id} · {viewing.date}</p>
              </div>
              <button onClick={() => setViewing(null)} className="stk-focus"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Usuário</p>
                <p className="text-sm">{viewing.user}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Setor</p>
                <p className="text-sm">{viewing.setor}</p>
              </div>
            </div>

            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Detalhes</p>
            <p className="text-sm mb-4">{viewing.details}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: "var(--red-100)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "#8A2A2A" }}>Situação anterior</p>
                <p className="text-sm" style={{ color: "#8A2A2A" }}>{viewing.before}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--green-100)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--green-600)" }}>Situação atual</p>
                <p className="text-sm" style={{ color: "var(--green-600)" }}>{viewing.after}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   APP ROOT
=========================================================== */
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [products, setProducts] = useState(initialProducts);
  const [users, setUsers] = useState(initialUsers);
  const [requisicoes, setRequisicoes] = useState(initialRequisicoes);
  const [reports, setReports] = useState(initialReports);
  const [notasFiscais, setNotasFiscais] = useState(initialNotasFiscais);
  const [auditLog, setAuditLog] = useState(initialAuditLog);

  const [nfItems, setNfItems] = useState(null);
  const [nfName, setNfName] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [newQueue, setNewQueue] = useState([]);
  const [labelProduct, setLabelProduct] = useState(null);

  if (!currentUser) return <LoginScreen users={users} onLogin={(u) => setCurrentUser(u)} />;
  const role = currentUser.role;

  const addAuditEntry = (action, details, setor, before = "—", after = "—") => {
    const id = "LOG-" + String(auditLog.length + 1).padStart(4, "0");
    const now = new Date();
    const date = now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 5);
    setAuditLog([{ id, date, user: currentUser.name, action, setor, details, before, after }, ...auditLog]);
  };

  const addRequisicao = (data) => {
    const id = "REQ-" + String(requisicoes.length + 1).padStart(4, "0");
    setRequisicoes([{ id, ...data }, ...requisicoes]);
    addAuditEntry(
      "Registrou saída de estoque",
      `${id} — ${data.items.map(i => i.name).join(", ")}`,
      "Estoque",
      "—",
      data.items.map(i => `${i.name}: -${i.qty} ${i.unit}`).join(", ")
    );
  };

  const handleScanned = () => {
    setNfItems(mockNFItems.map(i => ({ ...i })));
    setNfName("Fornecedora Exemplo Ltda — CNPJ 12.345.678/0001-90");
    setReviewing(true);
  };

  const handleConfirmReview = () => {
    setReviewing(false);
    const nfId = "NF-" + String(notasFiscais.length + 1).padStart(4, "0");
    setNotasFiscais([{
      id: nfId, name: nfName, date: new Date().toISOString().slice(0, 10), uploadedBy: currentUser.name,
      items: nfItems.map(it => ({ name: it.matchName || it.rawName, quantity: it.quantity, unit: it.unit, unitPrice: it.unitPrice })),
    }, ...notasFiscais]);
    addAuditEntry(
      "Deu entrada por NF",
      `${nfId} — ${nfName}`,
      "Notas fiscais",
      "—",
      nfItems.map(it => `${it.matchName || it.rawName}: +${it.quantity} ${it.unit}`).join(", ")
    );

    const newOnes = nfItems.filter(i => !i.matchId);
    if (newOnes.length > 0) {
      setNewQueue(newOnes);
      setScreen("cadastro-produto");
    } else {
      setScreen("produtos");
    }
  };

  const handleSaveProduct = (extra) => {
    const nfItem = newQueue[0];
    const id = genId(products);
    const newProduct = {
      id, name: nfItem.rawName, quantity: nfItem.quantity, unit: nfItem.unit,
      category: extra.category, description: extra.description,
      keywords: extra.keywords.split(",").map(k => k.trim()).filter(Boolean),
      lowStockLimit: extra.lowStockLimit, active: true, isNew: true,
      dateAdded: new Date().toISOString().slice(0, 10),
    };
    setProducts(prev => [...prev, newProduct]);
    setLabelProduct(newProduct);
    setScreen("etiqueta");
  };

  const handleNextInQueue = () => {
    setNewQueue(q => q.slice(1));
    setScreen("cadastro-produto");
  };

  return (
    <Layout currentUser={currentUser} screen={screen} setScreen={(s) => { setScreen(s); }} onLogout={() => setCurrentUser(null)}>
      {screen === "dashboard" && <Dashboard products={products} setScreen={setScreen} role={role} />}
      {screen === "nf-upload" && <NFUpload onScanned={handleScanned} />}
      {screen === "notas-fiscais" && <NotasFiscais notasFiscais={notasFiscais} />}
      {screen === "cadastro-produto" && newQueue.length > 0 && (
        <ProductForm nfItem={newQueue[0]} index={mockNFItems.filter(i => !i.matchId).length - newQueue.length} total={mockNFItems.filter(i => !i.matchId).length} onSave={handleSaveProduct} />
      )}
      {screen === "etiqueta" && labelProduct && (
        <LabelConfirm
          product={labelProduct}
          hasNext={newQueue.length > 0}
          onNext={handleNextInQueue}
          onFinish={() => setScreen("produtos")}
        />
      )}
      {screen === "produtos" && <ProductList products={products} setProducts={setProducts} role={role} />}
      {screen === "saida" && <StockOut products={products} setProducts={setProducts} currentUser={currentUser} addRequisicao={addRequisicao} />}
      {screen === "requisicoes" && <Requisicoes requisicoes={requisicoes} setRequisicoes={setRequisicoes} products={products} role={role} />}
      {screen === "usuarios" && role === "Admin" && <UserManagement users={users} setUsers={setUsers} />}
      {screen === "relatorios" && <Reports reports={reports} setReports={setReports} currentUser={currentUser} role={role} />}
      {screen === "auditoria" && role === "Admin" && <Auditoria auditLog={auditLog} />}

      {reviewing && nfItems && (
        <NFReview items={nfItems} setItems={setNfItems} nfName={nfName} setNfName={setNfName} onConfirm={handleConfirmReview} onCancel={() => setReviewing(false)} />
      )}
    </Layout>
  );
}
