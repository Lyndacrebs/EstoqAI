import { http } from "../http";

/*
  ADAPTADOR DO BACKEND REAL.
  Cada função chama uma rota do backend e devolve os dados no formato do CONTRATO
  (docs/CONTRATO_API.md). Quando o backend for ajustado, as mudanças ficam só aqui:
  telas e componentes não precisam ser alterados.
*/

const auth = {
  login: (email, senha) => http.post("/usuarios/login", { email, senha }),
  me: () => http.get("/usuarios/me"),
  // passo 1: confere os dados (3 tentativas por e-mail) e devolve uma chave temporária
  verificarRecuperacao: (dados) => http.post("/usuarios/recuperar-senha/verificar", dados),
  // passo 2: grava a nova senha usando a chave do passo 1
  redefinirSenha: (dados) => http.post("/usuarios/recuperar-senha/redefinir", dados),
};

const dashboard = {
  resumo: () => http.get("/dashboard/resumo"),
};

const produtos = {
  listar: ({ status = "ativos", busca = "" } = {}) => http.get("/produtos", { status, busca }),
  obter: (id) => http.get(`/produtos/${encodeURIComponent(id)}`),
  buscarPorCodigo: (codigoBarras) => http.get(`/produtos/codigo/${encodeURIComponent(codigoBarras)}`),
  buscarAtivosPorNome: (nome) => http.get("/produtos/ativos/busca", { nome }),
  atualizar: (id, dados) => http.put(`/produtos/${encodeURIComponent(id)}`, dados),
  ajustarQuantidade: (id, { quantidade, motivo }) => http.patch(`/produtos/${encodeURIComponent(id)}/quantidade`, { quantidade, motivo }),
  desativar: (id) => http.patch(`/produtos/${encodeURIComponent(id)}/desativar`),
  reativar: (id) => http.patch(`/produtos/${encodeURIComponent(id)}/reativar`),
};

const notasFiscais = {
  listar: ({ busca = "", de = "", ate = "" } = {}) => http.get("/notas-fiscais", { busca, de, ate }),
  obter: (id) => http.get(`/notas-fiscais/${encodeURIComponent(id)}`),
  lerImagem: (arquivo) => {
    const form = new FormData();
    form.append("imagem", arquivo);
    return http.postForm("/notas-fiscais/leitura", form);
  },
  confirmar: ({ leituraId, nome, itens }) => http.post("/notas-fiscais", { leituraId, nome, itens }),
  cadastrarProdutoNovo: (notaId, item, dados) =>
    http.post(`/notas-fiscais/${encodeURIComponent(notaId)}/produtos-novos`, { item, ...dados }),
  finalizar: (notaId) => http.post(`/notas-fiscais/${encodeURIComponent(notaId)}/finalizar`),
};

const saidas = {
  listar: ({ busca = "", de = "", ate = "" } = {}) => http.get("/saidas", { busca, de, ate }),
  obter: (id) => http.get(`/saidas/${encodeURIComponent(id)}`),
  registrar: ({ itens, descricao }) => http.post("/saidas", { itens, descricao }),
  atualizar: (id, { itens, descricao }) => http.put(`/saidas/${encodeURIComponent(id)}`, { itens, descricao }),
  excluir: (id) => http.delete(`/saidas/${encodeURIComponent(id)}`),
};

const usuarios = {
  listar: ({ status = "ativos", busca = "" } = {}) => http.get("/usuarios", { status, busca }),
  criar: (dados) => http.post("/usuarios", dados),
  atualizar: (id, dados) => http.put(`/usuarios/${encodeURIComponent(id)}`, dados),
  desativar: (id) => http.patch(`/usuarios/${encodeURIComponent(id)}/desativar`),
  reativar: (id) => http.patch(`/usuarios/${encodeURIComponent(id)}/reativar`),
};

const auditoria = {
  listar: ({ setor = "", usuario = "", de = "", ate = "" } = {}) => http.get("/auditoria", { setor, usuario, de, ate }),
};

export const realApi = { auth, dashboard, produtos, notasFiscais, saidas, usuarios, auditoria };
