const db = require('../database/db');

class MovimentacaoRepository {
  async criar({ tipo, id_lotes, quantidade, id_usuarios, descricao }) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Busca o lote atual para verificar o saldo
        db.get('SELECT quantidade_atual FROM lotes WHERE id_lotes = ?', [id_lotes], (err, lote) => {
          if (err || !lote) {
            db.run('ROLLBACK');
            return reject(err || new Error('Lote não encontrado.'));
          }

          let novaQuantidade = lote.quantidade_atual;

          if (tipo === 'ENTRADA') {
            novaQuantidade += quantidade;
          } else if (tipo === 'SAIDA') {
            if (lote.quantidade_atual < quantidade) {
              db.run('ROLLBACK');
              return reject(new Error('Saldo insuficiente no lote para esta saída.'));
            }
            novaQuantidade -= quantidade;
          }

          // 2. Atualiza a quantidade_atual no Lote
          db.run('UPDATE lotes SET quantidade_atual = ? WHERE id_lotes = ?', [novaQuantidade, id_lotes], function (errUpd) {
            if (errUpd) {
              db.run('ROLLBACK');
              return reject(errUpd);
            }

            // 3. Registra a Movimentação
            const sqlMov = `INSERT INTO movimentacoes (tipo, id_lotes, id_usuarios) VALUES (?, ?, ?)`;
            db.run(sqlMov, [tipo, id_lotes, id_usuarios], function (errMov) {
              if (errMov) {
                db.run('ROLLBACK');
                return reject(errMov);
              }

              const id_movimentacoes = this.lastID;

              // 4. Registra no Histórico de Auditoria
              const sqlHist = `
                INSERT INTO historico (entidade, id_entidade, acao, descricao, id_usuarios)
                VALUES (?, ?, ?, ?, ?)
              `;
              const descAudit = descricao || `Movimentação de ${tipo} de ${quantidade} unidade(s). Novo saldo: ${novaQuantidade}`;

              db.run(sqlHist, ['MOVIMENTACAO', id_movimentacoes, tipo, descAudit, id_usuarios], function (errHist) {
                if (errHist) {
                  db.run('ROLLBACK');
                  return reject(errHist);
                }

                db.run('COMMIT');
                resolve({ id_movimentacoes, tipo, id_lotes, novo_saldo: novaQuantidade, id_usuarios });
              });
            });
          });
        });
      });
    });
  }

  async listarTodas() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT m.id_movimentacoes, m.tipo, m.data_hora, l.codigo_interno AS lote_codigo, p.nome AS produto_nome, u.nome AS usuario_nome
        FROM movimentacoes m
        JOIN lotes l ON m.id_lotes = l.id_lotes
        JOIN produtos p ON l.id_produtos = p.id_produtos
        JOIN usuarios u ON m.id_usuarios = u.id_usuarios
        ORDER BY m.data_hora DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = new MovimentacaoRepository();