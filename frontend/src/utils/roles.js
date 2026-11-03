import {
  LayoutDashboard, Upload, Package, History, Users, FileStack, ClipboardCheck, ExternalLink,
} from "lucide-react";

export const PERFIS = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  VISUALIZADOR: "Visualizador",
};

const TODOS = [PERFIS.ADMIN, PERFIS.OPERADOR, PERFIS.VISUALIZADOR];
const ADMIN_OPERADOR = [PERFIS.ADMIN, PERFIS.OPERADOR];

// Abas do menu lateral, na ordem de exibição, e quem pode acessar cada uma
export const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perfis: TODOS },
  { path: "/nova-entrada", label: "Nova entrada (NF)", icon: Upload, perfis: ADMIN_OPERADOR },
  { path: "/saida", label: "Saída de estoque", icon: ExternalLink, perfis: ADMIN_OPERADOR },
  { path: "/produtos", label: "Produtos", icon: Package, perfis: TODOS },
  { path: "/notas-fiscais", label: "Notas fiscais", icon: FileStack, perfis: TODOS },
  { path: "/saidas", label: "Saídas", icon: ClipboardCheck, perfis: TODOS },
  { path: "/auditoria", label: "Auditoria", icon: History, perfis: [PERFIS.ADMIN] },
  { path: "/usuarios", label: "Usuários", icon: Users, perfis: [PERFIS.ADMIN] },
];

export function podeAcessar(perfil, path) {
  const item = NAV_ITEMS.find((i) => path === i.path || path.startsWith(i.path + "/"));
  return item ? item.perfis.includes(perfil) : true;
}

// Texto exibido para cada perfil na tela de usuários
export const DESCRICAO_PERFIS = [
  {
    perfil: PERFIS.ADMIN,
    texto: "Acesso total a todas as abas e funcionalidades do sistema",
  },
  {
    perfil: PERFIS.OPERADOR,
    texto:
      "Visualiza todas as abas, exceto Auditoria e Usuários. Tem acesso completo a Nova entrada (NF), Saída de estoque, Produtos (exceto alterar a quantidade em estoque manualmente) e Notas fiscais. Em Saídas, pode visualizar e imprimir, mas não editar ou excluir",
  },
  {
    perfil: PERFIS.VISUALIZADOR,
    texto:
      "Visualiza Dashboard, Produtos, Notas fiscais e Saídas, e pode imprimir notas fiscais e registros de saídas",
  },
];
