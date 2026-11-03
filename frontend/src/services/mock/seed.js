import { daysAgo } from "../../utils/dates";

/*
  Dados de exemplo do MODO DE TESTE (VITE_USE_MOCK=true).
  Nada daqui é usado quando o sistema fala com o backend real.
  As datas são relativas a hoje, para sempre haver dados recentes.
*/

export function criarBancoMock() {
  return {
    usuarios: [
      { id: "USR-0001", nome: "Usuário Teste 1", email: "usuarioteste1@empresa.com", senha: "12345678", dataNascimento: "1990-04-12", perfil: "Administrador", ativo: true },
      { id: "USR-0002", nome: "Usuário Teste 2", email: "usuarioteste2@empresa.com", senha: "12345678", dataNascimento: "1995-09-03", perfil: "Operador", ativo: true },
      { id: "USR-0003", nome: "Usuário Teste 3", email: "usuarioteste3@empresa.com", senha: "12345678", dataNascimento: "1998-01-22", perfil: "Visualizador", ativo: true },
      { id: "USR-0004", nome: "Usuário Teste 4", email: "usuarioteste4@empresa.com", senha: "12345678", dataNascimento: "1993-11-30", perfil: "Operador", ativo: false },
      // mesmo administrador padrão que o backend cria
      { id: "USR-0005", nome: "Administrador Inicial", email: "admin@estoqai.com", senha: "admin", dataNascimento: "1990-01-01", perfil: "Administrador", ativo: true },
    ],

    produtos: [
      { id: "EST-0001", codigoBarras: "EST-0001", nome: "Papel A4 75g (pacote 500fl)", quantidade: 42, unidade: "pct", categoria: "Papelaria", descricao: "Pacote com 500 folhas, papel branco 75g.", palavrasChave: ["papel sulfite", "resma a4"], limiteEstoqueBaixo: 10, ativo: true, dataCadastro: daysAgo(120) },
      { id: "EST-0002", codigoBarras: "EST-0002", nome: "Caneta esferográfica azul", quantidade: 8, unidade: "un", categoria: "Papelaria", descricao: "Caneta esferográfica ponta 1.0mm.", palavrasChave: ["caneta azul bic"], limiteEstoqueBaixo: 15, ativo: true, dataCadastro: daysAgo(150) },
      { id: "EST-0003", codigoBarras: "EST-0003", nome: "Detergente neutro 500ml", quantidade: 3, unidade: "un", categoria: "Limpeza", descricao: "Detergente concentrado neutro.", palavrasChave: ["detergente incolor"], limiteEstoqueBaixo: 5, ativo: true, dataCadastro: daysAgo(170) },
      { id: "EST-0004", codigoBarras: "EST-0004", nome: "Copo descartável 200ml (pacote c/100)", quantidade: 60, unidade: "pct", categoria: "Cozinha", descricao: "Copos plásticos descartáveis translúcidos.", palavrasChave: ["copo plastico", "copo agua"], limiteEstoqueBaixo: 20, ativo: true, dataCadastro: daysAgo(3) },
      { id: "EST-0005", codigoBarras: "EST-0005", nome: "Álcool em gel 500ml", quantidade: 25, unidade: "un", categoria: "Limpeza", descricao: "Álcool em gel 70%.", palavrasChave: ["alcool gel"], limiteEstoqueBaixo: 10, ativo: false, dataCadastro: daysAgo(200) },
    ],

    saidas: [
      { id: "SAI-0001", data: daysAgo(1), usuarioResponsavel: "Usuário Teste 2", descricao: "Saída para setor de vendas", itens: [{ produtoId: "EST-0002", nome: "Caneta esferográfica azul", quantidade: 12, unidade: "un" }] },
      { id: "SAI-0002", data: daysAgo(2), usuarioResponsavel: "Usuário Teste 2", descricao: "", itens: [{ produtoId: "EST-0004", nome: "Copo descartável 200ml (pacote c/100)", quantidade: 40, unidade: "pct" }] },
      { id: "SAI-0003", data: daysAgo(6), usuarioResponsavel: "Usuário Teste 1", descricao: "Reposição sala de reuniões", itens: [{ produtoId: "EST-0001", nome: "Papel A4 75g (pacote 500fl)", quantidade: 5, unidade: "pct" }, { produtoId: "EST-0003", nome: "Detergente neutro 500ml", quantidade: 2, unidade: "un" }] },
      { id: "SAI-0004", data: daysAgo(21), usuarioResponsavel: "Usuário Teste 2", descricao: "Limpeza semanal", itens: [{ produtoId: "EST-0003", nome: "Detergente neutro 500ml", quantidade: 6, unidade: "un" }] },
      { id: "SAI-0005", data: daysAgo(45), usuarioResponsavel: "Usuário Teste 1", descricao: "", itens: [{ produtoId: "EST-0005", nome: "Álcool em gel 500ml", quantidade: 10, unidade: "un" }] },
    ],

    notasFiscais: [
      { id: "NF-0001", nome: "Papelaria Nova Ltda — CNPJ 12.345.678/0001-90", data: daysAgo(1), usuarioResponsavel: "Usuário Teste 2", imagemUrl: null, itens: [{ nome: "Papel A4 75g (pacote 500fl)", quantidade: 20, unidade: "pct", valorUnitario: 24.9 }] },
      { id: "NF-0002", nome: "Distribuidora Limpa Bem — CNPJ 98.765.432/0001-11", data: daysAgo(8), usuarioResponsavel: "Usuário Teste 1", imagemUrl: null, itens: [{ nome: "Detergente neutro 500ml", quantidade: 30, unidade: "un", valorUnitario: 2.3 }, { nome: "Álcool em gel 500ml", quantidade: 15, unidade: "un", valorUnitario: 9.5 }] },
      { id: "NF-0003", nome: "Tech Supply Comércio — CNPJ 45.678.912/0001-22", data: daysAgo(20), usuarioResponsavel: "Usuário Teste 2", imagemUrl: null, itens: [{ nome: "Mouse óptico USB preto", quantidade: 10, unidade: "un", valorUnitario: 19.9 }] },
    ],

    auditoria: [
      { id: "LOG-0001", dataHora: daysAgo(0) + " 09:12", usuario: "Usuário Teste 1", acao: "Desativou usuário", setor: "Usuários", detalhes: "Usuário Teste 4", antes: "Status: Ativo", depois: "Status: Inativo" },
      { id: "LOG-0002", dataHora: daysAgo(1) + " 14:40", usuario: "Usuário Teste 2", acao: "Registrou saída de estoque", setor: "Saída de estoque", detalhes: "SAI-0001 — Caneta esferográfica azul", antes: "Caneta esferográfica azul: 20 un", depois: "Caneta esferográfica azul: 8 un" },
      { id: "LOG-0003", dataHora: daysAgo(1) + " 11:05", usuario: "Usuário Teste 2", acao: 'Deu entrada por NF - "12.345.678/0001-90"', setor: "Nova entrada (NF)", detalhes: "NF-0001 — Papelaria Nova Ltda — CNPJ 12.345.678/0001-90", antes: "Papel A4 75g (pacote 500fl): 22 pct", depois: "Papel A4 75g (pacote 500fl): 42 pct" },
      { id: "LOG-0004", dataHora: daysAgo(4) + " 16:20", usuario: "Usuário Teste 1", acao: "Editou produto", setor: "Produtos", detalhes: "EST-0003 — Detergente neutro 500ml", antes: "Limite de estoque baixo: 3", depois: "Limite de estoque baixo: 5" },
      { id: "LOG-0005", dataHora: daysAgo(6) + " 08:47", usuario: "Usuário Teste 1", acao: "Alterou saída", setor: "Saídas", detalhes: "SAI-0003", antes: "Papel A4 75g (pacote 500fl): 4 pct", depois: "Papel A4 75g (pacote 500fl): 5 pct" },
    ],

    atividade: [
      { tipo: "entrada", texto: "Papel A4 75g — entrada de 20 pct", quando: "há 1h" },
      { tipo: "saida", texto: "Caneta esferográfica azul — saída de 12 un", quando: "há 3h" },
      { tipo: "entrada", texto: "Detergente neutro 500ml — entrada de 30 un", quando: "há 5h" },
      { tipo: "saida", texto: "Copo descartável 200ml — saída de 40 pct", quando: "ontem" },
    ],

    movimentacaoSemana: [
      { dia: "Seg", entradas: 32, saidas: 18 },
      { dia: "Ter", entradas: 14, saidas: 22 },
      { dia: "Qua", entradas: 40, saidas: 10 },
      { dia: "Qui", entradas: 8, saidas: 26 },
      { dia: "Sex", entradas: 22, saidas: 15 },
      { dia: "Sáb", entradas: 5, saidas: 6 },
    ],

    // o que a "leitura da NF" devolve no modo de teste
    leituraNF: {
      nomeSugerido: "Fornecedora Exemplo Ltda — CNPJ 12.345.678/0001-90",
      itens: [
        { descricaoOriginal: "PAPEL SULFITE A4 75G 500FL", quantidade: 20, unidade: "pct", valorUnitario: 24.9 },
        { descricaoOriginal: "DETERGENTE INCOLOR 500ML", quantidade: 30, unidade: "un", valorUnitario: 2.3 },
        { descricaoOriginal: "GARRAFA TERMICA INOX 1L", quantidade: 6, unidade: "un", valorUnitario: 58.0 },
        { descricaoOriginal: "MOUSE OPTICO USB PRETO", quantidade: 10, unidade: "un", valorUnitario: 19.9 },
      ],
    },
  };
}
