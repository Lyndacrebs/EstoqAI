const db = require('../database/db');
const saidaRepository = require('../repositories/saidaRepository');
const produtoRepository = require('../repositories/produtoRepository');
const historicoRepository = require('../repositories/historicoRepository');
const atividadeRepository = require('../repositories/atividadeRepository');
const serializar = require('../utils/serializadores');
const { lerId, formatarId } = require('../utils/identificadores');
const { normalizarTexto, linhaEstoque } = require('../utils/textos');
const { soData } = require('../utils/datas');
const { ErroNegocio, tratarErro } = require('../utils/erros');

// Junta linhas repetidas do mesmo produto (ex.: 2 linhas do mesmo item na tela) numa só, somando.
// Assim a conferência de estoque considera o total pedido de cada produto.
// Devolve [{ id_produtos, quantidade }] na ordem em que os produtos apareceram.
function agruparItens(itens) {
  const porProduto = new Map();
  for (const item of itens) {
    const id = lerId('produto', item.produtoId);
    // Sem id válido não dá para conferir nada: o produto não existe
    if (!id) throw new ErroNegocio(400, 'Produto inexistente ou inativo na saída.');
    porProduto.set(id, (porProduto.get(id) || 0) + Number(item.quantidade));
  }
  return [...porProduto.entries()].map(([id_produtos, quantidade]) => ({ id_produtos, quantidade }));
}

// Confere se cada quantidade pedida é um inteiro >= 1 (antes de somar; "1.5" ou "abc" não valem)
function validarQuantidades(itens, produtosPorId) {
  for (const item of itens) {
    const q = Number(item.quantidade);
    if (item.quantidade === '' || item.quantidade === null || !Number.isInteger(q) || q < 1) {
      const produto = produtosPorId && produtosPorId.get(lerId('produto', item.produtoId));
      throw new ErroNegocio(400, produto ? `Quantidade inválida para "${produto.nome}".` : 'Informe uma quantidade válida.');
    }
  }
}

// "Papel A4: 20 pct" por linha, usado no antes/depois da auditoria
const textoItens = (itens) => itens.map((i) => linhaEstoque(i.produto_nome, i.quantidade, i.unidade)).join('\n');

class SaidaController {
  // Listar saídas. Filtros: ?busca= (código da saída ou nome do responsável)  ?de=  ?ate=
  async listarTodas(req, res) {
    try {
      const busca = normalizarTexto(req.query.busca);
      const { de, ate } = req.query;

      const saidas = await saidaRepository.listarTodas();
      const filtradas = saidas.filter((s) => {
        const data = soData(s.data_cadastro);
        if ((de && data < de) || (ate && data > ate)) return false;
        return !busca
          || normalizarTexto(formatarId('saida', s.id_saidas)).includes(busca)
          || normalizarTexto(s.usuario_nome).includes(busca);
      });

      res.json(filtradas.map(serializar.saidaResumo));
    } catch (error) {
      tratarErro(res, error, 'listar saídas');
    }
  }

  async buscarPorId(req, res) {
    try {
      const id = lerId('saida', req.params.id);
      const saida = id && await saidaRepository.buscarPorId(id);
      if (!saida) throw new ErroNegocio(404, 'Saída não encontrada.');

      res.json(serializar.saidaDetalhe(saida, saida.itens));
    } catch (error) {
      tratarErro(res, error, 'buscar a saída');
    }
  }

  // Registra uma saída (Admin e Operador). Tudo ou nada: se um produto não tiver estoque, nenhum é baixado.
  // Responde com a lista de produtos que chegaram ao estoque mínimo, para o frontend avisar o usuário.
  async criar(req, res) {
    try {
      const { itens, descricao } = req.body;

      if (!Array.isArray(itens) || itens.length === 0) {
        throw new ErroNegocio(400, 'Adicione ao menos um produto à saída.');
      }

      const resultado = await db.transacao(async (tx) => {
        const linhas = agruparItens(itens);
        const produtosPorId = new Map();

        for (const linha of linhas) {
          const produto = await produtoRepository.buscarPorId(linha.id_produtos, tx);
          if (!produto || produto.ativo === 0) throw new ErroNegocio(400, 'Produto inexistente ou inativo na saída.');
          produtosPorId.set(linha.id_produtos, produto);
        }

        validarQuantidades(itens, produtosPorId);

        for (const linha of linhas) {
          const produto = produtosPorId.get(linha.id_produtos);
          if (linha.quantidade > produto.quantidade) {
            throw new ErroNegocio(400, `Quantidade maior que o disponível em estoque para "${produto.nome}" (${produto.quantidade} ${produto.unidade}).`);
          }
        }

        // Cria a saída, baixa o estoque e registra a auditoria (tudo na mesma transação)
        const idSaida = await saidaRepository.criar({ descricao: String(descricao || '').trim(), id_usuarios: req.usuario.id_usuarios }, linhas, tx);

        const antes = [];
        const depois = [];
        const alertas = [];
        for (const linha of linhas) {
          const produto = produtosPorId.get(linha.id_produtos);
          const quantidadeDepois = produto.quantidade - linha.quantidade;

          await produtoRepository.somarQuantidade(produto.id_produtos, -linha.quantidade, tx);
          await atividadeRepository.registrar('saida', `${produto.nome} — saída de ${linha.quantidade} ${produto.unidade}`, tx);

          antes.push(linhaEstoque(produto.nome, produto.quantidade, produto.unidade));
          depois.push(linhaEstoque(produto.nome, quantidadeDepois, produto.unidade));
          if (quantidadeDepois <= produto.limite_estoque_baixo) alertas.push(produto.nome);
        }

        const id = formatarId('saida', idSaida);
        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: 'Registrou saída de estoque',
          setor: 'Saída de estoque',
          detalhes: `${id} — ${linhas.map((l) => produtosPorId.get(l.id_produtos).nome).join(', ')}`,
          antes: antes.join('\n'),
          depois: depois.join('\n')
        }, tx);

        return { id, alertasEstoqueMinimo: alertas };
      });

      res.status(201).json(resultado);
    } catch (error) {
      tratarErro(res, error, 'registrar a saída');
    }
  }

  // Edita uma saída (só Administrador). O estoque é ajustado pela DIFERENÇA entre a saída antiga e a nova.
  async atualizar(req, res) {
    try {
      const { itens, descricao } = req.body;

      const idSaida = await db.transacao(async (tx) => {
        const id = lerId('saida', req.params.id);
        const saida = id && await saidaRepository.buscarPorId(id, tx);
        if (!saida) throw new ErroNegocio(404, 'Saída não encontrada.');

        if (!Array.isArray(itens) || itens.length === 0) {
          throw new ErroNegocio(400, 'A saída precisa ter ao menos um produto. Para remover tudo, exclua a saída.');
        }

        const novasLinhas = agruparItens(itens);
        const produtosPorId = new Map();
        const idsEnvolvidos = new Set([...novasLinhas.map((l) => l.id_produtos), ...saida.itens.map((i) => i.id_produtos)]);
        for (const idProduto of idsEnvolvidos) {
          const produto = await produtoRepository.buscarPorId(idProduto, tx);
          if (produto) produtosPorId.set(idProduto, produto);
        }

        validarQuantidades(itens, produtosPorId);

        // Produto inexistente, ou inativo que ainda não fazia parte desta saída
        for (const linha of novasLinhas) {
          const produto = produtosPorId.get(linha.id_produtos);
          if (!produto) throw new ErroNegocio(404, 'Produto não encontrado.');
          const jaEstavaNaSaida = saida.itens.some((i) => i.id_produtos === produto.id_produtos);
          if (produto.ativo === 0 && !jaEstavaNaSaida) throw new ErroNegocio(400, `O produto "${produto.nome}" está inativo.`);
        }

        // delta > 0 devolve ao estoque; delta < 0 baixa mais do estoque
        const delta = new Map();
        saida.itens.forEach((i) => delta.set(i.id_produtos, (delta.get(i.id_produtos) || 0) + i.quantidade));
        novasLinhas.forEach((l) => delta.set(l.id_produtos, (delta.get(l.id_produtos) || 0) - l.quantidade));

        for (const [idProduto, d] of delta.entries()) {
          const produto = produtosPorId.get(idProduto);
          if (produto && produto.quantidade + d < 0) throw new ErroNegocio(400, `Estoque insuficiente para "${produto.nome}".`);
        }
        for (const [idProduto, d] of delta.entries()) {
          if (d !== 0) await produtoRepository.somarQuantidade(idProduto, d, tx);
        }

        const descricaoNova = String(descricao || '').trim();
        await saidaRepository.substituir(id, descricaoNova, novasLinhas, tx);

        const textoNovo = novasLinhas
          .map((l) => linhaEstoque(produtosPorId.get(l.id_produtos).nome, l.quantidade, produtosPorId.get(l.id_produtos).unidade))
          .join('\n');
        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: 'Alterou saída',
          setor: 'Saídas',
          detalhes: formatarId('saida', id),
          antes: textoItens(saida.itens) + (saida.descricao ? `\nDescrição: ${saida.descricao}` : ''),
          depois: textoNovo + (descricaoNova ? `\nDescrição: ${descricaoNova}` : '')
        }, tx);

        return id;
      });

      const atualizada = await saidaRepository.buscarPorId(idSaida);
      res.json(serializar.saidaDetalhe(atualizada, atualizada.itens));
    } catch (error) {
      tratarErro(res, error, 'atualizar a saída');
    }
  }

  // Exclui uma saída (só Administrador). As quantidades voltam para o estoque.
  async excluir(req, res) {
    try {
      await db.transacao(async (tx) => {
        const id = lerId('saida', req.params.id);
        const saida = id && await saidaRepository.buscarPorId(id, tx);
        if (!saida) throw new ErroNegocio(404, 'Saída não encontrada.');

        for (const item of saida.itens) {
          await produtoRepository.somarQuantidade(item.id_produtos, item.quantidade, tx);
        }
        await saidaRepository.excluir(id, tx);

        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: 'Excluiu saída',
          setor: 'Saídas',
          detalhes: formatarId('saida', id),
          antes: textoItens(saida.itens),
          depois: 'Saída excluída — quantidades devolvidas ao estoque'
        }, tx);
      });

      res.json({ ok: true });
    } catch (error) {
      tratarErro(res, error, 'excluir a saída');
    }
  }
}

module.exports = new SaidaController();
