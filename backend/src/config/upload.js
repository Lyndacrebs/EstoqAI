const path = require('path');
const fs = require('fs');

// Pasta onde ficam as fotos das notas fiscais enviadas pelos usuários.
// Fica FORA da pasta "src" e fora do Git (veja o .gitignore), e NÃO é servida como arquivos públicos:
// a foto só sai pela rota autenticada GET /api/notas-fiscais/:id/imagem.
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads/notas');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

module.exports = { UPLOAD_DIR };
