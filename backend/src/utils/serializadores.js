// "Serializadores": convertem uma linha do banco (snake_case, id numérico) no formato que o frontend
// espera (camelCase, id com prefixo). Assim o banco pode continuar com os nomes originais.
const { formatarId } = require('./identificadores');
const { semSegundos, soData } = require('./datas');

function usuario(u) {
  return {
    id: formatarId('usuario', u.id_usuarios),
    nome: u.nome,
    email: u.email,
    dataNascimento: u.data_nascimento || '',
    perfil: u.perfil,
    ativo: u.ativo === 1 // vira true/false. A senha nunca é incluída.
  };
}

// As palavras-chave ficam no banco como "papel,sulfite,a4" e vão para o frontend como lista
function listaDePalavras(texto) {
  return String(texto || '').split(',').map((p) => p.trim()).filter(Boolean);
}

function produto(p) {
  return {
    id: formatarId('produto', p.id_produtos),
    codigoBarras: p.codigo_barras,
    nome: p.nome,
    categoria: p.categoria || '',
    quantidade: p.quantidade,
    unidade: p.unidade,
    descricao: p.descricao || '',
    palavrasChave: listaDePalavras(p.palavras_chave),
    limiteEstoqueBaixo: p.limite_estoque_baixo,
    ativo: p.ativo === 1,
    dataCadastro: soData(p.data_cadastro)
  };
}

function notaResumo(n) {
  return {
    id: formatarId('nota', n.id_notas_fiscais),
    nome: n.nome,
    data: soData(n.data_cadastro),
    usuarioResponsavel: n.usuario_nome || '',
    quantidadeProdutos: n.total_itens || 0
  };
}

function notaDetalhe(n, itens) {
  return {
    ...notaResumo({ ...n, total_itens: itens.length }),
    // Caminho relativo à base da API: o frontend monta  <VITE_API_URL> + imagemUrl  e envia o token
    imagemUrl: n.arquivo ? `/notas-fiscais/${formatarId('nota', n.id_notas_fiscais)}/imagem` : null,
    itens: itens.map((i) => ({
      // Se o item já virou produto, mostra o nome do produto; senão, o texto original da nota
      nome: i.produto_nome || i.descricao_original,
      quantidade: i.quantidade,
      unidade: i.unidade,
      valorUnitario: i.valor_unitario
    }))
  };
}

function saidaResumo(s) {
  return {
    id: formatarId('saida', s.id_saidas),
    data: soData(s.data_cadastro),
    usuarioResponsavel: s.usuario_nome || '',
    quantidadeProdutos: s.total_itens || 0
  };
}

function saidaDetalhe(s, itens) {
  return {
    ...saidaResumo({ ...s, total_itens: itens.length }),
    descricao: s.descricao || '',
    itens: itens.map((i) => ({
      produtoId: formatarId('produto', i.id_produtos),
      nome: i.produto_nome,
      quantidade: i.quantidade,
      unidade: i.unidade
    }))
  };
}

function auditoria(h) {
  return {
    id: formatarId('log', h.id_historico),
    dataHora: semSegundos(h.data_hora),
    usuario: h.usuario_nome || '',
    acao: h.acao,
    setor: h.setor,
    detalhes: h.detalhes || '',
    antes: h.antes || '—',
    depois: h.depois || '—'
  };
}

module.exports = { usuario, produto, notaResumo, notaDetalhe, saidaResumo, saidaDetalhe, auditoria, listaDePalavras };
