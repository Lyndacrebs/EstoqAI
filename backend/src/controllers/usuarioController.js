const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');
const jwtConfig = require('../config/jwt');
const usuarioRepository = require('../repositories/usuarioRepository');
const recuperacaoRepository = require('../repositories/recuperacaoRepository');
const historicoRepository = require('../repositories/historicoRepository');
const serializar = require('../utils/serializadores');
const { lerId } = require('../utils/identificadores');
const { normalizarTexto, normalizarNome } = require('../utils/textos');
const { dataValida } = require('../utils/datas');
const { ErroNegocio, tratarErro } = require('../utils/erros');

const PERFIS = ['Administrador', 'Operador', 'Visualizador'];
const MAX_TENTATIVAS_RECUPERACAO = 3;
const MINUTOS_VALIDADE_CHAVE = 10;
const MSG_DESATIVADO = 'Cadastro desativado. Entre em contato com o Administrador.';
const MSG_EMAIL_REPETIDO = 'Já existe um usuário cadastrado com este e-mail.';

// O e-mail é a "chave" da recuperação de senha: sem maiúsculas e sem espaços nas pontas
const chaveEmail = (email) => String(email ?? '').trim().toLowerCase();

// Nomes dos campos como aparecem na auditoria
const ROTULOS_USUARIO = { nome: 'Nome', dataNascimento: 'Data de nascimento', email: 'E-mail', perfil: 'Perfil' };

// ROTA PÚBLICA DE LOGIN
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    }

    const usuario = await usuarioRepository.buscarPorEmail(email);

    if (!usuario) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    // Regra: Usuários inativos não conseguem logar (conferido ANTES da senha)
    if (usuario.ativo === 0) {
      return res.status(403).json({ mensagem: MSG_DESATIVADO });
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    // Login correto libera a recuperação de senha que tenha sido bloqueada para esse e-mail
    await recuperacaoRepository.zerarTentativas(chaveEmail(usuario.email));

    // Gera o Token JWT com perfil embutido
    const token = jwt.sign(
      { id_usuarios: usuario.id_usuarios, perfil: usuario.perfil, email: usuario.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    // O frontend espera { token, usuario } com o usuário já no formato dele (sem a senha)
    res.json({ token, usuario: serializar.usuario(usuario) });
  } catch (error) {
    tratarErro(res, error, 'fazer login');
  }
}

// QUEM SOU EU: o frontend consulta de tempos em tempos para saber se a sessão ainda vale.
// Se o usuário foi desativado, o middleware de autenticação já responde 403 antes de chegar aqui.
async function me(req, res) {
  try {
    const usuario = await usuarioRepository.buscarPorId(req.usuario.id_usuarios);
    res.json(serializar.usuario(usuario));
  } catch (error) {
    tratarErro(res, error, 'consultar o usuário logado');
  }
}

// CADASTRO DE NOVO USUÁRIO (Apenas Admin)
async function criarUsuario(req, res) {
  try {
    const { nome, dataNascimento, email, senha, perfil } = req.body;

    if (!String(nome || '').trim() || !dataNascimento || !String(email || '').trim() || !senha || !perfil) {
      throw new ErroNegocio(400, 'Preencha todos os campos obrigatórios.');
    }
    if (!PERFIS.includes(perfil)) {
      throw new ErroNegocio(400, 'Perfil inválido.');
    }
    if (!dataValida(dataNascimento)) {
      throw new ErroNegocio(400, 'Data de nascimento inválida.');
    }

    // O e-mail não pode se repetir (ignorando maiúsculas)
    if (await usuarioRepository.buscarPorEmail(email)) {
      throw new ErroNegocio(409, MSG_EMAIL_REPETIDO);
    }

    const senhaHash = bcrypt.hashSync(String(senha), 10);

    // Cadastro e auditoria na mesma transação
    const novo = await db.transacao(async (tx) => {
      const criado = await usuarioRepository.criar(
        { nome: String(nome).trim(), email: String(email).trim(), senha: senhaHash, data_nascimento: dataNascimento, perfil },
        tx
      );
      await historicoRepository.registrar({
        id_usuarios: req.usuario.id_usuarios,
        acao: 'Cadastrou usuário',
        setor: 'Usuários',
        detalhes: `${criado.nome} (${perfil})`,
        antes: '—',
        depois: `Perfil: ${perfil}; Status: Ativo`
      }, tx);
      return criado;
    });

    res.status(201).json(serializar.usuario(novo));
  } catch (error) {
    tratarErro(res, error, 'cadastrar usuário');
  }
}

// LISTAGEM (Apenas Admin). Filtros: ?status=ativos|inativos|todos  e  ?busca= (por nome)
async function listarUsuarios(req, res) {
  try {
    const status = ['ativos', 'inativos', 'todos'].includes(req.query.status) ? req.query.status : 'ativos';
    const busca = normalizarTexto(req.query.busca);

    const usuarios = await usuarioRepository.listarTodos(status);
    const filtrados = usuarios.filter((u) => normalizarTexto(u.nome).includes(busca));

    res.json(filtrados.map(serializar.usuario));
  } catch (error) {
    tratarErro(res, error, 'listar usuários');
  }
}

// EDIÇÃO (Apenas Admin). A senha é opcional: em branco = mantém a atual.
async function atualizarUsuario(req, res) {
  try {
    const id = lerId('usuario', req.params.id);
    const atual = id && await usuarioRepository.buscarPorId(id);
    if (!atual) throw new ErroNegocio(404, 'Usuário não encontrado.');
    if (atual.ativo === 0) throw new ErroNegocio(400, 'Usuário inativo: reative antes de editar.');

    const dados = req.body;
    const novo = {
      nome: String(dados.nome ?? atual.nome).trim(),
      dataNascimento: dados.dataNascimento ?? atual.data_nascimento,
      email: String(dados.email ?? atual.email).trim(),
      perfil: dados.perfil ?? atual.perfil
    };

    if (!novo.nome || !novo.email) throw new ErroNegocio(400, 'Preencha todos os campos obrigatórios.');
    if (!PERFIS.includes(novo.perfil)) throw new ErroNegocio(400, 'Perfil inválido.');
    if (!dataValida(novo.dataNascimento)) throw new ErroNegocio(400, 'Data de nascimento inválida.');

    // E-mail repetido em OUTRO usuário
    const donoDoEmail = await usuarioRepository.buscarPorEmail(novo.email);
    if (donoDoEmail && donoDoEmail.id_usuarios !== id) {
      throw new ErroNegocio(409, MSG_EMAIL_REPETIDO);
    }

    // Descobre o que mudou (para a auditoria mostrar só os campos alterados)
    const valoresAtuais = { nome: atual.nome, dataNascimento: atual.data_nascimento, email: atual.email, perfil: atual.perfil };
    const mudou = Object.keys(ROTULOS_USUARIO).filter((campo) => valoresAtuais[campo] !== novo[campo]);
    const trocouSenha = !!dados.senha;

    await db.transacao(async (tx) => {
      await usuarioRepository.atualizar(id, {
        nome: novo.nome,
        email: novo.email,
        data_nascimento: novo.dataNascimento,
        perfil: novo.perfil,
        senha: trocouSenha ? bcrypt.hashSync(String(dados.senha), 10) : null
      }, tx);

      // Quando o administrador troca a senha, a pessoa fica liberada na recuperação de senha
      // (é a forma de "desbloquear" quem errou os dados 3 vezes).
      if (trocouSenha) {
        await recuperacaoRepository.zerarTentativas(chaveEmail(atual.email), tx);
        await recuperacaoRepository.zerarTentativas(chaveEmail(novo.email), tx);
      }

      if (mudou.length || trocouSenha) {
        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: 'Editou usuário',
          setor: 'Usuários',
          detalhes: novo.nome,
          antes: mudou.map((c) => `${ROTULOS_USUARIO[c]}: ${valoresAtuais[c] || '—'}`).join('\n') || '—',
          depois: [...mudou.map((c) => `${ROTULOS_USUARIO[c]}: ${novo[c]}`), ...(trocouSenha ? ['Senha alterada'] : [])].join('\n')
        }, tx);
      }
    });

    const atualizado = await usuarioRepository.buscarPorId(id);
    res.json(serializar.usuario(atualizado));
  } catch (error) {
    tratarErro(res, error, 'atualizar usuário');
  }
}

// Desativar e reativar têm a mesma estrutura; muda o valor de "ativo" e os textos
async function alterarSituacao(req, res, ativar) {
  try {
    const id = lerId('usuario', req.params.id);
    const usuario = id && await usuarioRepository.buscarPorId(id);
    if (!usuario) throw new ErroNegocio(404, 'Usuário não encontrado.');

    // Regra: ninguém desativa o próprio cadastro (evita ficar sem nenhum administrador)
    if (!ativar && id === req.usuario.id_usuarios) {
      throw new ErroNegocio(400, 'Você não pode desativar o seu próprio cadastro.');
    }

    // Só grava (e audita) se a situação realmente mudar
    if ((usuario.ativo === 1) !== ativar) {
      await db.transacao(async (tx) => {
        if (ativar) await usuarioRepository.reativar(id, tx);
        else await usuarioRepository.desativar(id, tx);

        await historicoRepository.registrar({
          id_usuarios: req.usuario.id_usuarios,
          acao: ativar ? 'Reativou usuário' : 'Desativou usuário',
          setor: 'Usuários',
          detalhes: usuario.nome,
          antes: ativar ? 'Status: Inativo' : 'Status: Ativo',
          depois: ativar ? 'Status: Ativo' : 'Status: Inativo'
        }, tx);
      });
    }

    res.json(serializar.usuario(await usuarioRepository.buscarPorId(id)));
  } catch (error) {
    tratarErro(res, error, ativar ? 'reativar usuário' : 'desativar usuário');
  }
}

const desativarUsuario = (req, res) => alterarSituacao(req, res, false);
const reativarUsuario = (req, res) => alterarSituacao(req, res, true);

/* ------------------------------------------------------------------------
   RECUPERAÇÃO DE SENHA ("Esqueci minha senha") - rotas públicas, sem e-mail.
   Passo 1: a pessoa informa os dados do cadastro. Se baterem, recebe uma chave temporária.
   Passo 2: com a chave, define a nova senha.
   Regras: 3 tentativas erradas por e-mail; depois disso o e-mail fica bloqueado SEM prazo.
   Só sai do bloqueio com login correto ou quando um administrador troca a senha da pessoa.
   As mensagens nunca dizem qual campo errou, para não ajudar quem está chutando dados.
   ------------------------------------------------------------------------ */
async function verificarRecuperacao(req, res) {
  try {
    const { nome, dataNascimento, email, perfil } = req.body;
    const chave = chaveEmail(email);

    if (!chave) throw new ErroNegocio(400, 'Preencha todos os campos.');

    // Já bloqueado?
    const erros = await recuperacaoRepository.contarTentativas(chave);
    if (erros >= MAX_TENTATIVAS_RECUPERACAO) {
      throw new ErroNegocio(423, 'Recuperação de senha bloqueada. Procure um usuário administrador.');
    }

    const usuario = await usuarioRepository.buscarPorEmail(chave);
    const confere = usuario
      && normalizarNome(usuario.nome) === normalizarNome(nome)
      && usuario.data_nascimento === dataNascimento
      && usuario.perfil === perfil;

    if (!confere) {
      // Conta o erro também para e-mails que não existem (senão daria para descobrir quem tem cadastro)
      const total = await recuperacaoRepository.registrarErro(chave);
      const restam = MAX_TENTATIVAS_RECUPERACAO - total;
      throw new ErroNegocio(400, restam > 0
        ? `Os dados informados não conferem. Você ainda tem ${restam} tentativa${restam > 1 ? 's' : ''}.`
        : 'Os dados informados não conferem. Procure um usuário administrador.');
    }

    if (usuario.ativo === 0) throw new ErroNegocio(403, MSG_DESATIVADO);

    // Chave aleatória, que vale uma vez e expira em alguns minutos
    const chaveRecuperacao = crypto.randomBytes(24).toString('hex');
    const expiraEm = new Date(Date.now() + MINUTOS_VALIDADE_CHAVE * 60 * 1000).toISOString();
    await recuperacaoRepository.criarChave(chaveRecuperacao, usuario.id_usuarios, expiraEm);

    res.json({ chaveRecuperacao });
  } catch (error) {
    tratarErro(res, error, 'verificar a recuperação de senha');
  }
}

async function redefinirSenha(req, res) {
  try {
    const { chaveRecuperacao, novaSenha } = req.body;

    const registro = chaveRecuperacao && await recuperacaoRepository.buscarChave(String(chaveRecuperacao));
    if (!registro || registro.expira_em < new Date().toISOString()) {
      throw new ErroNegocio(400, 'Solicitação expirada. Refaça a recuperação de senha.');
    }
    // Obs.: o frontend hoje só exige que a senha não esteja vazia. Se o grupo quiser, dá para exigir
    // um tamanho mínimo aqui (ex.: 8 caracteres) e ajustar a mensagem.
    if (!novaSenha || !String(novaSenha).trim()) {
      throw new ErroNegocio(400, 'Informe a nova senha.');
    }

    const usuario = await usuarioRepository.buscarPorId(registro.id_usuarios);
    if (!usuario || usuario.ativo === 0) throw new ErroNegocio(403, MSG_DESATIVADO);

    await db.transacao(async (tx) => {
      await usuarioRepository.atualizarSenha(usuario.id_usuarios, bcrypt.hashSync(String(novaSenha), 10), tx);
      await recuperacaoRepository.apagarChave(registro.chave, tx); // a chave vale uma única vez
      await recuperacaoRepository.zerarTentativas(chaveEmail(usuario.email), tx);
    });

    res.json({ ok: true });
  } catch (error) {
    tratarErro(res, error, 'redefinir a senha');
  }
}

module.exports = {
  login, me, criarUsuario, listarUsuarios, atualizarUsuario, desativarUsuario, reativarUsuario,
  verificarRecuperacao, redefinirSenha
};
