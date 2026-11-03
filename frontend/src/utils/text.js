// Tira acentos e maiúsculas, para buscas e comparações
export function normalizeText(t) {
  return String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Protege texto digitado pelo usuário antes de colocá-lo em HTML (impressão)
export function escapeHtml(t) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Pega o CNPJ dentro de um nome como "Fornecedor — CNPJ 12.345.678/0001-90"
export function extractCnpj(nome) {
  const m = String(nome ?? "").match(/CNPJ\s*([\d./-]+)/i);
  return m ? m[1] : String(nome ?? "").trim();
}
