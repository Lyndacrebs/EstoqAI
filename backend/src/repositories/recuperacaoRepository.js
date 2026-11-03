const db = require('../database/db');

// Guarda as tentativas erradas de recuperação de senha e as chaves temporárias.
class RecuperacaoRepository {
  // Quantas vezes esse e-mail já errou os dados (0 se nunca errou)
  async contarTentativas(email, conexao = db) {
    const linha = await conexao.buscarUm('SELECT tentativas FROM tentativas_recuperacao WHERE email = ?', [email]);
    return linha ? linha.tentativas : 0;
  }

  // Soma 1 erro e devolve o total. O e-mail entra na tabela mesmo que não exista no sistema.
  async registrarErro(email, conexao = db) {
    await conexao.executar(
      `INSERT INTO tentativas_recuperacao (email, tentativas) VALUES (?, 1)
       ON CONFLICT(email) DO UPDATE SET tentativas = tentativas + 1`,
      [email]
    );
    return this.contarTentativas(email, conexao);
  }

  // Libera o e-mail (login correto, senha trocada pelo administrador ou recuperação concluída)
  async zerarTentativas(email, conexao = db) {
    await conexao.executar('DELETE FROM tentativas_recuperacao WHERE email = ?', [email]);
  }

  // Guarda a chave temporária que o frontend usa no passo 2 (nova senha)
  async criarChave(chave, idUsuario, expiraEm, conexao = db) {
    // Aproveita para apagar chaves antigas que já venceram
    await conexao.executar('DELETE FROM chaves_recuperacao WHERE expira_em < ?', [new Date().toISOString()]);
    await conexao.executar(
      'INSERT INTO chaves_recuperacao (chave, id_usuarios, expira_em) VALUES (?, ?, ?)',
      [chave, idUsuario, expiraEm]
    );
  }

  async buscarChave(chave, conexao = db) {
    return conexao.buscarUm('SELECT * FROM chaves_recuperacao WHERE chave = ?', [chave]);
  }

  // A chave vale uma única vez
  async apagarChave(chave, conexao = db) {
    await conexao.executar('DELETE FROM chaves_recuperacao WHERE chave = ?', [chave]);
  }
}

module.exports = new RecuperacaoRepository();
