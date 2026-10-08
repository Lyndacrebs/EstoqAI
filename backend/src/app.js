const express = require('express'); //Importa o módulo do Express para ter acesso às funcionalidades.
const cors = require('cors');
require('dotenv').config();

const produtoRoutes = require('./routes/produtoRoutes'); // <--- Comente esta linha

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/produtos', produtoRoutes); // <--- Comente esta linha

app.get('/', (req, res) => {
  res.json({
    mensagem: 'API EstoqAI funcionando!'
  });
});

module.exports = app;