import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "../../services/api";
import { useFetch } from "../../hooks/useFetch";
import PageHeader from "../../components/ui/PageHeader";
import Barcode from "../../components/ui/Barcode";
import PrintButton from "../../components/ui/PrintButton";
import { ErrorBox, Loading } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AjusteQuantidade from "./AjusteQuantidade";
import { imprimirEtiqueta } from "../../utils/print";

/* Detalhe e edição de um produto. Operador vê a quantidade "apagada" (só Administrador altera). */
export default function ProdutoDetalhe({ produtoId, onVoltar, somenteLeitura, ehAdmin }) {
  const { data: produto, loading, error } = useFetch(() => api.produtos.obter(produtoId), [produtoId]);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ajustando, setAjustando] = useState(false);
  const [confirmando, setConfirmando] = useState(false); // pede confirmação para desativar/reativar

  if (loading && !produto) return <Loading />;
  if (error && !produto) return <ErrorBox mensagem={error} />;

  // prepara o formulário na primeira renderização com o produto carregado
  const f = form || { ...produto, palavrasChave: produto.palavrasChave.join(", ") };
  const set = (campo, valor) => setForm({ ...f, [campo]: valor });
  const camposBloqueados = somenteLeitura || !produto.ativo;

  const salvar = async () => {
    setErro(""); setSalvando(true);
    try {
      const atualizado = await api.produtos.atualizar(produto.id, {
        nome: f.nome, categoria: f.categoria, unidade: f.unidade, descricao: f.descricao,
        palavrasChave: f.palavrasChave.split(",").map((k) => k.trim()).filter(Boolean),
        limiteEstoqueBaixo: f.limiteEstoqueBaixo,
      });
      onVoltar(`Produto "${atualizado.nome}" atualizado.`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const alternarStatus = async () => {
    setErro("");
    try {
      if (produto.ativo) await api.produtos.desativar(produto.id); else await api.produtos.reativar(produto.id);
      onVoltar();
    } catch (e) {
      setErro(e.message);
    }
  };

  const rotulo = "text-xs font-medium";
  const corRotulo = { color: "var(--text-500)" };

  return (
    <div>
      <button onClick={() => onVoltar()} className="stk-focus flex items-center gap-1.5 text-sm mb-4" style={{ color: "var(--text-500)" }}>
        <ArrowLeft size={15} /> Voltar para produtos
      </button>
      <PageHeader
        title={produto.nome}
        subtitle={`ID do produto: ${produto.id}`}
        action={!somenteLeitura && (
          <button onClick={() => setConfirmando(true)} className="stk-focus px-4 py-2 rounded-lg text-sm font-semibold border"
            style={{ borderColor: produto.ativo ? "var(--red-500)" : "var(--green-600)", color: produto.ativo ? "var(--red-500)" : "var(--green-600)" }}>
            {produto.ativo ? "Desativar" : "Reativar"}
          </button>
        )}
      />

      {!produto.ativo && !somenteLeitura && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "var(--amber-100)", color: "var(--amber-text)" }}>
          Este produto está inativo. Reative para poder editar os campos.
        </div>
      )}
      <ErrorBox mensagem={erro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="stk-card p-4 md:p-6 md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={rotulo} style={corRotulo}>Nome</label><input disabled={camposBloqueados} className="stk-input stk-focus mt-1" value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
            <div><label className={rotulo} style={corRotulo}>Categoria</label><input disabled={camposBloqueados} className="stk-input stk-focus mt-1" value={f.categoria} onChange={(e) => set("categoria", e.target.value)} /></div>
            <div>
              <label className={rotulo} style={corRotulo}>Quantidade</label>
              <div className="flex items-center gap-2 mt-1">
                <input disabled readOnly className="stk-input font-mono" value={produto.quantidade} />
                {ehAdmin && !camposBloqueados && (
                  <button onClick={() => setAjustando(true)} className="stk-btn-outline stk-focus rounded-lg p-2.5" title="Alterar quantidade manualmente" aria-label="Alterar quantidade manualmente">
                    <Pencil size={15} style={{ color: "var(--teal-600)" }} />
                  </button>
                )}
              </div>
              {!ehAdmin && !camposBloqueados && <p className="text-xs mt-1" style={{ color: "var(--text-300)" }}>Só o Administrador altera a quantidade manualmente</p>}
            </div>
            <div><label className={rotulo} style={corRotulo}>Unidade de medida</label><input disabled={camposBloqueados} className="stk-input stk-focus mt-1" value={f.unidade} onChange={(e) => set("unidade", e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={rotulo} style={corRotulo}>Descrição</label><textarea disabled={camposBloqueados} rows={2} className="stk-input stk-focus mt-1" value={f.descricao} onChange={(e) => set("descricao", e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={rotulo} style={corRotulo}>Palavras-chave</label><input disabled={camposBloqueados} className="stk-input stk-focus mt-1" value={f.palavrasChave} onChange={(e) => set("palavrasChave", e.target.value)} /></div>
            <div><label className={rotulo} style={corRotulo}>Limite de estoque baixo</label><input disabled={camposBloqueados} type="number" min={0} className="stk-input stk-focus mt-1 font-mono" value={f.limiteEstoqueBaixo} onChange={(e) => set("limiteEstoqueBaixo", Number(e.target.value))} /></div>
          </div>
          {!camposBloqueados && (
            <div className="flex justify-end mt-6">
              <button onClick={salvar} disabled={salvando} className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm">{salvando ? "Salvando…" : "Salvar alterações"}</button>
            </div>
          )}
        </div>

        <div className="stk-card p-4 md:p-6">
          <p className="font-display font-semibold text-sm mb-4">Etiqueta do produto</p>
          <div className="border-2 border-dashed rounded-xl p-4 text-center" style={{ borderColor: "var(--border)" }}>
            <p className="font-mono text-xs mb-3" style={{ color: "var(--text-500)" }}>{produto.codigoBarras}</p>
            <div className="flex justify-center mb-2"><Barcode code={produto.codigoBarras} /></div>
          </div>
          {!somenteLeitura && (
            <PrintButton label="Imprimir etiqueta" onPrint={() => imprimirEtiqueta(produto)}
              className="stk-btn-outline stk-focus w-full mt-4 px-4 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2" />
          )}
        </div>
      </div>

      {ajustando && (
        <AjusteQuantidade produto={produto} onClose={() => setAjustando(false)}
          onSaved={(atualizado) => onVoltar(`Quantidade de "${atualizado.nome}" alterada de ${produto.quantidade} para ${atualizado.quantidade} ${atualizado.unidade}.`)} />
      )}
      {confirmando && (
        <ConfirmDialog
          title={`${produto.ativo ? "Desativar" : "Reativar"} "${produto.nome}"?`}
          confirmar={produto.ativo ? "Desativar" : "Reativar"} perigo={produto.ativo} positivo={!produto.ativo}
          texto={produto.ativo
            ? "O produto deixa de aparecer na saída de estoque e não poderá ser editado até ser reativado. O histórico e a quantidade em estoque são mantidos."
            : "O produto volta a aparecer na saída de estoque e poderá ser editado novamente."}
          onConfirm={alternarStatus} onCancel={() => setConfirmando(false)} />
      )}
    </div>
  );
}
