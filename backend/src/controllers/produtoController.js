const db = require('../database/db');
const produtoRepository = require('../repositories/produtoRepository');
const historicoRepository = require('../repositories/historicoRepository');
const serializar = require('../utils/serializadores');
const { lerId, formatarId } = require('../utils/identificadores');
const { normalizarTexto } = require('../utils/textos');
const { ErroNegocio, tratarErro } = require('../utils/erros');

// Nomes dos campos como aparecem na auditoria
const ROTULOS_PRODUTO = {
  nome: 'Nome',
  categoria: 'Categoria',
  unidade: 'Unidade de medida',
  descricao: 'Descrição',
  palavrasChave: 'Palavras-chave',
  limiteEstoqueBaixo: 'Limite de estoque baixo'
};

// Valor de um campo escrito para a auditoria (vazio vira "—"; lista de palavras vira texto)
function formatarCampo(campo, valor) {
  if (campo === 'palavrasChave') return valor.join(', ') || '—';
  return valor === '' || valor === null || valor === undefined ? '—' : String(valor);
}

// "EST-0001 — Papel A4": como o produto aparece na coluna "detalhes" da auditoria
const identificarProduto = (p) => `${formatarId('produto', p.id_produtos)} — ${p.nome}`;

// Busca o produto ou responde 404
async function obterProduto(idTexto, conexao) {
  const id = lerId('produto', idTexto);
  const produto = id && await produtoRepository.buscarPorId(id, conexao);
  if (!produto) throw new ErroNegocio(404, 'Produto não encontrado.');
  return produto;
}

// Listar produtos. Filtros: ?status=ativos|inativos|todos  e  ?busca= (por nome)
async function listarProdutos(req, res) {
  try {
    const status = ['ativos', 'inativos', 'todos'].includes(req.query.status) ? req.query.status : 'ativos';
    const busca = normalizarTexto(req.query.busca);

    const produtos = await produtoRepository.listarTodos(status);
    const filtrados = produtos.filter((p) => normalizarTexto(p.nome).includes(busca));

    res.json(filtrados.map(serializar.produto));
  } catch (error) {
    tratarErro(res, error, 'buscar produtos');
  }
}

// Buscar produto por ID
async function buscarProdutoPorId(req, res) {
  try {
    const produto = await obterProduto(req.params.id);
    res.json(serializar.produto(produto));
  } catch (error) {
    tratarErro(res, error, 'buscar o produto');
  }
}

// Leitura do código de barras na saída de estoque: só devolve produto ativo
async function buscarPorCodigo(req, res) {
  try {
    const produto = await produtoRepository.buscarPorCodigo(String(req.params.codigoBarras).trim());
    if (!produto) throw new ErroNegocio(404, 'Nenhum produto encontrado com este código.');
    if (produto.ativo === 0) throw new ErroNegocio(400, 'Este produto está inativo e não pode ter saída.');
    res.json(serializar.produto(produto));
  } catch (error) {
    tratarErro(res, error, 'buscar o produto pelo código');
  }
}

// Saída pelo nome: só produtos ativos
async function buscarAtivosPorNome(req, res) {
  try {
    const busca = normalizarTexto(req.query.nome);
    const produtos = await produtoRepository.listarTodos('ativos');
    res.json(produtos.filter((p) => normalizarTexto(p.nome).includes(busca)).map(serializar.produto));
  } catch (error) {
    tratarErro(res, error, 'buscar produtos pelo nome');
  }
}

// Atualizar produto (Admin e Operador).
// A quantidade NÃO pode ser alterada por aqui, nem pelo Administrador (existe o ajuste manual abaixo).
// Não existe "criar produto" avulso: produto novo só nasce na entrada por nota fiscal.
async function atualizarProduto(req, res) {
  try {
    const dados = req.body;

    const resultado = await db.transacao(async (tx) => {
      const atual = await obterProduto(req.params.id, tx);

      if (atual.ativo === 0) throw new ErroNegocio(400, 'Produto inativo: reative antes de editar.');
      if (dados.quantidade !== undefined && Number(dados.quantidade) !== atual.quantidade) {
        throw new ErroNegocio(400, 'A quantidade não é alterada pela edição do produto. Use o ajuste manual de quantidade.');
      }

      // Campos não enviados continuam como estão
      const valoresAtuais = {
        nome: atual.nome,
        categoria: atual.categoria,
        unidade: atual.unidade,
        descricao: atual.descricao || '',
        palavrasChave: serializar.listaDePalavras(atual.palavras_chave),
        limiteEstoqueBaixo: atual.limite_estoque_baixo
      };
      const palavras = dados.palavrasChave === undefined
        ? valoresAtuais.palavrasChave
        : (Array.isArray(dados.palavrasChave) ? dados.palavrasChave : String(dados.palavrasChave).split(','))
            .map((p) => String(p).trim()).filter(Boolean);

      const novo = {
        nome: String(dados.nome ?? atual.nome).trim(),
        categoria: String(dados.categoria ?? atual.categoria).trim(),
        unidade: String(dados.unidade ?? atual.unidade).trim(),
        descricao: String(dados.descricao ?? valoresAtuais.descricao).trim(),
        palavrasChave: palavras,
        limiteEstoqueBaixo: dados.limiteEstoqueBaixo === undefined ? atual.limite_estoque_baixo : Number(dados.limiteEstoqueBaixo)
      };

      if (!novo.nome) throw new ErroNegocio(400, 'O nome do produto é obrigatório.');
      if (!novo.unidade) throw new ErroNegocio(400, 'A unidade de medida é obrigatória.');
      if (!Number.isInteger(novo.limiteEstoqueBaixo) || novo.limiteEstoqueBaixo < 0) {
        throw new ErroNegocio(400, 'Informe um limite de estoque baixo válido (inteiro maior ou igual a zero).');
      }

      // Só campos que mudaram entram na auditoria
      const mudou = Object.keys(ROTULOS_PRODUTO)
        .filter((c) => formatarCampo(c, valoresAtuais[c]) !== formatarCampo(c, novo[c]));

      await produtoRepository.atualizar(atual.id_produtos, {
        nome: novo.nome,
        descricao: novo.descricao,
        categoria: novo.categoria,
        unidade: novo.unidade,
        palavras_chave: novo.palavrasChave.join(','),
        limite_estoque_baixo: novo.limiteEstoqueBaixo
      }, tx);

      if (mudou.length) {
        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: 'Editou produto',
          setor: 'Produtos',
          detalhes: `${formatarId('produto', atual.id_produtos)} — ${novo.nome}`,
          antes: mudou.map((c) => `${ROTULOS_PRODUTO[c]}: ${formatarCampo(c, valoresAtuais[c])}`).join('\n'),
          depois: mudou.map((c) => `${ROTULOS_PRODUTO[c]}: ${formatarCampo(c, novo[c])}`).join('\n')
        }, tx);
      }

      return produtoRepository.buscarPorId(atual.id_produtos, tx);
    });

    res.json(serializar.produto(resultado));
  } catch (error) {
    tratarErro(res, error, 'atualizar o produto');
  }
}

// Ajuste manual da quantidade (só Administrador).
// É a única forma de corrigir o estoque "na mão". Exige um motivo (mínimo 20 caracteres)
// e o antes/depois fica registrado na auditoria.
async function ajustarQuantidade(req, res) {
  try {
    const { quantidade, motivo } = req.body;

    const resultado = await db.transacao(async (tx) => {
      const produto = await obterProduto(req.params.id, tx);
      if (produto.ativo === 0) throw new ErroNegocio(400, 'Produto inativo: reative antes de editar.');

      const nova = Number(quantidade);
      if (quantidade === '' || quantidade === null || quantidade === undefined || !Number.isInteger(nova) || nova < 0) {
        throw new ErroNegocio(400, 'Informe uma quantidade inteira maior ou igual a zero.');
      }
      if (nova === produto.quantidade) throw new ErroNegocio(400, 'A nova quantidade é igual à atual.');

      const texto = String(motivo || '').trim();
      if (texto.length < 20) throw new ErroNegocio(400, 'Descreva o motivo com pelo menos 20 caracteres.');

      await produtoRepository.definirQuantidade(produto.id_produtos, nova, tx);
      await historicoRepository.registrar({
        id_usuarios: req.usuario.id_usuarios,
        acao: 'Alterou quantidade manualmente',
        setor: 'Produtos',
        detalhes: `${identificarProduto(produto)} — Motivo: ${texto}`,
        antes: `Quantidade: ${produto.quantidade} ${produto.unidade}`,
        depois: `Quantidade: ${nova} ${produto.unidade}`
      }, tx);

      return produtoRepository.buscarPorId(produto.id_produtos, tx);
    });

    res.json(serializar.produto(resultado));
  } catch (error) {
    tratarErro(res, error, 'ajustar a quantidade');
  }
}

// Desativar e reativar (exclusão lógica). Mesma estrutura, muda o valor e os textos.
async function alterarSituacao(req, res, ativar) {
  try {
    const resultado = await db.transacao(async (tx) => {
      const produto = await obterProduto(req.params.id, tx);

      // Só grava (e audita) se a situação realmente mudar
      if ((produto.ativo === 1) !== ativar) {
        await produtoRepository.definirAtivo(produto.id_produtos, ativar, tx);
        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: ativar ? 'Reativou produto' : 'Desativou produto',
          setor: 'Produtos',
          detalhes: identificarProduto(produto),
          antes: ativar ? 'Status: Inativo' : 'Status: Ativo',
          depois: ativar ? 'Status: Ativo' : 'Status: Inativo'
        }, tx);
      }
      return produtoRepository.buscarPorId(produto.id_produtos, tx);
    });

    res.json(serializar.produto(resultado));
  } catch (error) {
    tratarErro(res, error, ativar ? 'reativar o produto' : 'desativar o produto');
  }
}

const desativarProduto = (req, res) => alterarSituacao(req, res, false);
const reativarProduto = (req, res) => alterarSituacao(req, res, true);

module.exports = {
  listarProdutos, buscarProdutoPorId, buscarPorCodigo, buscarAtivosPorNome,
  atualizarProduto, ajustarQuantidade, desativarProduto, reativarProduto
};
