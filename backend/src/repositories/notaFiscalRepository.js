const db = require('../database/db');
const { agora, horasAtras } = require('../utils/datas');

class NotaFiscalRepository {
  // Criar uma Nota Fiscal completa juntamente com seus Itens, como RASCUNHO (finalizada = 0).
  // Nada é somado ao estoque aqui: isso só acontece em finalizar(), tudo de uma vez.
  async criar(notaData, itens, conexao = db) {
    const resultado = await conexao.executar(
      `INSERT INTO notas_fiscais
         (nome, fornecedor, cnpj_fornecedor, arquivo, data_cadastro, id_usuarios)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        notaData.nome,
        notaData.fornecedor || null,
        notaData.cnpj_fornecedor || null,
        notaData.arquivo || null,
        agora(),
        notaData.id_usuarios
      ]
    );

    const id_notas_fiscais = resultado.lastID;

    for (const item of itens) {
      await conexao.executar(
        `INSERT INTO itens_nota_fiscal
           (id_item_leitura, unidade, quantidade, descricao_original, valor_unitario, id_produtos, id_notas_fiscais)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.id_item_leitura, item.unidade, item.quantidade, item.descricao_original, item.valor_unitario || 0, item.id_produtos || null, id_notas_fiscais]
      );
    }

    return { id_notas_fiscais };
  }

  // Listar as Notas Fiscais JÁ FINALIZADAS (rascunhos não aparecem). A busca por nome e as datas são aplicadas no controller.
  async listarTodas(conexao = db) {
    return conexao.buscarTodos(
      `SELECT nf.*, u.nome AS usuario_nome,
              (SELECT COUNT(*) FROM itens_nota_fiscal i WHERE i.id_notas_fiscais = nf.id_notas_fiscais) AS total_itens
       FROM notas_fiscais nf
       LEFT JOIN usuarios u ON nf.id_usuarios = u.id_usuarios
       WHERE nf.finalizada = 1
       ORDER BY nf.data_cadastro DESC, nf.id_notas_fiscais DESC`
    );
  }

  // Buscar uma Nota Fiscal por ID com seus itens detalhados
  async buscarPorId(id, conexao = db) {
    const nota = await conexao.buscarUm(
      `SELECT nf.*, u.nome AS usuario_nome
       FROM notas_fiscais nf
       LEFT JOIN usuarios u ON nf.id_usuarios = u.id_usuarios
       WHERE nf.id_notas_fiscais = ?`,
      [id]
    );
    if (!nota) return null;

    const itens = await conexao.buscarTodos(
      `SELECT inf.*, p.nome AS produto_nome
       FROM itens_nota_fiscal inf
       LEFT JOIN produtos p ON inf.id_produtos = p.id_produtos
       WHERE inf.id_notas_fiscais = ?
       ORDER BY inf.id_itens_nota_fiscal`,
      [id]
    );
    return { ...nota, itens };
  }

  // Item da nota que o frontend identifica pelo número da leitura (1, 2, 3...)
  async buscarItemPorLeitura(idNota, idItemLeitura, conexao = db) {
    return conexao.buscarUm(
      'SELECT * FROM itens_nota_fiscal WHERE id_notas_fiscais = ? AND id_item_leitura = ?',
      [idNota, idItemLeitura]
    );
  }

  // Guarda os dados do produto novo preenchidos pelo usuário (e o código de barras reservado).
  // O produto ainda NÃO existe: ele só é criado na finalização.
  async guardarProdutoNovo(idItem, dados, conexao = db) {
    await conexao.executar(
      `UPDATE itens_nota_fiscal
       SET novo_codigo_barras = ?, novo_categoria = ?, novo_descricao = ?, novo_palavras_chave = ?, novo_limite_estoque_baixo = ?
       WHERE id_itens_nota_fiscal = ?`,
      [dados.codigo_barras, dados.categoria, dados.descricao, dados.palavras_chave, dados.limite_estoque_baixo, idItem]
    );
  }

  // Liga o item da nota ao produto que acabou de ser criado a partir dele
  async vincularProduto(idItem, idProduto, conexao = db) {
    await conexao.executar('UPDATE itens_nota_fiscal SET id_produtos = ? WHERE id_itens_nota_fiscal = ?', [idProduto, idItem]);
  }

  // Marca a entrada como concluída. A data oficial da nota passa a ser a da finalização.
  async marcarFinalizada(idNota, conexao = db) {
    await conexao.executar('UPDATE notas_fiscais SET finalizada = 1, data_cadastro = ? WHERE id_notas_fiscais = ?', [agora(), idNota]);
  }

  // Apaga rascunhos abandonados (entrada começada e nunca finalizada) com mais de 24 horas.
  // Devolve os nomes dos arquivos de foto para o controller apagar do disco.
  async removerRascunhosAntigos(conexao = db) {
    const antigos = await conexao.buscarTodos(
      'SELECT id_notas_fiscais, arquivo FROM notas_fiscais WHERE finalizada = 0 AND data_cadastro < ?',
      [horasAtras(24)]
    );
    for (const nota of antigos) {
      await conexao.executar('DELETE FROM notas_fiscais WHERE id_notas_fiscais = ?', [nota.id_notas_fiscais]);
    }
    return antigos.map((n) => n.arquivo).filter(Boolean);
  }
}

module.exports = new NotaFiscalRepository();
