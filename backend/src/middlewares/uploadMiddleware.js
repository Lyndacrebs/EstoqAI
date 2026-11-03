const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { UPLOAD_DIR } = require('../config/upload');

// Tipos aceitos para a foto da nota fiscal e a extensão que cada um recebe no disco
const TIPOS_ACEITOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const armazenamento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // O nome no disco é sempre aleatório (nunca o nome que o usuário enviou), para evitar
  // arquivos sobrescritos e nomes maliciosos. Esse nome (sem a extensão) é o "leituraId".
  filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + TIPOS_ACEITOS[file.mimetype])
});

const upload = multer({
  storage: armazenamento,
  limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_ACEITOS[file.mimetype]) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'tipo'));
    }
    cb(null, true);
  }
});

// Recebe UM arquivo no campo "imagem" e devolve erros em português, no formato { mensagem }
function receberImagemDaNota(req, res, next) {
  upload.single('imagem')(req, res, (erro) => {
    if (!erro) return next();

    if (erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ mensagem: 'A foto da nota deve ter no máximo 10 MB.' });
    }
    if (erro instanceof multer.MulterError) {
      return res.status(400).json({ mensagem: 'Envie a foto da nota em JPG, PNG, WEBP ou PDF.' });
    }
    console.error('Erro ao receber a foto da nota:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor. Tente novamente.' });
  });
}

module.exports = { receberImagemDaNota, extensao: (nome) => path.extname(nome) };
