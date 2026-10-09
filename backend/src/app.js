const express = require('express'); //Importa o módulo do Express para ter acesso às funcionalidades.
const cors = require('cors');
require('dotenv').config();

// Importação das Rotas
const produtoRoutes = require('./routes/produtoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Registro das Rotas
app.use('/api/produtos', produtoRoutes); 
app.use('/api/usuarios', usuarioRoutes);

app.get('/', (req, res) => {
  res.json({
    mensagem: 'API EstoqAI funcionando!'
  });
});

module.exports = app;