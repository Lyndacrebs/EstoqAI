import JsBarcode from "jsbarcode";
import { escapeHtml } from "./text";
import { fmtDate } from "./dates";

// Gera o código de barras (SVG em texto) a partir de um código
export function barcodeSvgString(code, { height = 50, width = 2, displayValue = true } = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, String(code), { format: "CODE128", height, width, displayValue, margin: 0, fontSize: 14, lineColor: "#12203D" });
  } catch {
    return "";
  }
  return svg.outerHTML;
}

// Envia um conteúdo HTML direto para a impressão, sem abrir outra tela
export function printDocument(titulo, corpoHtml) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #14213d; margin: 24px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p { margin: 2px 0; font-size: 13px; color: #444; }
      table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #f0f2f5; }
      .etiqueta { width: 320px; border: 2px dashed #999; border-radius: 10px; padding: 16px; text-align: center; }
      .etiqueta .nome { font-weight: bold; font-size: 15px; margin-bottom: 4px; }
      .etiqueta .codigo { font-family: monospace; font-size: 12px; margin-bottom: 10px; color: #555; }
      img { max-width: 100%; }
    </style></head><body>${corpoHtml}</body></html>`);
  doc.close();

  const limpar = () => setTimeout(() => iframe.remove(), 1000);
  const imprimir = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      limpar();
    }
  };
  // espera imagens (ex.: foto da NF) carregarem antes de imprimir
  const imgs = Array.from(doc.images);
  if (imgs.length === 0) {
    setTimeout(imprimir, 100);
  } else {
    let pendentes = imgs.length;
    const fim = () => { pendentes -= 1; if (pendentes <= 0) imprimir(); };
    imgs.forEach((img) => (img.complete ? fim() : ((img.onload = fim), (img.onerror = fim))));
  }
}

/* ----- documentos que o sistema imprime ----- */

export function imprimirEtiqueta(produto) {
  const corpo = `<div class="etiqueta">
    <div class="nome">${escapeHtml(produto.nome)}</div>
    <div class="codigo">${escapeHtml(produto.codigoBarras)}</div>
    ${barcodeSvgString(produto.codigoBarras)}
  </div>`;
  printDocument(`Etiqueta ${produto.codigoBarras}`, corpo);
}

export function imprimirSaida(saida) {
  const linhas = saida.itens
    .map((i) => `<tr><td>${escapeHtml(i.nome)}</td><td>${escapeHtml(i.quantidade)} ${escapeHtml(i.unidade)}</td></tr>`)
    .join("");
  const corpo = `<h1>Saída ${escapeHtml(saida.id)}</h1>
    <p>Data: ${fmtDate(saida.data)}</p>
    <p>Usuário responsável: ${escapeHtml(saida.usuarioResponsavel)}</p>
    <p>Descrição: ${escapeHtml(saida.descricao || "Nenhuma descrição informada")}</p>
    <table><thead><tr><th>Produto</th><th>Quantidade</th></tr></thead><tbody>${linhas}</tbody></table>`;
  printDocument(`Saída ${saida.id}`, corpo);
}

// Imprime só a foto da NF (ocupando a folha). Sem foto guardada, imprime a tabela de itens.
export function imprimirNotaFiscal(nf) {
  if (nf.imagemUrl) {
    const corpo = `<div style="text-align:center"><img src="${escapeHtml(nf.imagemUrl)}" alt="Nota fiscal ${escapeHtml(nf.id)}" style="max-width:100%;max-height:250mm;object-fit:contain"></div>`;
    printDocument(nf.nome, corpo);
    return;
  }
  const linhas = nf.itens
    .map((i) => `<tr><td>${escapeHtml(i.nome)}</td><td>${escapeHtml(i.quantidade)} ${escapeHtml(i.unidade)}</td><td>R$ ${Number(i.valorUnitario || 0).toFixed(2)}</td></tr>`)
    .join("");
  const corpo = `<h1>${escapeHtml(nf.nome)}</h1>
    <p>${escapeHtml(nf.id)} · ${fmtDate(nf.data)} · cadastrada por ${escapeHtml(nf.usuarioResponsavel)}</p>
    <table><thead><tr><th>Produto</th><th>Quantidade</th><th>Valor unit.</th></tr></thead><tbody>${linhas}</tbody></table>`;
  printDocument(nf.nome, corpo);
}
