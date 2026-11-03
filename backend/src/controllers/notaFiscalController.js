const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { UPLOAD_DIR } = require('../config/upload');
const notaFiscalRepository = require('../repositories/notaFiscalRepository');
const produtoRepository = require('../repositories/produtoRepository');
const historicoRepository = require('../repositories/historicoRepository');
const atividadeRepository = require('../repositories/atividadeRepository');
const ocrService = require('../services/ocrService');
const serializar = require('../utils/serializadores');
const { lerId, formatarId } = require('../utils/identificadores');
const { normalizarTexto, extrairCnpj, linhaEstoque } = require('../utils/textos');
const { soData, hoje } = require('../utils/datas');
const { ErroNegocio, tratarErro } = require('../utils/erros');

/*
  ENTRADA DE ESTOQUE POR NOTA FISCAL - o frontend faz 4 chamadas, nesta ordem:
    1. POST /notas-fiscais/leitura            -> recebe a foto e devolve o que a IA leu
    2. POST /notas-fiscais                    -> usuário confirma a conferência: grava a NF como RASCUNHO
    3. POST /notas-fiscais/:id/produtos-novos -> guarda os dados de cada produto novo e reserva o código de barras da etiqueta
    4. POST /notas-fiscais/:id/finalizar      -> AQUI acontece tudo, de uma vez e numa única transação:
                                                 soma o estoque, cria os produtos novos e grava a auditoria
  (e depois, para consulta: GET /notas-fiscais, GET /notas-fiscais/:id e GET /notas-fiscais/:id/imagem)

  REGRA: o sistema nunca faz só uma parte da entrada. Enquanto a nota não for finalizada, nada muda no
  estoque, nenhum produto é criado e nada vai para a auditoria. Se o usuário fechar o navegador no meio,
  o rascunho fica parado (e é apagado depois de 24 horas); o estoque continua exatamente como estava.
*/

// Quantidade válida em item de nota: número inteiro maior que zero
const quantidadeValida = (q) => Number.isInteger(Number(q)) && Number(q) > 0 && q !== '' && q !== null;

class NotaFiscalController {
  // PASSO 1 - Recebe a foto (o multer já salvou o arquivo) e chama o serviço de leitura (OCR)
  async lerImagem(req, res) {
    try {
      if (!req.file) {
        throw new ErroNegocio(400, 'Envie a foto da nota fiscal.');
      }

      // O nome do arquivo no disco (sem extensão) identifica esta leitura nos próximos passos
      const leituraId = path.parse(req.file.filename).name;

      const produtosAtivos = (await produtoRepository.listarTodos('ativos')).map(serializar.produto);

      let leitura;
      try {
        leitura = await ocrService.lerNota(req.file.path, produtosAtivos);
      } catch (erroDeLeitura) {
        console.error('Falha na leitura da nota fiscal:', erroDeLeitura);
        throw new ErroNegocio(502, 'Não foi possível ler a nota. Tente outra foto.');
      }

      return res.json({
        leituraId,
        nomeSugerido: leitura.nomeSugerido,
        // O frontend identifica cada item por um número (1, 2, 3...)
        itens: leitura.itens.map((item, indice) => ({ id: indice + 1, ...item }))
      });
    } catch (error) {
      return tratarErro(res, error, 'ler a nota fiscal');
    }
  }

  // PASSO 2 - Confirma a conferência: grava a NF como RASCUNHO. Ainda não mexe no estoque.
  // Itens COM produtoId são produtos que já existem (a quantidade será somada na finalização).
  // Itens SEM produtoId são produtos novos: serão cadastrados no passo 3 e criados na finalização.
  async criar(req, res) {
    try {
      const { leituraId, nome, itens } = req.body;
      const id_usuarios = req.usuario.id_usuarios; // Obtido via JWT no middleware de autenticação

      if (!String(nome || '').trim()) {
        throw new ErroNegocio(400, 'Informe o nome da nota fiscal.');
      }
      if (!Array.isArray(itens) || itens.length === 0) {
        throw new ErroNegocio(400, 'A nota fiscal precisa ter itens.');
      }
      if (itens.some((i) => !quantidadeValida(i.quantidade))) {
        throw new ErroNegocio(400, 'A quantidade de cada item precisa ser maior que zero.');
      }
      if (itens.some((i) => !String(i.unidade || '').trim())) {
        throw new ErroNegocio(400, 'Cada item da nota precisa ter unidade e quantidade informadas.');
      }

      // A foto enviada no passo 1 é ligada à nota. O leituraId só pode ter letras e números
      // (evita que alguém use "../" para apontar para outro arquivo do servidor).
      let arquivo = null;
      if (leituraId && /^[a-f0-9]{24}$/.test(String(leituraId))) {
        arquivo = fs.readdirSync(UPLOAD_DIR).find((f) => f.startsWith(`${leituraId}.`)) || null;
      }

      const { idNota, fotosAbandonadas } = await db.transacao(async (tx) => {
        // Aproveita para limpar rascunhos abandonados há mais de 24 horas
        const fotosAbandonadas = await notaFiscalRepository.removerRascunhosAntigos(tx);

        // Evita registrar a mesma foto duas vezes (ex.: duplo clique em "Confirmar")
        if (arquivo) {
          const jaUsada = await tx.buscarUm('SELECT 1 AS ok FROM notas_fiscais WHERE arquivo = ?', [arquivo]);
          if (jaUsada) throw new ErroNegocio(409, 'Esta nota fiscal já foi registrada.');
        }

        // Só confere se os produtos vinculados existem e estão ativos (para avisar logo).
        // A conferência de verdade é refeita na finalização, porque até lá algo pode mudar.
        for (const item of itens.filter((i) => i.produtoId)) {
          const id = lerId('produto', item.produtoId);
          const produto = id && await produtoRepository.buscarPorId(id, tx);
          if (!produto) throw new ErroNegocio(404, 'Produto vinculado não encontrado.');
          if (produto.ativo === 0) throw new ErroNegocio(400, `O produto "${produto.nome}" está inativo.`);
        }

        const nomeNota = String(nome).trim();
        const nota = await notaFiscalRepository.criar({
          nome: nomeNota,
          fornecedor: nomeNota,
          cnpj_fornecedor: /CNPJ/i.test(nomeNota) ? extrairCnpj(nomeNota) : null,
          arquivo,
          id_usuarios
        }, itens.map((item, indice) => ({
          id_item_leitura: item.id ?? indice + 1,
          unidade: String(item.unidade).trim(),
          quantidade: Number(item.quantidade),
          descricao_original: String(item.descricaoOriginal ?? '').trim(),
          valor_unitario: Number(item.valorUnitario) || 0,
          id_produtos: item.produtoId ? lerId('produto', item.produtoId) : null
        })), tx);

        return { idNota: nota.id_notas_fiscais, fotosAbandonadas };
      });

      // Apaga do disco as fotos dos rascunhos removidos (fora da transação: não faz parte do banco)
      fotosAbandonadas.forEach((arq) => fs.rm(path.join(UPLOAD_DIR, path.basename(arq)), { force: true }, () => {}));

      return res.status(201).json({
        notaId: formatarId('nota', idNota),
        // O frontend usa esta lista para pedir os dados de cada produto novo (passo 3)
        produtosNovos: itens
          .map((item, indice) => ({ item, id: item.id ?? indice + 1 }))
          .filter(({ item }) => !item.produtoId)
          .map(({ item, id }) => ({
            id,
            descricaoOriginal: String(item.descricaoOriginal ?? '').trim(),
            quantidade: Number(item.quantidade),
            unidade: String(item.unidade).trim()
          }))
      });
    } catch (error) {
      return tratarErro(res, error, 'registrar a nota fiscal');
    }
  }

  // PASSO 3 - Guarda os dados de UM produto novo identificado na nota e reserva o código de barras.
  // O produto ainda NÃO é criado (isso só acontece na finalização), mas a etiqueta já precisa do código,
  // por isso ele é reservado agora. Chamar de novo para o mesmo item atualiza os dados e mantém o código
  // (assim, se a resposta se perder no caminho e o frontend tentar de novo, nada trava).
  // O nome, a quantidade e a unidade vêm do item gravado no passo 2 (não do que o navegador mandar agora),
  // assim ninguém consegue cadastrar um produto com quantidade diferente da nota.
  async cadastrarProdutoNovo(req, res) {
    try {
      const { item, categoria, limiteEstoqueBaixo, descricao, palavrasChave } = req.body;

      if (!String(categoria || '').trim()) {
        throw new ErroNegocio(400, 'Informe a categoria do produto.');
      }
      const limite = limiteEstoqueBaixo === undefined || limiteEstoqueBaixo === '' ? 0 : Number(limiteEstoqueBaixo);
      if (!Number.isInteger(limite) || limite < 0) {
        throw new ErroNegocio(400, 'Informe um limite de estoque baixo válido (inteiro maior ou igual a zero).');
      }
      const palavras = (Array.isArray(palavrasChave) ? palavrasChave : String(palavrasChave || '').split(','))
        .map((p) => String(p).trim()).filter(Boolean);

      const previa = await db.transacao(async (tx) => {
        const idNota = lerId('nota', req.params.id);
        const nota = idNota && await notaFiscalRepository.buscarPorId(idNota, tx);
        if (!nota || nota.finalizada === 1) throw new ErroNegocio(404, 'Entrada de NF não encontrada.');

        const itemDaNota = item && await notaFiscalRepository.buscarItemPorLeitura(idNota, item.id, tx);
        if (!itemDaNota) throw new ErroNegocio(404, 'Item da nota não encontrado.');
        if (itemDaNota.id_produtos) throw new ErroNegocio(400, 'Este item da nota já está vinculado a um produto cadastrado.');

        const codigoBarras = itemDaNota.novo_codigo_barras || await produtoRepository.reservarCodigoBarras(tx);
        const dados = {
          codigo_barras: codigoBarras,
          categoria: String(categoria).trim(),
          descricao: String(descricao || '').trim(),
          palavras_chave: palavras.join(','),
          limite_estoque_baixo: limite
        };
        await notaFiscalRepository.guardarProdutoNovo(itemDaNota.id_itens_nota_fiscal, dados, tx);

        return { itemDaNota, dados };
      });

      // Resposta no formato de produto, para o frontend montar a etiqueta. "id" é nulo porque o produto
      // só passa a existir (e ganha id) quando a entrada for finalizada.
      const { itemDaNota, dados } = previa;
      return res.status(201).json({
        id: null,
        codigoBarras: dados.codigo_barras,
        nome: itemDaNota.descricao_original,
        categoria: dados.categoria,
        quantidade: itemDaNota.quantidade,
        unidade: itemDaNota.unidade,
        descricao: dados.descricao,
        palavrasChave: palavras,
        limiteEstoqueBaixo: limite,
        ativo: true,
        dataCadastro: hoje()
      });
    } catch (error) {
      return tratarErro(res, error, 'cadastrar o produto novo da nota');
    }
  }

  // PASSO 4 - Finalização: é aqui que a entrada realmente acontece, TUDO NUMA ÚNICA TRANSAÇÃO.
  // Ou tudo é gravado (estoque somado, produtos novos criados, auditoria registrada) ou nada é.
  // Chamar de novo depois de finalizada não faz nada (não duplica estoque nem auditoria).
  async finalizar(req, res) {
    try {
      await db.transacao(async (tx) => {
        const idNota = lerId('nota', req.params.id);
        const nota = idNota && await notaFiscalRepository.buscarPorId(idNota, tx);
        if (!nota) throw new ErroNegocio(404, 'Nota fiscal não encontrada.');
        if (nota.finalizada === 1) return;

        // 1) Todo produto novo da nota precisa ter sido cadastrado no passo 3
        if (nota.itens.some((i) => !i.id_produtos && !i.novo_codigo_barras)) {
          throw new ErroNegocio(400, 'Cadastre todos os produtos novos da nota antes de finalizar.');
        }

        // 2) Soma por produto que já existe (o mesmo produto pode aparecer em duas linhas da nota).
        //    Os produtos são lidos de novo agora: se algum foi desativado desde o passo 2, a entrada é recusada.
        const somaPorProduto = new Map(); // id_produtos -> { produto, total }
        for (const item of nota.itens.filter((i) => i.id_produtos)) {
          const produto = await produtoRepository.buscarPorId(item.id_produtos, tx);
          if (!produto) throw new ErroNegocio(404, 'Produto vinculado não encontrado.');
          if (produto.ativo === 0) throw new ErroNegocio(400, `O produto "${produto.nome}" está inativo.`);
          const anterior = somaPorProduto.get(item.id_produtos);
          somaPorProduto.set(item.id_produtos, { produto, total: (anterior ? anterior.total : 0) + item.quantidade });
        }

        // Texto de "antes" e "depois" da auditoria (uma linha por produto, produtos novos só no "depois")
        const antes = [];
        const depois = [];
        for (const { produto, total } of somaPorProduto.values()) {
          antes.push(linhaEstoque(produto.nome, produto.quantidade, produto.unidade));
          depois.push(linhaEstoque(produto.nome, produto.quantidade + total, produto.unidade));
          await produtoRepository.somarQuantidade(produto.id_produtos, total, tx);
        }
        for (const item of nota.itens.filter((i) => i.id_produtos)) {
          const { produto } = somaPorProduto.get(item.id_produtos);
          await atividadeRepository.registrar('entrada', `${produto.nome} — entrada de ${item.quantidade} ${produto.unidade}`, tx);
        }

        // 3) Cria os produtos novos, já com a quantidade da nota e o código de barras reservado
        for (const item of nota.itens.filter((i) => !i.id_produtos)) {
          const novo = await produtoRepository.criar({
            nome: item.descricao_original,
            descricao: item.novo_descricao,
            codigo_barras: item.novo_codigo_barras,
            categoria: item.novo_categoria,
            unidade: item.unidade,
            quantidade: item.quantidade,
            palavras_chave: item.novo_palavras_chave,
            limite_estoque_baixo: item.novo_limite_estoque_baixo
          }, tx);
          await notaFiscalRepository.vincularProduto(item.id_itens_nota_fiscal, novo.id_produtos, tx);
          depois.push(`${linhaEstoque(novo.nome, novo.quantidade, novo.unidade)} (novo)`);
          await atividadeRepository.registrar('entrada', `${novo.nome} — entrada de ${novo.quantidade} ${novo.unidade} (produto novo)`, tx);
        }

        // 4) UMA única linha de auditoria para a nota inteira
        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: `Deu entrada por NF - "${extrairCnpj(nota.nome)}"`,
          setor: 'Nova entrada (NF)',
          detalhes: `${formatarId('nota', nota.id_notas_fiscais)} — ${nota.nome}`,
          antes: antes.join('\n'),
          depois: depois.join('\n')
        }, tx);

        await notaFiscalRepository.marcarFinalizada(nota.id_notas_fiscais, tx);
      });

      return res.json({ ok: true });
    } catch (error) {
      return tratarErro(res, error, 'finalizar a entrada da nota');
    }
  }

  // Listar notas. Filtros: ?busca= (nome)  ?de=  ?ate=  (datas YYYY-MM-DD, inclusivas)
  async listarTodas(req, res) {
    try {
      const busca = normalizarTexto(req.query.busca);
      const { de, ate } = req.query;

      const notas = await notaFiscalRepository.listarTodas();
      const filtradas = notas.filter((n) => {
        const data = soData(n.data_cadastro);
        return (!de || data >= de) && (!ate || data <= ate) && normalizarTexto(n.nome).includes(busca);
      });

      return res.json(filtradas.map(serializar.notaResumo));
    } catch (error) {
      return tratarErro(res, error, 'listar notas fiscais');
    }
  }

  async buscarPorId(req, res) {
    try {
      const id = lerId('nota', req.params.id);
      const nota = id && await notaFiscalRepository.buscarPorId(id);

      // Rascunho (entrada não finalizada) ainda não é uma nota registrada: não aparece na consulta
      if (!nota || nota.finalizada === 0) {
        throw new ErroNegocio(404, 'Nota fiscal não encontrada.');
      }

      return res.json(serializar.notaDetalhe(nota, nota.itens));
    } catch (error) {
      return tratarErro(res, error, 'buscar a nota fiscal');
    }
  }

  // Foto da nota. Só sai para quem está logado (o frontend baixa a imagem enviando o token).
  async imagem(req, res) {
    try {
      const id = lerId('nota', req.params.id);
      const nota = id && await notaFiscalRepository.buscarPorId(id);
      if (!nota || nota.finalizada === 0 || !nota.arquivo) throw new ErroNegocio(404, 'Imagem da nota não encontrada.');

      const caminho = path.join(UPLOAD_DIR, path.basename(nota.arquivo));
      if (!fs.existsSync(caminho)) throw new ErroNegocio(404, 'Imagem da nota não encontrada.');

      return res.sendFile(caminho);
    } catch (error) {
      return tratarErro(res, error, 'enviar a imagem da nota');
    }
  }
}

module.exports = new NotaFiscalController();
