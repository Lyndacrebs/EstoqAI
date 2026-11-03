const db = require('../database/db');
const { agora } = require('../utils/datas');

// "Atividade recente" do dashboard: frases curtas como "Papel A4 — entrada de 20 pct"
class AtividadeRepository {
  async registrar(tipo, texto, conexao = db) {
    await conexao.executar('INSERT INTO atividades (tipo, texto, data_hora) VALUES (?, ?, ?)', [tipo, texto, agora()]);
  }

  async recentes(limite = 6) {
    return db.buscarTodos('SELECT * FROM atividades ORDER BY data_hora DESC, id_atividades DESC LIMIT ?', [limite]);
  }
}

module.exports = new AtividadeRepository();
