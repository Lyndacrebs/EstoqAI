const db = require('../database/db');
const { hoje } = require('../utils/datas');

class ProdutoRepository {
  // Lista os produtos. status: "ativos" | "inativos" | "todos"
  // (a busca por nome é feita no controller, para ignorar acentos e maiúsculas)
  async listarTodos(status = 'ativos', conexao = db) {
    let filtro = '';
    if (status === 'ativos') filtro = 'WHERE ativo = 1';
    if (status === 'inativos') filtro = 'WHERE ativo = 0';
    return conexao.buscarTodos(`SELECT * FROM produtos ${filtro} ORDER BY nome COLLATE NOCASE`);
  }

  // Busca um produto específico pelo seu ID
  async buscarPorId(id, conexao = db) {
    return conexao.buscarUm('SELECT * FROM produtos WHERE id_produtos = ?', [id]);
  }

  // Busca pelo código de barras (usada na saída de estoque)
  async buscarPorCodigo(codigoBarras, conexao = db) {
    return conexao.buscarUm('SELECT * FROM produtos WHERE codigo_barras = ?', [codigoBarras]);
  }

  // Reserva o próximo código de barras. Formato: "20" + número de 8 dígitos (ex.: 2000000007).
  // Começar com 2 indica "uso interno" no padrão de código de barras. O número vem de um contador,
  // então nunca se repete. É reservado ANTES de o produto existir porque a etiqueta é impressa durante
  // a entrada da nota; se a entrada for abandonada, o número simplesmente não é usado (sem problema).
  async reservarCodigoBarras(conexao = db) {
    await conexao.executar(
      `INSERT INTO contadores (nome, valor) VALUES ('codigo_barras', 1)
       ON CONFLICT(nome) DO UPDATE SET valor = valor + 1`
    );
    const linha = await conexao.buscarUm("SELECT valor FROM contadores WHERE nome = 'codigo_barras'");
    return `20${String(linha.valor).padStart(8, '0')}`;
  }

  // Insere um novo produto. Só é chamado na finalização da entrada por NF (o sistema não tem cadastro avulso).
  // O código de barras já vem reservado (veja reservarCodigoBarras).
  async criar(produtoData, conexao = db) {
    const { nome, descricao, codigo_barras, categoria, unidade, quantidade, palavras_chave, limite_estoque_baixo } = produtoData;

    const resultado = await conexao.executar(
      `INSERT INTO produtos
         (nome, descricao, codigo_barras, categoria, unidade, quantidade, palavras_chave, limite_estoque_baixo, ativo, data_cadastro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [nome, descricao || '', codigo_barras, categoria, unidade, quantidade, palavras_chave || '', limite_estoque_baixo || 0, hoje()]
    );
    return this.buscarPorId(resultado.lastID, conexao);
  }

  // Atualiza os dados do produto. A quantidade NÃO é alterada aqui: ela só muda por entrada (NF),
  // saída ou ajuste manual (métodos abaixo).
  async atualizar(id, produtoData, conexao = db) {
    const { nome, descricao, categoria, unidade, palavras_chave, limite_estoque_baixo } = produtoData;
    const resultado = await conexao.executar(
      `UPDATE produtos
       SET nome = ?, descricao = ?, categoria = ?, unidade = ?, palavras_chave = ?, limite_estoque_baixo = ?
       WHERE id_produtos = ?`,
      [nome, descricao, categoria, unidade, palavras_chave, limite_estoque_baixo, id]
    );
    return { id_produtos: id, alteracoes: resultado.changes };
  }

  // Ajuste manual: coloca a quantidade exata (só o Administrador, com motivo)
  async definirQuantidade(id, quantidade, conexao = db) {
    await conexao.executar('UPDATE produtos SET quantidade = ? WHERE id_produtos = ?', [quantidade, id]);
  }

  // Entrada (delta positivo) ou saída (delta negativo). A tabela impede quantidade negativa.
  async somarQuantidade(id, delta, conexao = db) {
    await conexao.executar('UPDATE produtos SET quantidade = quantidade + ? WHERE id_produtos = ?', [delta, id]);
  }

  // Exclusão é sempre lógica: o produto continua no banco com ativo = 0 (e some das listas de ativos)
  async definirAtivo(id, ativo, conexao = db) {
    const resultado = await conexao.executar('UPDATE produtos SET ativo = ? WHERE id_produtos = ?', [ativo ? 1 : 0, id]);
    return { alteracoes: resultado.changes };
  }
}

module.exports = new ProdutoRepository();
