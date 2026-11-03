// Identificadores que o frontend mostra para o usuário (ex.: "ID do produto: EST-0001").
// No banco continuam sendo números (id_produtos = 1); aqui convertemos nas duas direções.
const PREFIXOS = {
  usuario: 'USR',
  produto: 'EST',
  nota: 'NF',
  saida: 'SAI',
  log: 'LOG'
};

// (produto, 1) -> "EST-0001"
function formatarId(tipo, numero) {
  return `${PREFIXOS[tipo]}-${String(numero).padStart(4, '0')}`;
}

// ("produto", "EST-0001") -> 1.  Também aceita só o número ("1").  Devolve null se for inválido.
function lerId(tipo, valor) {
  const texto = String(valor ?? '').trim();
  const prefixo = PREFIXOS[tipo];
  const achado = texto.match(new RegExp(`^(?:${prefixo}-)?(\\d+)$`, 'i'));
  const numero = achado ? parseInt(achado[1], 10) : NaN;
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

module.exports = { formatarId, lerId };
