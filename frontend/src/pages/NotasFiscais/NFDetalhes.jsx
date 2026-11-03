import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { getImageUrl } from "../../services/http";
import { useFetch } from "../../hooks/useFetch";
import { fmtDate } from "../../utils/dates";
import { imprimirNotaFiscal } from "../../utils/print";
import Modal from "../../components/ui/Modal";
import Barcode from "../../components/ui/Barcode";
import PrintButton from "../../components/ui/PrintButton";
import { ErrorBox, Loading } from "../../components/ui/Feedback";

// Quando a NF não tem a foto guardada, mostra uma representação do documento
function NFImagem({ nf }) {
  if (nf.imagemUrl) {
    return (
      <div className="rounded-lg p-3" style={{ background: "#EDEFF3" }}>
        <img src={nf.imagemUrl} alt="Imagem da NF enviada" className="w-full rounded" />
        <p className="text-center text-xs mt-3" style={{ color: "var(--text-500)" }}>Imagem da NF enviada ao sistema</p>
      </div>
    );
  }
  const larguras = Array.from({ length: 14 }, (_, i) => 35 + ((nf.id.length * 17 * (i + 3)) % 55));
  return (
    <div className="rounded-lg p-5" style={{ background: "#EDEFF3" }}>
      <div className="mx-auto bg-white rounded shadow-sm" style={{ width: "100%", maxWidth: 280, padding: "18px 16px", transform: "rotate(-0.4deg)" }}>
        <p className="font-mono text-[10px] font-semibold mb-0.5">NOTA FISCAL ELETRÔNICA</p>
        <p className="font-mono text-[9px] mb-2" style={{ color: "var(--text-500)" }}>{nf.nome}</p>
        <div className="flex flex-col gap-1 mb-2">
          {larguras.map((w, i) => <div key={i} style={{ width: `${w}%`, height: 3, background: i % 4 === 0 ? "var(--text-300)" : "#DADFE8" }} />)}
        </div>
        <div className="flex justify-center mt-3"><Barcode code={nf.id} height={20} /></div>
      </div>
      <p className="text-center text-xs mt-3" style={{ color: "var(--text-500)" }}>Imagem da NF enviada ao sistema</p>
    </div>
  );
}

export default function NFDetalhes({ notaId, onClose }) {
  const { data: nf, loading, error } = useFetch(() => api.notasFiscais.obter(notaId), [notaId]);
  const [imagemUrl, setImagemUrl] = useState(null); // foto já baixada com o token de login

  useEffect(() => {
    if (!nf?.imagemUrl) { setImagemUrl(null); return undefined; }
    let vivo = true;
    getImageUrl(nf.imagemUrl).then((u) => { if (vivo) setImagemUrl(u); }).catch(() => { if (vivo) setImagemUrl(null); });
    return () => { vivo = false; };
  }, [nf]);
  if (loading && !nf) return <Modal title="Nota fiscal" onClose={onClose}><Loading /></Modal>;
  if (error && !nf) return <Modal title="Nota fiscal" onClose={onClose}><ErrorBox mensagem={error} /></Modal>;

  return (
    <Modal onClose={onClose} width={768}
      title={<div><span>{nf.nome}</span><p className="text-xs font-mono font-normal" style={{ color: "var(--text-500)" }}>{nf.id} · {fmtDate(nf.data)} · cadastrada por {nf.usuarioResponsavel}</p></div>}>
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2"><NFImagem nf={{ ...nf, imagemUrl }} /></div>
        <div className="col-span-3">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-500)" }}>Itens lançados a partir desta NF</p>
          <div className="rounded-lg border overflow-hidden mb-5" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  <th className="text-left font-medium px-3 py-2 text-xs" style={{ color: "var(--text-500)" }}>Produto</th>
                  <th className="text-right font-medium px-3 py-2 text-xs" style={{ color: "var(--text-500)" }}>Quantidade</th>
                  <th className="text-right font-medium px-3 py-2 text-xs" style={{ color: "var(--text-500)" }}>Valor unit.</th>
                </tr>
              </thead>
              <tbody>
                {nf.itens.map((it, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-2.5">{it.nome}</td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">{it.quantidade} {it.unidade}</td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">R$ {Number(it.valorUnitario || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PrintButton label="Imprimir NF" onPrint={() => imprimirNotaFiscal({ ...nf, imagemUrl })}
            className="stk-btn-outline stk-focus w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-2" />
        </div>
      </div>
    </Modal>
  );
}
