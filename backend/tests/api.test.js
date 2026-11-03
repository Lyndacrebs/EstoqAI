// Testes automáticos da API (rodam com: npm test).
// Sobem o servidor com um banco TEMPORÁRIO e fazem as chamadas exatamente como o frontend faz.
// Cada teste segue um item do roteiro de aceitação do documento "O que falta no backend".
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'estoqai-'));
process.env.DB_PATH = path.join(pasta, 'teste.sqlite');
process.env.UPLOAD_DIR = path.join(pasta, 'uploads');
process.env.JWT_SECRET = 'segredo-de-teste';

const app = require('../src/app');
const db = require('../src/database/db');

let servidor;
let base;

test.before(async () => {
  await db.pronto;
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
test.after(() => { servidor.close(); });

// Chamada simples: devolve { status, corpo }
async function chamar(metodo, rota, { token, corpo, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (form) body = form;
  else if (corpo !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(corpo); }
  const res = await fetch(base + rota, { method: metodo, headers, body });
  const texto = await res.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* imagem ou vazio */ }
  return { status: res.status, corpo: json, bruto: texto, res };
}

async function entrar(email, senha) {
  const r = await chamar('POST', '/usuarios/login', { corpo: { email, senha } });
  assert.equal(r.status, 200, `login de ${email}: ${r.bruto}`);
  return r.corpo.token;
}

// Estado compartilhado entre os testes (eles rodam em ordem)
const e = {};

test('login: mensagens e usuário inativo bloqueado antes da senha', async () => {
  let r = await chamar('POST', '/usuarios/login', { corpo: { email: 'naoexiste@x.com', senha: 'x' } });
  assert.equal(r.status, 401);
  assert.equal(r.corpo.mensagem, 'E-mail ou senha incorretos.');

  r = await chamar('POST', '/usuarios/login', { corpo: { email: 'admin@estoqai.com', senha: 'errada' } });
  assert.equal(r.status, 401);

  r = await chamar('POST', '/usuarios/login', { corpo: { email: 'admin@estoqai.com', senha: 'admin123' } });
  assert.equal(r.status, 200);
  assert.ok(r.corpo.token);
  assert.deepEqual(Object.keys(r.corpo.usuario).sort(), ['ativo', 'dataNascimento', 'email', 'id', 'nome', 'perfil']);
  assert.equal(r.corpo.usuario.ativo, true);
  assert.equal(r.corpo.usuario.senha, undefined);
  e.admin = r.corpo.token;
  e.adminId = r.corpo.usuario.id;
});

test('sem token ou com token inválido: 401', async () => {
  assert.equal((await chamar('GET', '/produtos')).status, 401);
  assert.equal((await chamar('GET', '/produtos', { token: 'lixo' })).status, 401);
});

test('usuários: criar, e-mail repetido (409), editar, listar com filtros', async () => {
  const novo = (nome, email, perfil) => ({ nome, dataNascimento: '1995-05-05', email, senha: 'Senha@123', perfil });

  let r = await chamar('POST', '/usuarios', { token: e.admin, corpo: novo('Olivia Operadora', 'olivia@x.com', 'Operador') });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.perfil, 'Operador');
  e.operadorId = r.corpo.id;
  r = await chamar('POST', '/usuarios', { token: e.admin, corpo: novo('Vitor Visualizador', 'vitor@x.com', 'Visualizador') });
  assert.equal(r.status, 201);
  e.visualizadorId = r.corpo.id;
  r = await chamar('POST', '/usuarios', { token: e.admin, corpo: novo('Outro Admin', 'admin2@x.com', 'Administrador') });
  assert.equal(r.status, 201);

  r = await chamar('POST', '/usuarios', { token: e.admin, corpo: novo('Repetido', 'OLIVIA@x.com', 'Operador') });
  assert.equal(r.status, 409);
  assert.equal(r.corpo.mensagem, 'Já existe um usuário cadastrado com este e-mail.');

  r = await chamar('POST', '/usuarios', { token: e.admin, corpo: { nome: 'Sem email' } });
  assert.equal(r.status, 400);

  e.operador = await entrar('olivia@x.com', 'Senha@123');
  e.visualizador = await entrar('vitor@x.com', 'Senha@123');

  r = await chamar('PUT', `/usuarios/${e.operadorId}`, { token: e.admin, corpo: { nome: 'Olívia Operadora', dataNascimento: '1995-05-05', email: 'olivia@x.com', perfil: 'Operador' } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.nome, 'Olívia Operadora');

  r = await chamar('PUT', `/usuarios/${e.operadorId}`, { token: e.admin, corpo: { email: 'vitor@x.com' } });
  assert.equal(r.status, 409);

  r = await chamar('GET', '/usuarios?status=ativos&busca=olivia', { token: e.admin });
  assert.equal(r.corpo.length, 1, 'busca ignora acento e maiúscula');

  // operador e visualizador não acessam usuários
  assert.equal((await chamar('GET', '/usuarios', { token: e.operador })).status, 403);
  assert.equal((await chamar('GET', '/usuarios', { token: e.visualizador })).status, 403);
});

test('usuários: não desativa a si mesmo; desativado perde acesso na hora; reativar', async () => {
  let r = await chamar('PATCH', `/usuarios/${e.adminId}/desativar`, { token: e.admin });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.mensagem, 'Você não pode desativar o seu próprio cadastro.');

  r = await chamar('PATCH', `/usuarios/${e.visualizadorId}/desativar`, { token: e.admin });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.ativo, false);

  // o token do desativado ainda é válido, mas o acesso cai imediatamente
  r = await chamar('GET', '/usuarios/me', { token: e.visualizador });
  assert.equal(r.status, 403);
  assert.match(r.corpo.mensagem, /desativ/i);

  // login do desativado: 403 mesmo com senha errada (a situação é conferida antes da senha)
  r = await chamar('POST', '/usuarios/login', { corpo: { email: 'vitor@x.com', senha: 'qualquer' } });
  assert.equal(r.status, 403);

  // editar usuário inativo é recusado
  r = await chamar('PUT', `/usuarios/${e.visualizadorId}`, { token: e.admin, corpo: { nome: 'X' } });
  assert.equal(r.status, 400);

  r = await chamar('PATCH', `/usuarios/${e.visualizadorId}/reativar`, { token: e.admin });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.ativo, true);
  assert.equal((await chamar('GET', '/usuarios/me', { token: e.visualizador })).status, 200);
});

test('recuperação de senha: 3 tentativas, bloqueio, liberação por login e por administrador', async () => {
  const dados = { nome: 'Vitor Visualizador', dataNascimento: '1995-05-05', email: 'vitor@x.com', perfil: 'Visualizador' };
  const errado = { ...dados, dataNascimento: '2000-01-01' };

  let r = await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: errado });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.mensagem, 'Os dados informados não conferem. Você ainda tem 2 tentativas.');
  r = await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: errado });
  assert.equal(r.corpo.mensagem, 'Os dados informados não conferem. Você ainda tem 1 tentativa.');
  r = await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: errado });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.mensagem, 'Os dados informados não conferem. Procure um usuário administrador.');

  // bloqueado: mesmo com os dados certos
  r = await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: dados });
  assert.equal(r.status, 423);

  // login correto libera
  await entrar('vitor@x.com', 'Senha@123');
  r = await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: dados });
  assert.equal(r.status, 200);
  const chave = r.corpo.chaveRecuperacao;
  assert.ok(chave);

  r = await chamar('POST', '/usuarios/recuperar-senha/redefinir', { corpo: { chaveRecuperacao: chave, novaSenha: '' } });
  assert.equal(r.status, 400);
  r = await chamar('POST', '/usuarios/recuperar-senha/redefinir', { corpo: { chaveRecuperacao: chave, novaSenha: 'NovaSenha@1' } });
  assert.deepEqual(r.corpo, { ok: true });
  // a chave vale uma vez só
  r = await chamar('POST', '/usuarios/recuperar-senha/redefinir', { corpo: { chaveRecuperacao: chave, novaSenha: 'Outra@1' } });
  assert.equal(r.status, 400);
  await entrar('vitor@x.com', 'NovaSenha@1');

  // e-mail que não existe também conta tentativas (e a mensagem é igual)
  const fantasma = { ...dados, email: 'fantasma@x.com' };
  for (let i = 0; i < 3; i++) await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: fantasma });
  r = await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: fantasma });
  assert.equal(r.status, 423);

  // administrador libera trocando a senha do usuário bloqueado
  for (let i = 0; i < 3; i++) await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: errado });
  assert.equal((await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: dados })).status, 423);
  r = await chamar('PUT', `/usuarios/${e.visualizadorId}`, { token: e.admin, corpo: { senha: 'DoAdmin@1' } });
  assert.equal(r.status, 200);
  r = await chamar('POST', '/usuarios/recuperar-senha/verificar', { corpo: dados });
  assert.equal(r.status, 200);
  await entrar('vitor@x.com', 'DoAdmin@1');
});

// PNG de 1 pixel, só para ter uma "foto" para enviar
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const formFoto = (tipo = 'image/png', nome = 'nota.png') => {
  const f = new FormData();
  f.append('imagem', new Blob([PNG], { type: tipo }), nome);
  return f;
};

// Palavras-chave diferentes por produto (senão o vínculo automático ligaria itens ao produto errado)
const palavrasDoItem = (item) => (item.id === 1 ? ['papel', 'sulfite'] : [item.descricaoOriginal.split(' ')[0].toLowerCase()]);

test('NF: leitura, confirmação com produtos novos, estoque, código de barras e UMA linha de auditoria', async () => {
  // sem foto / tipo inválido
  let r = await chamar('POST', '/notas-fiscais/leitura', { token: e.operador });
  assert.equal(r.status, 400);
  r = await chamar('POST', '/notas-fiscais/leitura', { token: e.operador, form: formFoto('text/plain', 'x.txt') });
  assert.equal(r.status, 400);
  // visualizador não dá entrada
  assert.equal((await chamar('POST', '/notas-fiscais/leitura', { token: e.visualizador, form: formFoto() })).status, 403);

  r = await chamar('POST', '/notas-fiscais/leitura', { token: e.operador, form: formFoto() });
  assert.equal(r.status, 200);
  assert.match(r.corpo.leituraId, /^[a-f0-9]{24}$/);
  assert.match(r.corpo.nomeSugerido, /CNPJ 12\.345\.678\/0001-90/);
  assert.equal(r.corpo.itens.length, 4);
  assert.deepEqual(r.corpo.itens.map((i) => i.id), [1, 2, 3, 4]);
  assert.equal(r.corpo.itens[0].produtoVinculado, null, 'ainda não há produtos cadastrados');
  e.leitura1 = r.corpo;

  // validações da confirmação
  const itens = r.corpo.itens.map((i) => ({ id: i.id, produtoId: null, descricaoOriginal: i.descricaoOriginal, quantidade: i.quantidade, unidade: i.unidade, valorUnitario: i.valorUnitario }));
  const post = (corpo) => chamar('POST', '/notas-fiscais', { token: e.operador, corpo });
  assert.equal((await post({ leituraId: e.leitura1.leituraId, nome: '  ', itens })).status, 400);
  assert.equal((await post({ leituraId: e.leitura1.leituraId, nome: 'NF', itens: [] })).status, 400);
  assert.equal((await post({ leituraId: e.leitura1.leituraId, nome: 'NF', itens: [{ ...itens[0], quantidade: 0 }] })).status, 400);
  assert.equal((await post({ leituraId: e.leitura1.leituraId, nome: 'NF', itens: [{ ...itens[0], produtoId: 'EST-0999' }] })).status, 404);

  r = await post({ leituraId: e.leitura1.leituraId, nome: e.leitura1.nomeSugerido, itens });
  assert.equal(r.status, 201);
  assert.match(r.corpo.notaId, /^NF-\d{4}$/);
  assert.equal(r.corpo.produtosNovos.length, 4);
  e.nota1 = r.corpo.notaId;

  // a mesma foto não pode ser registrada duas vezes
  assert.equal((await post({ leituraId: e.leitura1.leituraId, nome: 'de novo', itens })).status, 409);

  // REGRA TUDO-OU-NADA: enquanto a nota não é finalizada, nada existe no sistema
  const nadaMudou = async () => {
    assert.equal((await chamar('GET', '/produtos?status=todos', { token: e.admin })).corpo.length, 0, 'nenhum produto criado');
    assert.equal((await chamar('GET', '/notas-fiscais', { token: e.admin })).corpo.length, 0, 'rascunho não aparece nas notas');
    assert.equal((await chamar('GET', `/notas-fiscais/${e.nota1}`, { token: e.admin })).status, 404);
    assert.equal((await chamar('GET', `/notas-fiscais/${e.nota1}/imagem`, { token: e.admin })).status, 404);
    assert.equal((await chamar('GET', '/auditoria?setor=Nova entrada (NF)', { token: e.admin })).corpo.length, 0, 'nada na auditoria');
    assert.equal((await chamar('GET', '/dashboard/resumo', { token: e.admin })).corpo.movimentacaoSemana[6].entradas, 0);
  };
  await nadaMudou();

  // produto novo: categoria obrigatória
  r = await chamar('POST', `/notas-fiscais/${e.nota1}/produtos-novos`, { token: e.operador, corpo: { item: { id: 1 }, categoria: '' } });
  assert.equal(r.status, 400);

  e.produtos = {};
  e.codigos = {};
  const cadastrar = (item) => chamar('POST', `/notas-fiscais/${e.nota1}/produtos-novos`, {
    token: e.operador,
    corpo: { item: { id: item.id, descricaoOriginal: 'IGNORADO', quantidade: 9999, unidade: 'xx' }, categoria: 'Escritório', limiteEstoqueBaixo: 5, descricao: 'Teste', palavrasChave: palavrasDoItem(item) }
  });
  // cadastra só 3 dos 4 produtos novos
  for (const item of itens.slice(0, 3)) {
    r = await cadastrar(item);
    assert.equal(r.status, 201, r.bruto);
    // nome, quantidade e unidade vêm da nota, não do que o navegador mandou
    assert.equal(r.corpo.nome, item.descricaoOriginal);
    assert.equal(r.corpo.quantidade, item.quantidade);
    assert.equal(r.corpo.unidade, item.unidade);
    assert.equal(r.corpo.id, null, 'o produto ainda não existe, só o código de barras foi reservado');
    assert.match(r.corpo.codigoBarras, /^20\d{8}$/);
    assert.deepEqual(r.corpo.palavrasChave, palavrasDoItem(item));
    e.codigos[item.id] = r.corpo.codigoBarras;
  }
  assert.equal(new Set(Object.values(e.codigos)).size, 3, 'códigos diferentes para cada produto');
  await nadaMudou();

  // chamar de novo para o mesmo item mantém o código (se a resposta se perder, o frontend pode repetir)
  r = await cadastrar(itens[0]);
  assert.equal(r.status, 201);
  assert.equal(r.corpo.codigoBarras, e.codigos[1]);

  // faltando um produto novo: a finalização é recusada e NADA é gravado
  r = await chamar('POST', `/notas-fiscais/${e.nota1}/finalizar`, { token: e.operador });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.mensagem, 'Cadastre todos os produtos novos da nota antes de finalizar.');
  await nadaMudou();

  r = await cadastrar(itens[3]);
  assert.equal(r.status, 201);
  e.codigos[4] = r.corpo.codigoBarras;
  await nadaMudou();

  // agora sim: tudo de uma vez
  r = await chamar('POST', `/notas-fiscais/${e.nota1}/finalizar`, { token: e.operador });
  assert.deepEqual(r.corpo, { ok: true });
  await chamar('POST', `/notas-fiscais/${e.nota1}/finalizar`, { token: e.operador }); // de novo: não duplica nada
  // depois de finalizada não se cadastra mais produto novo nela
  assert.equal((await cadastrar(itens[0])).status, 404);

  r = await chamar('GET', '/produtos?status=todos', { token: e.admin });
  assert.equal(r.corpo.length, 4, 'os 4 produtos foram criados juntos');
  for (const item of itens) {
    const p = r.corpo.find((x) => x.nome === item.descricaoOriginal);
    assert.equal(p.quantidade, item.quantidade);
    assert.equal(p.codigoBarras, e.codigos[item.id], 'o código da etiqueta é o do produto criado');
    assert.match(p.id, /^EST-\d{4}$/);
    e.produtos[item.id] = p;
  }
  assert.equal((await chamar('GET', '/notas-fiscais', { token: e.admin })).corpo.length, 1);

  r = await chamar('GET', '/auditoria?setor=Nova entrada (NF)', { token: e.admin });
  assert.equal(r.corpo.length, 1, 'uma única linha de auditoria para a NF');
  assert.equal(r.corpo[0].acao, 'Deu entrada por NF - "12.345.678/0001-90"');
  assert.equal(r.corpo[0].antes, '—');
  assert.match(r.corpo[0].depois, /PAPEL SULFITE A4 75G 500FL: 20 pct \(novo\)\nDETERGENTE INCOLOR 500ML: 30 un \(novo\)/);
  assert.equal(r.corpo[0].usuario, 'Olívia Operadora');
});

test('NF: segunda nota soma ao estoque dos produtos existentes (vínculo automático) e consulta', async () => {
  let r = await chamar('POST', '/notas-fiscais/leitura', { token: e.admin, form: formFoto() });
  const vinculados = r.corpo.itens.filter((i) => i.produtoVinculado);
  assert.equal(vinculados.length, 4, 'agora os 4 itens já existem como produtos');
  const itens = r.corpo.itens.slice(0, 2).map((i) => ({ id: i.id, produtoId: i.produtoVinculado.id, descricaoOriginal: i.descricaoOriginal, quantidade: 5, unidade: i.unidade, valorUnitario: i.valorUnitario }));
  // mesmo produto em duas linhas soma as duas
  itens.push({ ...itens[0], id: 9, quantidade: 3 });

  const estoque = async (id) => (await chamar('GET', `/produtos/${id}`, { token: e.admin })).corpo.quantidade;

  r = await chamar('POST', '/notas-fiscais', { token: e.admin, corpo: { leituraId: null, nome: 'Segunda NF — CNPJ 99.999.999/0001-99', itens } });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.produtosNovos.length, 0);
  e.nota2 = r.corpo.notaId;
  // só confirmou: o estoque continua igual até a finalização
  assert.equal(await estoque(e.produtos[1].id), 20);
  assert.equal(await estoque(e.produtos[2].id), 30);

  // um produto desativado entre a confirmação e a finalização: nada entra (nem os outros itens)
  await chamar('PATCH', `/produtos/${e.produtos[2].id}/desativar`, { token: e.admin });
  r = await chamar('POST', `/notas-fiscais/${e.nota2}/finalizar`, { token: e.admin });
  assert.equal(r.status, 400);
  assert.match(r.corpo.mensagem, /está inativo/);
  assert.equal(await estoque(e.produtos[1].id), 20, 'o item ativo também não foi somado');
  assert.equal((await chamar('GET', '/auditoria?setor=Nova entrada (NF)', { token: e.admin })).corpo.length, 1);
  await chamar('PATCH', `/produtos/${e.produtos[2].id}/reativar`, { token: e.admin });

  // um rascunho abandonado (nunca finalizado) não deixa rastro
  const abandonada = await chamar('POST', '/notas-fiscais', { token: e.admin, corpo: { nome: 'Abandonada', itens: [{ id: 1, produtoId: e.produtos[1].id, descricaoOriginal: 'x', quantidade: 100, unidade: 'pct' }] } });
  assert.equal(abandonada.status, 201);

  r = await chamar('POST', `/notas-fiscais/${e.nota2}/finalizar`, { token: e.admin });
  assert.deepEqual(r.corpo, { ok: true });
  assert.equal((await chamar('GET', '/notas-fiscais?busca=abandonada', { token: e.admin })).corpo.length, 0);

  r = await chamar('GET', `/produtos/${e.produtos[1].id}`, { token: e.admin });
  assert.equal(r.corpo.quantidade, 28, '20 + 5 + 3');
  r = await chamar('GET', `/produtos/${e.produtos[2].id}`, { token: e.admin });
  assert.equal(r.corpo.quantidade, 35);

  r = await chamar('GET', '/auditoria?setor=Nova entrada (NF)', { token: e.admin });
  assert.equal(r.corpo.length, 2);
  assert.equal(r.corpo[0].acao, 'Deu entrada por NF - "99.999.999/0001-99"');
  assert.equal(r.corpo[0].antes, 'PAPEL SULFITE A4 75G 500FL: 20 pct\nDETERGENTE INCOLOR 500ML: 30 un');
  assert.equal(r.corpo[0].depois, 'PAPEL SULFITE A4 75G 500FL: 28 pct\nDETERGENTE INCOLOR 500ML: 35 un');

  // consulta (todos os perfis)
  r = await chamar('GET', '/notas-fiscais?busca=segunda', { token: e.visualizador });
  assert.equal(r.corpo.length, 1);
  assert.deepEqual(Object.keys(r.corpo[0]).sort(), ['data', 'id', 'nome', 'quantidadeProdutos', 'usuarioResponsavel']);
  assert.equal(r.corpo[0].quantidadeProdutos, 3);
  r = await chamar('GET', '/notas-fiscais?de=2999-01-01', { token: e.visualizador });
  assert.equal(r.corpo.length, 0);
  r = await chamar('GET', `/notas-fiscais/${e.nota1}`, { token: e.visualizador });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.itens.length, 4);
  assert.equal(r.corpo.imagemUrl, `/notas-fiscais/${e.nota1}/imagem`);
  assert.deepEqual(Object.keys(r.corpo.itens[0]).sort(), ['nome', 'quantidade', 'unidade', 'valorUnitario']);
  assert.equal((await chamar('GET', '/notas-fiscais/NF-9999', { token: e.admin })).status, 404);

  // a foto exige login e é devolvida como imagem
  assert.equal((await chamar('GET', `/notas-fiscais/${e.nota1}/imagem`)).status, 401);
  r = await chamar('GET', `/notas-fiscais/${e.nota1}/imagem`, { token: e.visualizador });
  assert.equal(r.status, 200);
  assert.equal(r.res.headers.get('content-type'), 'image/png');
  // nota sem foto
  assert.equal((await chamar('GET', `/notas-fiscais/${e.nota2}/imagem`, { token: e.admin })).status, 404);
});

test('produtos: edição, quantidade protegida, ajuste manual, desativar/reativar, buscas', async () => {
  const p = e.produtos[1];

  let r = await chamar('PUT', `/produtos/${p.id}`, { token: e.operador, corpo: { nome: p.nome, quantidade: 999 } });
  assert.equal(r.status, 400);
  assert.match(r.corpo.mensagem, /ajuste manual/);
  // nem o administrador altera a quantidade pela edição
  r = await chamar('PUT', `/produtos/${p.id}`, { token: e.admin, corpo: { quantidade: 1 } });
  assert.equal(r.status, 400);
  // mandar a quantidade igual à atual não é problema
  r = await chamar('PUT', `/produtos/${p.id}`, { token: e.operador, corpo: { nome: 'Papel Sulfite A4', categoria: 'Papelaria', unidade: 'pct', descricao: '', palavrasChave: ['papel', 'a4'], limiteEstoqueBaixo: 10, quantidade: 28 } });
  assert.equal(r.status, 200, r.bruto);
  assert.equal(r.corpo.nome, 'Papel Sulfite A4');
  assert.equal(r.corpo.limiteEstoqueBaixo, 10);
  assert.equal((await chamar('PUT', `/produtos/${p.id}`, { token: e.operador, corpo: { nome: '  ' } })).status, 400);
  assert.equal((await chamar('PUT', `/produtos/${p.id}`, { token: e.visualizador, corpo: { nome: 'X' } })).status, 403);

  r = await chamar('GET', '/auditoria?setor=Produtos', { token: e.admin });
  assert.equal(r.corpo[0].acao, 'Editou produto');
  assert.equal(r.corpo[0].antes, 'Nome: PAPEL SULFITE A4 75G 500FL\nCategoria: Escritório\nDescrição: Teste\nPalavras-chave: papel, sulfite\nLimite de estoque baixo: 5');
  // edição sem mudança não gera auditoria
  const antes = (await chamar('GET', '/auditoria', { token: e.admin })).corpo.length;
  await chamar('PUT', `/produtos/${p.id}`, { token: e.operador, corpo: { nome: 'Papel Sulfite A4' } });
  assert.equal((await chamar('GET', '/auditoria', { token: e.admin })).corpo.length, antes);

  // ajuste manual: só administrador, inteiro >= 0, diferente da atual, motivo >= 20
  const ajustar = (token, corpo) => chamar('PATCH', `/produtos/${p.id}/quantidade`, { token, corpo });
  assert.equal((await ajustar(e.operador, { quantidade: 10, motivo: 'x'.repeat(25) })).status, 403);
  assert.equal((await ajustar(e.admin, { quantidade: -1, motivo: 'x'.repeat(25) })).status, 400);
  assert.equal((await ajustar(e.admin, { quantidade: 1.5, motivo: 'x'.repeat(25) })).status, 400);
  assert.equal((await ajustar(e.admin, { quantidade: 28, motivo: 'x'.repeat(25) })).status, 400);
  r = await ajustar(e.admin, { quantidade: 10, motivo: 'x'.repeat(19) });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.mensagem, 'Descreva o motivo com pelo menos 20 caracteres.');
  r = await ajustar(e.admin, { quantidade: 10, motivo: 'Contagem física na prateleira' });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.quantidade, 10);
  r = await chamar('GET', '/auditoria?setor=Produtos', { token: e.admin });
  assert.equal(r.corpo[0].acao, 'Alterou quantidade manualmente');
  assert.match(r.corpo[0].detalhes, /Motivo: Contagem física na prateleira$/);
  assert.equal(r.corpo[0].antes, 'Quantidade: 28 pct');
  assert.equal(r.corpo[0].depois, 'Quantidade: 10 pct');

  // buscas por código e por nome
  r = await chamar('GET', `/produtos/codigo/${p.codigoBarras}`, { token: e.operador });
  assert.equal(r.corpo.id, p.id);
  assert.equal((await chamar('GET', '/produtos/codigo/0000', { token: e.operador })).status, 404);
  r = await chamar('GET', '/produtos/ativos/busca?nome=papél', { token: e.operador });
  assert.equal(r.corpo.length, 1);

  // desativar: sai da lista de ativos, entra em inativos, não pode ser editado nem ter saída/código
  r = await chamar('PATCH', `/produtos/${p.id}/desativar`, { token: e.operador });
  assert.equal(r.corpo.ativo, false);
  assert.equal((await chamar('GET', '/produtos?status=ativos&busca=papel', { token: e.admin })).corpo.length, 0);
  assert.equal((await chamar('GET', '/produtos?status=inativos', { token: e.admin })).corpo.length, 1);
  assert.equal((await chamar('GET', '/produtos?status=todos', { token: e.admin })).corpo.length, 4);
  assert.equal((await chamar('GET', '/produtos/ativos/busca?nome=papel', { token: e.operador })).corpo.length, 0);
  r = await chamar('GET', `/produtos/codigo/${p.codigoBarras}`, { token: e.operador });
  assert.equal(r.status, 400);
  assert.equal((await chamar('PUT', `/produtos/${p.id}`, { token: e.operador, corpo: { nome: 'Y' } })).status, 400);
  assert.equal((await ajustar(e.admin, { quantidade: 3, motivo: 'x'.repeat(25) })).status, 400);
  r = await chamar('POST', '/saidas', { token: e.operador, corpo: { itens: [{ produtoId: p.id, quantidade: 1 }] } });
  assert.equal(r.status, 400);

  r = await chamar('PATCH', `/produtos/${p.id}/reativar`, { token: e.operador });
  assert.equal(r.corpo.ativo, true);

  // não existe cadastro avulso nem exclusão física
  assert.equal((await chamar('POST', '/produtos', { token: e.admin, corpo: { nome: 'X', unidade: 'un' } })).status, 404);
  assert.equal((await chamar('DELETE', `/produtos/${p.id}`, { token: e.admin })).status, 404);
});

test('saídas: registrar, limite de estoque, alerta, editar/excluir só administrador', async () => {
  const [papel, detergente] = [e.produtos[1], e.produtos[2]]; // papel: 10 pct, limite 10 | detergente: 35 un, limite 5
  const registrar = (token, corpo) => chamar('POST', '/saidas', { token, corpo });

  assert.equal((await registrar(e.visualizador, { itens: [{ produtoId: papel.id, quantidade: 1 }] })).status, 403);
  assert.equal((await registrar(e.operador, { itens: [] })).status, 400);
  assert.equal((await registrar(e.operador, { itens: [{ produtoId: 'EST-0999', quantidade: 1 }] })).status, 400);
  assert.equal((await registrar(e.operador, { itens: [{ produtoId: papel.id, quantidade: 0 }] })).status, 400);
  assert.equal((await registrar(e.operador, { itens: [{ produtoId: papel.id, quantidade: 1.5 }] })).status, 400);

  // mais que o estoque: nada é baixado (nem do outro produto)
  let r = await registrar(e.operador, { itens: [{ produtoId: detergente.id, quantidade: 5 }, { produtoId: papel.id, quantidade: 11 }] });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.mensagem, 'Quantidade maior que o disponível em estoque para "Papel Sulfite A4" (10 pct).');
  assert.equal((await chamar('GET', `/produtos/${detergente.id}`, { token: e.admin })).corpo.quantidade, 35);
  // linhas repetidas do mesmo produto somam: 6 + 6 > 10
  r = await registrar(e.operador, { itens: [{ produtoId: papel.id, quantidade: 6 }, { produtoId: papel.id, quantidade: 6 }] });
  assert.equal(r.status, 400);

  r = await registrar(e.operador, { itens: [{ produtoId: detergente.id, quantidade: 5 }, { produtoId: papel.id, quantidade: 4 }], descricao: 'Uso na copa' });
  assert.equal(r.status, 201);
  assert.match(r.corpo.id, /^SAI-\d{4}$/);
  assert.deepEqual(r.corpo.alertasEstoqueMinimo, ['Papel Sulfite A4'], 'papel ficou com 6, abaixo do limite 10');
  e.saida = r.corpo.id;
  assert.equal((await chamar('GET', `/produtos/${papel.id}`, { token: e.admin })).corpo.quantidade, 6);

  r = await chamar('GET', '/saidas', { token: e.visualizador });
  assert.equal(r.corpo.length, 1);
  assert.deepEqual(Object.keys(r.corpo[0]).sort(), ['data', 'id', 'quantidadeProdutos', 'usuarioResponsavel']);
  assert.equal((await chamar('GET', '/saidas?busca=olivia', { token: e.visualizador })).corpo.length, 1);
  assert.equal((await chamar('GET', `/saidas?busca=${e.saida}`, { token: e.visualizador })).corpo.length, 1);
  assert.equal((await chamar('GET', '/saidas?busca=zzz', { token: e.visualizador })).corpo.length, 0);
  r = await chamar('GET', `/saidas/${e.saida}`, { token: e.visualizador });
  assert.equal(r.corpo.descricao, 'Uso na copa');
  assert.deepEqual(r.corpo.itens.map((i) => [i.produtoId, i.nome, i.quantidade, i.unidade]),
    [[detergente.id, 'DETERGENTE INCOLOR 500ML', 5, 'un'], [papel.id, 'Papel Sulfite A4', 4, 'pct']]);

  // editar e excluir: só administrador
  const novos = { itens: [{ produtoId: detergente.id, quantidade: 2 }, { produtoId: papel.id, quantidade: 6 }], descricao: 'Corrigida' };
  assert.equal((await chamar('PUT', `/saidas/${e.saida}`, { token: e.operador, corpo: novos })).status, 403);
  assert.equal((await chamar('DELETE', `/saidas/${e.saida}`, { token: e.operador })).status, 403);
  assert.equal((await chamar('PUT', `/saidas/${e.saida}`, { token: e.admin, corpo: { itens: [] } })).status, 400);
  // papel: tinha 6 em estoque + 4 da saída = 10 disponíveis; pedir 11 falha
  r = await chamar('PUT', `/saidas/${e.saida}`, { token: e.admin, corpo: { itens: [{ produtoId: papel.id, quantidade: 11 }] } });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.mensagem, 'Estoque insuficiente para "Papel Sulfite A4".');

  r = await chamar('PUT', `/saidas/${e.saida}`, { token: e.admin, corpo: novos });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.descricao, 'Corrigida');
  assert.equal((await chamar('GET', `/produtos/${papel.id}`, { token: e.admin })).corpo.quantidade, 4, '10 - 6');
  assert.equal((await chamar('GET', `/produtos/${detergente.id}`, { token: e.admin })).corpo.quantidade, 33, '35 - 2');

  r = await chamar('DELETE', `/saidas/${e.saida}`, { token: e.admin });
  assert.deepEqual(r.corpo, { ok: true });
  assert.equal((await chamar('GET', `/produtos/${papel.id}`, { token: e.admin })).corpo.quantidade, 10);
  assert.equal((await chamar('GET', `/produtos/${detergente.id}`, { token: e.admin })).corpo.quantidade, 35);
  assert.equal((await chamar('GET', `/saidas/${e.saida}`, { token: e.admin })).status, 404);

  r = await chamar('GET', '/auditoria?setor=Saídas', { token: e.admin });
  assert.deepEqual(r.corpo.map((l) => l.acao), ['Excluiu saída', 'Alterou saída']);
  assert.equal(r.corpo[0].depois, 'Saída excluída — quantidades devolvidas ao estoque');
  r = await chamar('GET', '/auditoria?setor=Saída de estoque', { token: e.admin });
  assert.equal(r.corpo[0].acao, 'Registrou saída de estoque');
  assert.equal(r.corpo[0].antes, 'DETERGENTE INCOLOR 500ML: 35 un\nPapel Sulfite A4: 10 pct');
  assert.equal(r.corpo[0].depois, 'DETERGENTE INCOLOR 500ML: 30 un\nPapel Sulfite A4: 6 pct');
});

test('dashboard e auditoria: formato, permissões e filtros', async () => {
  let r = await chamar('GET', '/dashboard/resumo', { token: e.visualizador });
  assert.equal(r.status, 200);
  const d = r.corpo;
  assert.equal(d.produtosAtivos, 4);
  assert.equal(d.novosNaSemana, 4);
  assert.equal(d.movimentacaoSemana.length, 7);
  assert.deepEqual(Object.keys(d.movimentacaoSemana[6]).sort(), ['dia', 'entradas', 'saidas']);
  // hoje: entradas = 66 (NF1) + 13 (NF2) ; saídas = itens das saídas atuais (a saída foi excluída)
  assert.equal(d.movimentacaoSemana[6].entradas, 66 + 13);
  assert.equal(d.movimentacaoSemana[6].saidas, 0);
  // papel ficou com 10 (limite 10) -> estoque baixo
  assert.deepEqual(d.estoqueBaixo.map((p) => [p.nome, p.quantidade, p.limite]), [['Papel Sulfite A4', 10, 10]]);
  assert.equal(d.produtosEstoqueBaixo, d.estoqueBaixo.length);
  assert.ok(d.atividadeRecente.length > 0 && d.atividadeRecente.length <= 6);
  assert.deepEqual(Object.keys(d.atividadeRecente[0]).sort(), ['quando', 'texto', 'tipo']);
  assert.ok(['entrada', 'saida'].includes(d.atividadeRecente[0].tipo));

  assert.equal((await chamar('GET', '/dashboard/resumo')).status, 401);

  // auditoria só para administrador
  assert.equal((await chamar('GET', '/auditoria', { token: e.operador })).status, 403);
  assert.equal((await chamar('GET', '/auditoria', { token: e.visualizador })).status, 403);
  r = await chamar('GET', '/auditoria', { token: e.admin });
  assert.deepEqual(Object.keys(r.corpo[0]).sort(), ['acao', 'antes', 'dataHora', 'depois', 'detalhes', 'id', 'setor', 'usuario']);
  assert.match(r.corpo[0].dataHora, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.match(r.corpo[0].id, /^LOG-\d{4}$/);
  const setores = new Set(r.corpo.map((l) => l.setor));
  for (const s of setores) assert.ok(['Nova entrada (NF)', 'Saída de estoque', 'Produtos', 'Saídas', 'Usuários'].includes(s), s);
  // login e consultas não entram na auditoria
  assert.ok(!r.corpo.some((l) => /login/i.test(l.acao)));
  assert.equal((await chamar('GET', '/auditoria?usuario=Administrador Inicial', { token: e.admin })).corpo.every((l) => l.usuario === 'Administrador Inicial'), true);
  assert.equal((await chamar('GET', '/auditoria?de=2999-01-01', { token: e.admin })).corpo.length, 0);
  assert.ok((await chamar('GET', '/auditoria?ate=2999-01-01&setor=Usuários', { token: e.admin })).corpo.length >= 4);
});

test('rascunhos abandonados há mais de 24 horas são apagados (com a foto)', async () => {
  const fotoAntes = fs.readdirSync(process.env.UPLOAD_DIR).length;
  let r = await chamar('POST', '/notas-fiscais/leitura', { token: e.admin, form: formFoto() });
  const leitura = r.corpo;
  r = await chamar('POST', '/notas-fiscais', { token: e.admin, corpo: { leituraId: leitura.leituraId, nome: 'Velha', itens: [{ id: 1, descricaoOriginal: 'X', quantidade: 1, unidade: 'un' }] } });
  assert.equal(r.status, 201);
  // faz de conta que ela foi começada há 2 dias
  await db.executar("UPDATE notas_fiscais SET data_cadastro = '2000-01-01 10:00:00' WHERE nome = 'Velha'");
  // a próxima entrada iniciada faz a limpeza
  r = await chamar('POST', '/notas-fiscais', { token: e.admin, corpo: { nome: 'Nova', itens: [{ id: 1, descricaoOriginal: 'Y', quantidade: 1, unidade: 'un' }] } });
  assert.equal(r.status, 201);
  assert.equal((await db.buscarUm("SELECT COUNT(*) AS n FROM notas_fiscais WHERE nome = 'Velha'")).n, 0);
  await new Promise((ok) => setTimeout(ok, 200)); // a foto é apagada em segundo plano
  assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, fotoAntes, 'a foto da nota velha foi removida do disco');
});

test('concorrência: duas saídas ao mesmo tempo não deixam o estoque negativo', async () => {
  const papel = e.produtos[1]; // 10 pct em estoque
  const pedido = () => chamar('POST', '/saidas', { token: e.operador, corpo: { itens: [{ produtoId: papel.id, quantidade: 6 }] } });
  const [a, b] = await Promise.all([pedido(), pedido()]);
  assert.deepEqual([a.status, b.status].sort(), [201, 400], 'uma passa, a outra é recusada por falta de estoque');
  assert.equal((await chamar('GET', `/produtos/${papel.id}`, { token: e.admin })).corpo.quantidade, 4);
});

test('erros: rota inexistente e JSON quebrado respondem { mensagem }', async () => {
  let r = await chamar('GET', '/nao-existe', { token: e.admin });
  assert.equal(r.status, 404);
  assert.ok(r.corpo.mensagem);
  const res = await fetch(base + '/usuarios/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
  assert.equal(res.status, 400);
  assert.ok((await res.json()).mensagem);
});
