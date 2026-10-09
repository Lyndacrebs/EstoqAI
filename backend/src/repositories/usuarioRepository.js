const db = require('../database/db');

function buscarPorEmail(email){
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM usuarios WHERE email = ?';
    db.get(sql, [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function buscarPorId(id){
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id_usuarios, nome, email, data_nascimento, perfil, ativo, data_cadastro FROM usuarios WHERE id_usuarios = ?';
    db.get(sql, [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function listarTodos(){
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id_usuarios, nome, email, data_nascimento, perfil, ativo, data_cadastro FROM usuarios';
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function criar(usuario){
  return new Promise((resolve, reject) => {
    const { nome, email, senha, data_nascimento, perfil } = usuario;
    const sql = `
      INSERT INTO usuarios (nome, email, senha, data_nascimento, perfil, ativo)
      VALUES (?, ?, ?, ?, ?, 1)
    `;
    db.run(sql, [nome, email, senha, data_nascimento, perfil], function (err){
      if (err) return reject(err);
      resolve({ id_usuarios: this.lastID, nome, email, perfil, ativo: 1 });
    });
  });
}

function atualizar(id, usuario){
  return new Promise((resolve, reject) => {
    const { nome, email, data_nascimento, perfil, senha } = usuario;

    let sql = 'UPDATE usuarios SET nome = ?, email = ?, data_nascimento = ?, perfil = ? WHERE id_usuarios = ?';
    let params = [nome, email, data_nascimento, perfil, id];

    if (senha) {
      sql = 'UPDATE usuarios SET nome = ?, email = ?, data_nascimento = ?, perfil = ?, senha = ? WHERE id_usuarios = ?';
      params = [nome, email, data_nascimento, perfil, senha, id];
    }

    db.run(sql, params, function (err){
      if (err) return reject(err);
      resolve({ alteracoes: this.changes });
    });
  });
}

function desativar(id){
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE usuarios SET ativo = 0 WHERE id_usuarios = ?';
    db.run(sql, [id], function (err){
      if (err) return reject(err);
      resolve({ alteracoes: this.changes });
    });
  });
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  listarTodos,
  criar,
  atualizar,
  desativar
};