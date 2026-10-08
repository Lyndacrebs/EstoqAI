// Importa a instância da aplicação Express configurada no arquivo app.js
const app = require('./app');

// Define a porta do servidor: usa a variável de ambiente (process.env.PORT) se existir, ou a porta 3001 como padrão
const PORT = process.env.PORT || 3001;

// Inicia o servidor HTTP escutando as requisições na porta definida
app.listen(PORT, () => {
  // Exibe uma mensagem no terminal para confirmar que o servidor está rodando
  console.log(`Servidor EstoqAI rodando na porta ${PORT}`);
});