const db = require('../database/db');

class NotaFiscalRepository {
  // Criar uma Nota Fiscal completa juntamente com seus Itens
  async criar(notaData, itens) {
    return new Promise((resolve, reject) => {
      // Inicia transação para garantir consistência
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const sqlNota = `
          INSERT INTO notas_fiscais (numero, serie, chave_acesso, fornecedor, cnpj_fornecedor, data_emissao, arquivo, id_usuarios)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const paramsNota = [
          notaData.numero,
          notaData.serie || null,
          notaData.chave_acesso || null,
          notaData.fornecedor || null,
          notaData.cnpj_fornecedor || null,
          notaData.data_emissao || null,
          notaData.arquivo || null,
          notaData.id_usuarios
        ];

        db.run(sqlNota, paramsNota, function (err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const id_notas_fiscais = this.lastID;
          const sqlItem = `
            INSERT INTO itens_nota_fiscal (unidade, quantidade, descricao_original, id_produtos, id_notas_fiscais)
            VALUES (?, ?, ?, ?, ?)
          `;

          let erros = false;
          let itensInseridos = 0;

          if (!itens || itens.length === 0) {
            db.run('COMMIT');
            return resolve({ id_notas_fiscais, ...notaData, itens: [] });
          }

          itens.forEach((item) => {
            if (erros) return;

            db.run(
              sqlItem,
              [item.unidade, item.quantidade, item.descricao_original || null, item.id_produtos || null, id_notas_fiscais],
              function (errItem) {
                if (errItem) {
                  erros = true;
                  db.run('ROLLBACK');
                  return reject(errItem);
                }

                itensInseridos++;
                if (itensInseridos === itens.length) {
                  db.run('COMMIT');
                  resolve({ id_notas_fiscais, ...notaData, itens });
                }
              }
            );
          });
        });
      });
    });
  }

  // Listar todas as Notas Fiscais
  async listarTodas() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT nf.*, u.nome AS usuario_cadastro
        FROM notas_fiscais nf
        LEFT JOIN usuarios u ON nf.id_usuarios = u.id_usuarios
        ORDER BY nf.data_cadastro DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Buscar uma Nota Fiscal por ID com seus itens detalhados
  async buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const sqlNota = `SELECT * FROM notas_fiscais WHERE id_notas_fiscais = ?`;
      const sqlItens = `
        SELECT inf.*, p.nome AS produto_vinculado
        FROM itens_nota_fiscal inf
        LEFT JOIN produtos p ON inf.id_produtos = p.id_produtos
        WHERE inf.id_notas_fiscais = ?
      `;

      db.get(sqlNota, [id], (err, nota) => {
        if (err) return reject(err);
        if (!nota) return resolve(null);

        db.all(sqlItens, [id], (errItens, itens) => {
          if (errItens) return reject(errItens);
          resolve({ ...nota, itens });
        });
      });
    });
  }
}

module.exports = new NotaFiscalRepository();