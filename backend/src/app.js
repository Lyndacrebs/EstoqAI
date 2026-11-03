const express = require('express'); //Importa o módulo do Express para ter acesso às funcionalidades.
const cors = require('cors');
require('dotenv').config();

// Importação das Rotas
const produtoRoutes = require('./routes/produtoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const notaFiscalRoutes = require('./routes/notaFiscalRoutes');
const saidaRoutes = require('./routes/saidaRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// CORS: só os endereços do frontend listados em CORS_ORIGIN (no .env) podem chamar a API pelo navegador.
// Se a variável não existir, usa os endereços padrão do Vite (npm run dev).
const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: origensPermitidas }));
app.use(express.json());

// Registro das Rotas
app.use('/api/produtos', produtoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/notas-fiscais', notaFiscalRoutes);
app.use('/api/saidas', saidaRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.json({
    mensagem: 'API EstoqAI funcionando!'
  });
});

// Rota que não existe -> 404 no mesmo formato { mensagem } das outras respostas
app.use((req, res) => {
  res.status(404).json({ mensagem: 'Rota não encontrada.' });
});

// Último recurso: erro que ninguém tratou (ex.: JSON quebrado no corpo da requisição).
// Nunca devolvemos o texto técnico do erro para o usuário.
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ mensagem: 'Corpo da requisição inválido.' });
  }
  console.error('Erro não tratado:', erro);
  res.status(500).json({ mensagem: 'Erro interno do servidor. Tente novamente.' });
});

module.exports = app;
