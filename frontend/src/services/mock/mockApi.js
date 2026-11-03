import { ApiError } from "../errors";
import { reportAuthError } from "../http";
import { getToken } from "../session";
import { criarBancoMock } from "./seed";
import { daysAgo, nowStamp, todayStr } from "../../utils/dates";
import { normalizeText, extractCnpj } from "../../utils/text";

/*
  MODO DE TESTE: responde igual ao backend, mas com dados falsos em memória.
  Também aplica as regras de negócio (estoque, permissões etc.), para o
  frontend poder ser testado de ponta a ponta sem o backend.
  Os formatos de entrada e saída são o CONTRATO descrito em docs/CONTRATO_API.md.
*/

const db = criarBancoMock();
const leituras = {};   // leituras de NF feitas (guarda a imagem enviada)
const entradasNF = {}; // entradas de NF ainda não finalizadas (para a auditoria)

const ADMIN = "Administrador";
const MAX_TENTATIVAS_RECUPERACAO = 3;
const tentativasRecuperacao = {}; // e-mail -> erros seguidos na recuperação de senha
const chavesRecuperacao = {};     // chave temporária -> id do usuário (dados já conferidos)
const chaveEmail = (e) => String(e).trim().toLowerCase();
const nomeComparavel = (n) => normalizeText(n).replace(/\s+/g, " ").trim();
const OPERADOR = "Operador";
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const pad = (n, t = 4) => String(n).padStart(t, "0");

/* ---------- sessão e permissões ---------- */

function erroDeSessao(status, mensagem) {
  const err = new ApiError(status, mensagem);
  reportAuthError(err);
  return err;
}

function usuarioPublico(u) {
  const { senha, ...resto } = u; // nunca devolve a senha
  return resto;
}

// Quem está logado agora. Barra quem não tem perfil permitido.
function usuarioAtual(perfisPermitidos) {
  const token = getToken() || "";
  const id = token.startsWith("mock-") ? token.slice(5) : null;
  const u = db.usuarios.find((x) => x.id === id);
  if (!u) throw erroDeSessao(401, "Token inválido ou expirado.");
  if (!u.ativo) throw erroDeSessao(403, "Cadastro desativado. Entre em contato com o Administrador.");
  if (perfisPermitidos && !perfisPermitidos.includes(u.perfil)) {
    throw new ApiError(403, "Acesso negado: seu perfil não tem permissão para esta ação.");
  }
  return u;
}

/* ---------- auditoria e atividade ---------- */

function registrarAuditoria(usuario, acao, setor, detalhes, antes = "—", depois = "—") {
  db.auditoria.unshift({
    id: "LOG-" + pad(db.auditoria.length + 1),
    dataHora: nowStamp(),
    usuario: usuario.nome,
    acao, setor, detalhes, antes, depois,
  });
}

function registrarAtividade(tipo, texto) {
  db.atividade.unshift({ tipo, texto, quando: "agora" });
  db.atividade = db.atividade.slice(0, 10);
}

const linha = (nome, qtd, un) => `${nome}: ${qtd} ${un}`;

/* ---------- autenticação ---------- */

const auth = {
  async login(email, senha) {
    await wait();
    const u = db.usuarios.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u) throw new ApiError(401, "E-mail ou senha incorretos.");
    if (!u.ativo) throw new ApiError(403, "Cadastro desativado. Entre em contato com o Administrador.");
    if (u.senha !== senha) throw new ApiError(401, "E-mail ou senha incorretos.");
    delete tentativasRecuperacao[chaveEmail(u.email)]; // login correto libera a recuperação
    return { token: `mock-${u.id}`, usuario: usuarioPublico(u) };
  },

  // Confere se a sessão ainda vale (usuário não foi desativado)
  async me() {
    await wait(40);
    return usuarioPublico(usuarioAtual());
  },

  // Passo 1: confere nome, nascimento, e-mail e perfil. São 3 tentativas por e-mail;
  // depois disso o bloqueio só sai com login correto ou redefinição feita pelo Administrador.
  async verificarRecuperacao({ nome, dataNascimento, email, perfil }) {
    await wait();
    const chave = chaveEmail(email);
    const erros = tentativasRecuperacao[chave] || 0;
    if (erros >= MAX_TENTATIVAS_RECUPERACAO) {
      throw new ApiError(423, "Recuperação de senha bloqueada. Procure um usuário administrador.");
    }
    const u = db.usuarios.find((x) => chaveEmail(x.email) === chave);
    const confere = u && nomeComparavel(u.nome) === nomeComparavel(nome) && u.dataNascimento === dataNascimento && u.perfil === perfil;
    if (!confere) {
      const total = erros + 1;
      tentativasRecuperacao[chave] = total;
      const restam = MAX_TENTATIVAS_RECUPERACAO - total;
      throw new ApiError(400, restam > 0
        ? `Os dados informados não conferem. Você ainda tem ${restam} tentativa${restam > 1 ? "s" : ""}.`
        : "Os dados informados não conferem. Procure um usuário administrador.");
    }
    if (!u.ativo) throw new ApiError(403, "Cadastro desativado. Entre em contato com o Administrador.");
    const chaveTemp = "rec-" + Date.now() + "-" + u.id;
    chavesRecuperacao[chaveTemp] = u.id;
    return { chaveRecuperacao: chaveTemp };
  },

  // Passo 2: grava a nova senha
  async redefinirSenha({ chaveRecuperacao, novaSenha }) {
    await wait();
    const id = chavesRecuperacao[chaveRecuperacao];
    const u = db.usuarios.find((x) => x.id === id);
    if (!u) throw new ApiError(400, "Solicitação expirada. Refaça a recuperação de senha.");
    if (!novaSenha) throw new ApiError(400, "Informe a nova senha.");
    u.senha = novaSenha;
    delete chavesRecuperacao[chaveRecuperacao];
    delete tentativasRecuperacao[chaveEmail(u.email)];
    return { ok: true };
  },
};

/* ---------- dashboard ---------- */

const dashboard = {
  async resumo() {
    await wait();
    usuarioAtual();
    const ativos = db.produtos.filter((p) => p.ativo);
    const baixo = ativos.filter((p) => p.quantidade <= p.limiteEstoqueBaixo);
    return {
      produtosAtivos: ativos.length,
      produtosEstoqueBaixo: baixo.length,
      novosNaSemana: db.produtos.filter((p) => p.dataCadastro >= daysAgo(7)).length,
      estoqueBaixo: baixo.map((p) => ({ id: p.id, nome: p.nome, quantidade: p.quantidade, unidade: p.unidade, limite: p.limiteEstoqueBaixo })),
      movimentacaoSemana: clone(db.movimentacaoSemana),
      atividadeRecente: clone(db.atividade).slice(0, 6),
    };
  },
};

/* ---------- produtos ---------- */

const CAMPOS_PRODUTO = {
  nome: "Nome", categoria: "Categoria", unidade: "Unidade de medida",
  descricao: "Descrição", palavrasChave: "Palavras-chave", limiteEstoqueBaixo: "Limite de estoque baixo",
};
const fmtCampo = (k, v) => (k === "palavrasChave" ? (v.join(", ") || "—") : v === "" || v == null ? "—" : String(v));

function proximoIdProduto() {
  const max = Math.max(0, ...db.produtos.map((p) => parseInt(p.id.slice(4), 10)));
  return "EST-" + pad(max + 1);
}

const produtos = {
  // status: "ativos" | "inativos" | "todos"
  async listar({ status = "ativos", busca = "" } = {}) {
    await wait();
    usuarioAtual();
    const q = normalizeText(busca.trim());
    return clone(
      db.produtos.filter((p) => {
        if (status === "ativos" && !p.ativo) return false;
        if (status === "inativos" && p.ativo) return false;
        return normalizeText(p.nome).includes(q);
      })
    );
  },

  async obter(id) {
    await wait();
    usuarioAtual();
    const p = db.produtos.find((x) => x.id === id);
    if (!p) throw new ApiError(404, "Produto não encontrado.");
    return clone(p);
  },

  // Leitura do código de barras: só devolve produto ativo
  async buscarPorCodigo(codigoBarras) {
    await wait();
    usuarioAtual();
    const p = db.produtos.find((x) => x.codigoBarras === String(codigoBarras).trim());
    if (!p) throw new ApiError(404, "Nenhum produto encontrado com este código.");
    if (!p.ativo) throw new ApiError(400, "Este produto está inativo e não pode ter saída.");
    return clone(p);
  },

  // Saída pelo nome: só produtos ativos
  async buscarAtivosPorNome(nome) {
    await wait(80);
    usuarioAtual();
    const q = normalizeText(String(nome).trim());
    return clone(db.produtos.filter((p) => p.ativo && normalizeText(p.nome).includes(q)));
  },

  async atualizar(id, dados) {
    await wait();
    const user = usuarioAtual([ADMIN, OPERADOR]);
    const p = db.produtos.find((x) => x.id === id);
    if (!p) throw new ApiError(404, "Produto não encontrado.");
    if (!p.ativo) throw new ApiError(400, "Produto inativo: reative antes de editar.");
    if (dados.quantidade !== undefined && Number(dados.quantidade) !== p.quantidade) {
      throw new ApiError(400, "A quantidade não é alterada pela edição do produto. Use o ajuste manual de quantidade.");
    }
    if (!String(dados.nome ?? p.nome).trim()) throw new ApiError(400, "O nome do produto é obrigatório.");

    const novo = { ...p, ...Object.fromEntries(Object.keys(CAMPOS_PRODUTO).filter((k) => dados[k] !== undefined).map((k) => [k, dados[k]])) };
    const mudou = Object.keys(CAMPOS_PRODUTO).filter((k) => fmtCampo(k, p[k]) !== fmtCampo(k, novo[k]));
    const antes = mudou.map((k) => `${CAMPOS_PRODUTO[k]}: ${fmtCampo(k, p[k])}`).join("\n");
    const depois = mudou.map((k) => `${CAMPOS_PRODUTO[k]}: ${fmtCampo(k, novo[k])}`).join("\n");
    Object.assign(p, novo);
    if (mudou.length) {
      registrarAuditoria(user, "Editou produto", "Produtos", `${p.id} — ${p.nome}`, antes, depois);
    }
    return clone(p);
  },

  // Só Administrador. Exige motivo (mín. 20 caracteres) e grava na auditoria.
  async ajustarQuantidade(id, { quantidade, motivo }) {
    await wait();
    const user = usuarioAtual([ADMIN]);
    const p = db.produtos.find((x) => x.id === id);
    if (!p) throw new ApiError(404, "Produto não encontrado.");
    if (!p.ativo) throw new ApiError(400, "Produto inativo: reative antes de editar.");
    const nova = Number(quantidade);
    if (!Number.isInteger(nova) || nova < 0) throw new ApiError(400, "Informe uma quantidade inteira maior ou igual a zero.");
    if (nova === p.quantidade) throw new ApiError(400, "A nova quantidade é igual à atual.");
    const texto = String(motivo || "").trim();
    if (texto.length < 20) throw new ApiError(400, "Descreva o motivo com pelo menos 20 caracteres.");
    const antes = `Quantidade: ${p.quantidade} ${p.unidade}`;
    p.quantidade = nova;
    registrarAuditoria(user, "Alterou quantidade manualmente", "Produtos", `${p.id} — ${p.nome} — Motivo: ${texto}`, antes, `Quantidade: ${p.quantidade} ${p.unidade}`);
    return clone(p);
  },

  async desativar(id) {
    await wait();
    const user = usuarioAtual([ADMIN, OPERADOR]);
    const p = db.produtos.find((x) => x.id === id);
    if (!p) throw new ApiError(404, "Produto não encontrado.");
    p.ativo = false;
    registrarAuditoria(user, "Desativou produto", "Produtos", `${p.id} — ${p.nome}`, "Status: Ativo", "Status: Inativo");
    return clone(p);
  },

  async reativar(id) {
    await wait();
    const user = usuarioAtual([ADMIN, OPERADOR]);
    const p = db.produtos.find((x) => x.id === id);
    if (!p) throw new ApiError(404, "Produto não encontrado.");
    p.ativo = true;
    registrarAuditoria(user, "Reativou produto", "Produtos", `${p.id} — ${p.nome}`, "Status: Inativo", "Status: Ativo");
    return clone(p);
  },
};

/* ---------- notas fiscais e entrada por NF ---------- */

function resumoNF(nf) {
  return { id: nf.id, nome: nf.nome, data: nf.data, usuarioResponsavel: nf.usuarioResponsavel, quantidadeProdutos: nf.itens.length };
}

const notasFiscais = {
  async listar({ busca = "", de = "", ate = "" } = {}) {
    await wait();
    usuarioAtual();
    const q = normalizeText(busca.trim());
    return db.notasFiscais
      .filter((nf) => (!de || nf.data >= de) && (!ate || nf.data <= ate) && normalizeText(nf.nome).includes(q))
      .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
      .map(resumoNF);
  },

  async obter(id) {
    await wait();
    usuarioAtual();
    const nf = db.notasFiscais.find((x) => x.id === id);
    if (!nf) throw new ApiError(404, "Nota fiscal não encontrada.");
    return clone(nf);
  },

  // Recebe a foto da NF; devolve o que a IA leu e o vínculo com produtos já cadastrados
  async lerImagem(arquivo) {
    usuarioAtual([ADMIN, OPERADOR]);
    await wait(2200);
    const leituraId = "LEI-" + Date.now();
    leituras[leituraId] = { imagemUrl: arquivo ? URL.createObjectURL(arquivo) : null };
    const itens = db.leituraNF.itens.map((it, i) => {
      const texto = normalizeText(it.descricaoOriginal);
      const achado = db.produtos.find(
        (p) => p.ativo && [...p.palavrasChave, p.nome].some((k) => normalizeText(k).length >= 3 && texto.includes(normalizeText(k)))
      );
      return { id: i + 1, ...it, produtoVinculado: achado ? { id: achado.id, nome: achado.nome } : null };
    });
    return { leituraId, nomeSugerido: db.leituraNF.nomeSugerido, itens };
  },

  // Confirma a conferência: soma o estoque dos produtos que já existem e registra a NF
  async confirmar({ leituraId, nome, itens }) {
    await wait();
    const user = usuarioAtual([ADMIN, OPERADOR]);
    if (!String(nome).trim()) throw new ApiError(400, "Informe o nome da nota fiscal.");
    if (!itens || itens.length === 0) throw new ApiError(400, "A nota fiscal precisa ter itens.");
    if (itens.some((i) => !(Number(i.quantidade) > 0))) throw new ApiError(400, "A quantidade de cada item precisa ser maior que zero.");

    const soma = {};
    itens.forEach((i) => { if (i.produtoId) soma[i.produtoId] = (soma[i.produtoId] || 0) + Number(i.quantidade); });

    const antes = [], depois = [];
    Object.keys(soma).forEach((id) => {
      const p = db.produtos.find((x) => x.id === id);
      if (!p) throw new ApiError(404, "Produto vinculado não encontrado.");
      antes.push(linha(p.nome, p.quantidade, p.unidade));
      p.quantidade += soma[id];
      depois.push(linha(p.nome, p.quantidade, p.unidade));
    });

    const numero = Math.max(0, ...db.notasFiscais.map((n) => parseInt(n.id.slice(3), 10))) + 1;
    const notaId = "NF-" + pad(numero);
    db.notasFiscais.unshift({
      id: notaId, nome: String(nome).trim(), data: todayStr(), usuarioResponsavel: user.nome,
      imagemUrl: leituras[leituraId]?.imagemUrl ?? null,
      itens: itens.map((i) => ({
        nome: i.produtoId ? db.produtos.find((p) => p.id === i.produtoId).nome : i.descricaoOriginal,
        quantidade: Number(i.quantidade), unidade: i.unidade, valorUnitario: i.valorUnitario,
      })),
    });
    entradasNF[notaId] = { nome: String(nome).trim(), antes, depois };
    itens.filter((i) => i.produtoId).forEach((i) => {
      const p = db.produtos.find((x) => x.id === i.produtoId);
      registrarAtividade("entrada", `${p.nome} — entrada de ${i.quantidade} ${i.unidade}`);
    });

    return {
      notaId,
      produtosNovos: itens.filter((i) => !i.produtoId).map((i) => ({ id: i.id, descricaoOriginal: i.descricaoOriginal, quantidade: Number(i.quantidade), unidade: i.unidade })),
    };
  },

  // Cadastra um produto novo identificado na NF (categoria, limite, descrição e palavras-chave)
  async cadastrarProdutoNovo(notaId, item, dados) {
    await wait();
    usuarioAtual([ADMIN, OPERADOR]);
    if (!String(dados.categoria || "").trim()) throw new ApiError(400, "Informe a categoria do produto.");
    const entrada = entradasNF[notaId];
    if (!entrada) throw new ApiError(404, "Entrada de NF não encontrada.");
    const id = proximoIdProduto();
    const novo = {
      id, codigoBarras: id, nome: item.descricaoOriginal, quantidade: Number(item.quantidade), unidade: item.unidade,
      categoria: dados.categoria.trim(), descricao: dados.descricao || "", palavrasChave: dados.palavrasChave || [],
      limiteEstoqueBaixo: Number(dados.limiteEstoqueBaixo) || 0, ativo: true, dataCadastro: todayStr(),
    };
    db.produtos.push(novo);
    entrada.depois.push(`${linha(novo.nome, novo.quantidade, novo.unidade)} (novo)`);
    registrarAtividade("entrada", `${novo.nome} — entrada de ${novo.quantidade} ${novo.unidade} (produto novo)`);
    return clone(novo);
  },

  // Fim do fluxo: grava UM registro de auditoria com tudo que a NF fez
  async finalizar(notaId) {
    await wait(60);
    const user = usuarioAtual([ADMIN, OPERADOR]);
    const entrada = entradasNF[notaId];
    if (entrada) {
      registrarAuditoria(user, `Deu entrada por NF - "${extractCnpj(entrada.nome)}"`, "Nova entrada (NF)",
        `${notaId} — ${entrada.nome}`, entrada.antes.join("\n") || "—", entrada.depois.join("\n"));
      delete entradasNF[notaId];
    }
    return { ok: true };
  },
};

/* ---------- saídas ---------- */

function resumoSaida(s) {
  return { id: s.id, data: s.data, usuarioResponsavel: s.usuarioResponsavel, quantidadeProdutos: s.itens.length };
}
const textoItens = (itens) => itens.map((i) => linha(i.nome, i.quantidade, i.unidade)).join("\n");

const saidas = {
  async listar({ busca = "", de = "", ate = "" } = {}) {
    await wait();
    usuarioAtual();
    const q = normalizeText(busca.trim());
    return db.saidas
      .filter((s) => (!de || s.data >= de) && (!ate || s.data <= ate))
      .filter((s) => !q || normalizeText(s.id).includes(q) || normalizeText(s.usuarioResponsavel).includes(q))
      .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
      .map(resumoSaida);
  },

  async obter(id) {
    await wait();
    usuarioAtual();
    const s = db.saidas.find((x) => x.id === id);
    if (!s) throw new ApiError(404, "Saída não encontrada.");
    return clone(s);
  },

  // itens: [{ produtoId, quantidade }]. Devolve os produtos que chegaram no estoque mínimo.
  async registrar({ itens, descricao = "" }) {
    await wait();
    const user = usuarioAtual([ADMIN, OPERADOR]);
    if (!itens || itens.length === 0) throw new ApiError(400, "Adicione ao menos um produto à saída.");

    const linhasSaida = itens.map((i) => {
      const p = db.produtos.find((x) => x.id === i.produtoId);
      if (!p || !p.ativo) throw new ApiError(400, "Produto inexistente ou inativo na saída.");
      const q = Number(i.quantidade);
      if (!Number.isInteger(q) || q < 1) throw new ApiError(400, `Quantidade inválida para "${p.nome}".`);
      if (q > p.quantidade) throw new ApiError(400, `Quantidade maior que o disponível em estoque para "${p.nome}" (${p.quantidade} ${p.unidade}).`);
      return { p, q };
    });

    const antes = linhasSaida.map(({ p }) => linha(p.nome, p.quantidade, p.unidade)).join("\n");
    linhasSaida.forEach(({ p, q }) => { p.quantidade -= q; });
    const depois = linhasSaida.map(({ p }) => linha(p.nome, p.quantidade, p.unidade)).join("\n");

    const numero = Math.max(0, ...db.saidas.map((s) => parseInt(s.id.slice(4), 10))) + 1;
    const id = "SAI-" + pad(numero);
    db.saidas.unshift({
      id, data: todayStr(), usuarioResponsavel: user.nome, descricao,
      itens: linhasSaida.map(({ p, q }) => ({ produtoId: p.id, nome: p.nome, quantidade: q, unidade: p.unidade })),
    });
    registrarAuditoria(user, "Registrou saída de estoque", "Saída de estoque", `${id} — ${linhasSaida.map(({ p }) => p.nome).join(", ")}`, antes, depois);
    linhasSaida.forEach(({ p, q }) => registrarAtividade("saida", `${p.nome} — saída de ${q} ${p.unidade}`));

    return { id, alertasEstoqueMinimo: linhasSaida.filter(({ p }) => p.quantidade <= p.limiteEstoqueBaixo).map(({ p }) => p.nome) };
  },

  // Só Administrador. Ajusta o estoque pela diferença entre a saída antiga e a nova.
  async atualizar(id, { itens, descricao = "" }) {
    await wait();
    const user = usuarioAtual([ADMIN]);
    const s = db.saidas.find((x) => x.id === id);
    if (!s) throw new ApiError(404, "Saída não encontrada.");
    if (!itens || itens.length === 0) throw new ApiError(400, "A saída precisa ter ao menos um produto. Para remover tudo, exclua a saída.");

    const delta = {};
    s.itens.forEach((i) => { delta[i.produtoId] = (delta[i.produtoId] || 0) + i.quantidade; });
    itens.forEach((i) => { delta[i.produtoId] = (delta[i.produtoId] || 0) - Number(i.quantidade); });

    for (const [pid, d] of Object.entries(delta)) {
      const p = db.produtos.find((x) => x.id === pid);
      if (p && p.quantidade + d < 0) throw new ApiError(400, `Estoque insuficiente para "${p.nome}".`);
    }
    for (const i of itens) {
      if (!Number.isInteger(Number(i.quantidade)) || Number(i.quantidade) < 1) throw new ApiError(400, "Informe uma quantidade válida.");
      const p = db.produtos.find((x) => x.id === i.produtoId);
      if (!p) throw new ApiError(404, "Produto não encontrado.");
      if (!p.ativo && !s.itens.some((o) => o.produtoId === p.id)) throw new ApiError(400, `O produto "${p.nome}" está inativo.`);
    }

    Object.entries(delta).forEach(([pid, d]) => {
      const p = db.produtos.find((x) => x.id === pid);
      if (p) p.quantidade += d;
    });

    const antes = textoItens(s.itens) + (s.descricao ? `\nDescrição: ${s.descricao}` : "");
    s.itens = itens.map((i) => {
      const p = db.produtos.find((x) => x.id === i.produtoId);
      return { produtoId: p.id, nome: p.nome, quantidade: Number(i.quantidade), unidade: p.unidade };
    });
    s.descricao = descricao;
    const depois = textoItens(s.itens) + (s.descricao ? `\nDescrição: ${s.descricao}` : "");
    registrarAuditoria(user, "Alterou saída", "Saídas", s.id, antes, depois);
    return clone(s);
  },

  // Só Administrador. As quantidades da saída voltam para o estoque.
  async excluir(id) {
    await wait();
    const user = usuarioAtual([ADMIN]);
    const idx = db.saidas.findIndex((x) => x.id === id);
    if (idx === -1) throw new ApiError(404, "Saída não encontrada.");
    const s = db.saidas[idx];
    s.itens.forEach((i) => {
      const p = db.produtos.find((x) => x.id === i.produtoId);
      if (p) p.quantidade += i.quantidade;
    });
    db.saidas.splice(idx, 1);
    registrarAuditoria(user, "Excluiu saída", "Saídas", s.id, textoItens(s.itens), "Saída excluída — quantidades devolvidas ao estoque");
    return { ok: true };
  },
};

/* ---------- usuários (só Administrador) ---------- */

const CAMPOS_USUARIO = { nome: "Nome", dataNascimento: "Data de nascimento", email: "E-mail", perfil: "Perfil" };

const usuarios = {
  async listar({ status = "ativos", busca = "" } = {}) {
    await wait();
    usuarioAtual([ADMIN]);
    const q = normalizeText(busca.trim());
    return db.usuarios
      .filter((u) => (status === "todos" || (status === "ativos") === u.ativo) && normalizeText(u.nome).includes(q))
      .map(usuarioPublico);
  },

  async criar({ nome, dataNascimento, email, senha, perfil }) {
    await wait();
    const user = usuarioAtual([ADMIN]);
    if (!String(nome).trim() || !dataNascimento || !String(email).trim() || !senha || !perfil) {
      throw new ApiError(400, "Preencha todos os campos obrigatórios.");
    }
    if (db.usuarios.some((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())) {
      throw new ApiError(409, "Já existe um usuário cadastrado com este e-mail.");
    }
    const numero = Math.max(0, ...db.usuarios.map((u) => parseInt(u.id.slice(4), 10))) + 1;
    const novo = { id: "USR-" + pad(numero), nome: String(nome).trim(), email: String(email).trim(), senha, dataNascimento, perfil, ativo: true };
    db.usuarios.push(novo);
    registrarAuditoria(user, "Cadastrou usuário", "Usuários", `${novo.nome} (${perfil})`, "—", `Perfil: ${perfil}; Status: Ativo`);
    return usuarioPublico(novo);
  },

  async atualizar(id, dados) {
    await wait();
    const user = usuarioAtual([ADMIN]);
    const u = db.usuarios.find((x) => x.id === id);
    if (!u) throw new ApiError(404, "Usuário não encontrado.");
    if (!u.ativo) throw new ApiError(400, "Usuário inativo: reative antes de editar.");
    const email = String(dados.email ?? u.email).trim();
    if (db.usuarios.some((x) => x.id !== id && x.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError(409, "Já existe um usuário cadastrado com este e-mail.");
    }
    const novo = { nome: String(dados.nome ?? u.nome).trim(), dataNascimento: dados.dataNascimento ?? u.dataNascimento, email, perfil: dados.perfil ?? u.perfil };
    const mudou = Object.keys(CAMPOS_USUARIO).filter((k) => u[k] !== novo[k]);
    const trocouSenha = !!dados.senha;
    const antes = mudou.map((k) => `${CAMPOS_USUARIO[k]}: ${u[k] || "—"}`).join("\n") || "—";
    Object.assign(u, novo);
    if (trocouSenha) { u.senha = dados.senha; delete tentativasRecuperacao[chaveEmail(u.email)]; }
    if (mudou.length || trocouSenha) {
      registrarAuditoria(user, "Editou usuário", "Usuários", u.nome, antes,
        [...mudou.map((k) => `${CAMPOS_USUARIO[k]}: ${novo[k]}`), ...(trocouSenha ? ["Senha alterada"] : [])].join("\n"));
    }
    return usuarioPublico(u);
  },

  async desativar(id) {
    await wait();
    const user = usuarioAtual([ADMIN]);
    const u = db.usuarios.find((x) => x.id === id);
    if (!u) throw new ApiError(404, "Usuário não encontrado.");
    if (u.id === user.id) throw new ApiError(400, "Você não pode desativar o seu próprio cadastro.");
    u.ativo = false;
    registrarAuditoria(user, "Desativou usuário", "Usuários", u.nome, "Status: Ativo", "Status: Inativo");
    return usuarioPublico(u);
  },

  async reativar(id) {
    await wait();
    const user = usuarioAtual([ADMIN]);
    const u = db.usuarios.find((x) => x.id === id);
    if (!u) throw new ApiError(404, "Usuário não encontrado.");
    u.ativo = true;
    registrarAuditoria(user, "Reativou usuário", "Usuários", u.nome, "Status: Inativo", "Status: Ativo");
    return usuarioPublico(u);
  },
};

/* ---------- auditoria (só Administrador) ---------- */

const auditoria = {
  async listar({ setor = "", usuario = "", de = "", ate = "" } = {}) {
    await wait();
    usuarioAtual([ADMIN]);
    return clone(
      db.auditoria
        .filter((l) => (!setor || l.setor === setor) && (!usuario || l.usuario === usuario))
        .filter((l) => (!de || l.dataHora.slice(0, 10) >= de) && (!ate || l.dataHora.slice(0, 10) <= ate))
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
    );
  },
};

export const mockApi = { auth, dashboard, produtos, notasFiscais, saidas, usuarios, auditoria };
