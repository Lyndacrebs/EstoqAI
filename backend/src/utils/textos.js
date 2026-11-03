// Funções de texto usadas em buscas, comparações e na auditoria.

// Tira acentos, deixa minúsculo e corta espaços das pontas: "Pápel  A4 " -> "papel  a4"
// (o SQLite não ignora acentos nas buscas, por isso as buscas por texto são feitas aqui)
function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Igual ao anterior, mas também junta espaços repetidos (usado na recuperação de senha)
function normalizarNome(nome) {
  return normalizarTexto(nome).replace(/\s+/g, ' ');
}

// Extrai o CNPJ do nome da nota: "Fornecedora Ltda — CNPJ 12.345.678/0001-90" -> "12.345.678/0001-90".
// Se o nome não tiver CNPJ, devolve o nome inteiro.
function extrairCnpj(nome) {
  const achado = String(nome ?? '').match(/CNPJ\s*([\d./-]+)/i);
  return achado ? achado[1] : String(nome ?? '').trim();
}

// Uma linha de "antes/depois" da auditoria: "Papel A4: 20 pct"
const linhaEstoque = (nome, quantidade, unidade) => `${nome}: ${quantidade} ${unidade}`;

module.exports = { normalizarTexto, normalizarNome, extrairCnpj, linhaEstoque };
