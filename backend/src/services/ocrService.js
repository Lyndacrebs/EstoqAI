// =====================================================================================
//  SERVIÇO DE LEITURA DA NOTA FISCAL (IA/OCR)
//
//  Este arquivo é o PONTO DE ENCAIXE com a leitura da nota por IA/OCR.
//  A rota POST /api/notas-fiscais/leitura chama a função  lerNota(...)  abaixo, e só.
//  Para ligar o OCR de verdade, basta trocar o CONTEÚDO desta função, mantendo o formato
//  de entrada e de saída. Nenhuma outra parte do sistema precisa mudar.
//
//  ENTRADA
//    caminhoDaImagem : caminho do arquivo da foto já salvo no disco (JPG, PNG, WEBP ou PDF)
//    produtosAtivos  : lista dos produtos ativos já cadastrados (formato da API: id, nome,
//                      palavrasChave...). Serve para fazer o vínculo item da nota <-> produto.
//
//  SAÍDA (obrigatória)
//    {
//      nomeSugerido: "Fornecedora Ltda — CNPJ 12.345.678/0001-90",   // precisa ter "CNPJ 00.000.000/0000-00"
//      itens: [ { descricaoOriginal, quantidade, unidade, valorUnitario,
//                 produtoVinculado: { id, nome } | null } ]
//    }
//
//  Se não conseguir ler a nota, é só lançar um erro (throw new Error(...)): a rota responde
//  "Não foi possível ler a nota. Tente outra foto." para o usuário.
//
//  VERSÃO PROVISÓRIA: enquanto o OCR não fica pronto, devolve sempre a mesma nota de exemplo
//  (a mesma do modo de teste do frontend), para o fluxo de entrada já poder ser testado.
// =====================================================================================
const { normalizarTexto } = require('../utils/textos');

const NOTA_DE_EXEMPLO = {
  nomeSugerido: 'Fornecedora Exemplo Ltda — CNPJ 12.345.678/0001-90',
  itens: [
    { descricaoOriginal: 'PAPEL SULFITE A4 75G 500FL', quantidade: 20, unidade: 'pct', valorUnitario: 24.9 },
    { descricaoOriginal: 'DETERGENTE INCOLOR 500ML', quantidade: 30, unidade: 'un', valorUnitario: 2.3 },
    { descricaoOriginal: 'GARRAFA TERMICA INOX 1L', quantidade: 6, unidade: 'un', valorUnitario: 58.0 },
    { descricaoOriginal: 'MOUSE OPTICO USB PRETO', quantidade: 10, unidade: 'un', valorUnitario: 19.9 }
  ]
};

// Vínculo provisório: se o nome do produto (ou uma palavra-chave dele, com 3+ letras) aparece
// dentro da descrição da nota, considera que é o mesmo produto. Pode ser trocado por algo melhor.
function vincularProduto(descricao, produtosAtivos) {
  const texto = normalizarTexto(descricao);
  const achado = produtosAtivos.find((p) =>
    [...p.palavrasChave, p.nome].some((chave) => normalizarTexto(chave).length >= 3 && texto.includes(normalizarTexto(chave)))
  );
  return achado ? { id: achado.id, nome: achado.nome } : null;
}

async function lerNota(caminhoDaImagem, produtosAtivos) {
  return {
    nomeSugerido: NOTA_DE_EXEMPLO.nomeSugerido,
    itens: NOTA_DE_EXEMPLO.itens.map((item) => ({
      ...item,
      produtoVinculado: vincularProduto(item.descricaoOriginal, produtosAtivos)
    }))
  };
}

module.exports = { lerNota };