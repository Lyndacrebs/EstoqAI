import { useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../../services/api";
import { useFetch } from "../../hooks/useFetch";
import { fmtDate } from "../../utils/dates";
import { imprimirSaida } from "../../utils/print";
import Modal from "../../components/ui/Modal";
import PrintButton from "../../components/ui/PrintButton";
import { ErrorBox, Loading } from "../../components/ui/Feedback";

/* Detalhes de uma saída. Administrador pode alterar (o estoque é ajustado automaticamente). */
export default function SaidaDetalhes({ saidaId, ehAdmin, onClose, onChanged }) {
  const { data: saida, loading, error } = useFetch(() => api.saidas.obter(saidaId), [saidaId]);
  const [form, setForm] = useState(null);       // preenchido ao clicar em "Alterar saída"
  const [estoque, setEstoque] = useState({});   // produtoId -> quantidade atual em estoque
  const [ativos, setAtivos] = useState([]);
  const [novoId, setNovoId] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const abrirEdicao = async () => {
    setErro("");
    try {
      const todos = await api.produtos.listar({ status: "todos" });
      setEstoque(Object.fromEntries(todos.map((p) => [p.id, p.quantidade])));
      setAtivos(todos.filter((p) => p.ativo));
      setForm({ descricao: saida.descricao || "", itens: saida.itens.map((i) => ({ ...i })) });
      setNovoId("");
    } catch (e) {
      setErro(e.message);
    }
  };

  // quanto o produto pode sair nesta saída = estoque atual + o que esta saída já retirou
  const maximo = (item) => (estoque[item.produtoId] ?? 0) + (saida.itens.find((o) => o.produtoId === item.produtoId)?.quantidade ?? 0);
  const erroItem = (i) => {
    if (!Number.isInteger(i.quantidade) || i.quantidade < 1) return "Informe uma quantidade válida";
    if (i.quantidade > maximo(i)) return `Máximo disponível: ${maximo(i)} ${i.unidade}`;
    return "";
  };
  const erroForm = form ? (form.itens.length === 0 ? "A saída precisa ter ao menos um produto. Para remover tudo, exclua a saída." : (form.itens.map(erroItem).find(Boolean) || "")) : "";

  const adicionar = () => {
    const p = ativos.find((x) => x.id === novoId);
    if (!p || form.itens.some((i) => i.produtoId === p.id)) return;
    setForm({ ...form, itens: [...form.itens, { produtoId: p.id, nome: p.nome, quantidade: 1, unidade: p.unidade }] });
    setNovoId("");
  };

  const salvar = async () => {
    if (erroForm) return;
    setSalvando(true); setErro("");
    try {
      await api.saidas.atualizar(saida.id, { itens: form.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })), descricao: form.descricao });
      onChanged();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading && !saida) return <Modal title="Saída" onClose={onClose} width={520}><Loading /></Modal>;
  if (error && !saida) return <Modal title="Saída" onClose={onClose} width={520}><ErrorBox mensagem={error} /></Modal>;

  const disponiveis = ativos.filter((p) => form && !form.itens.some((i) => i.produtoId === p.id));

  return (
    <Modal onClose={onClose} width={520}
      title={<div><span>{saida.id}</span><p className="text-xs font-mono font-normal" style={{ color: "var(--text-500)" }}>{fmtDate(saida.data)} · registrada por {saida.usuarioResponsavel}</p></div>}>
      <ErrorBox mensagem={erro} />
      {form ? (
        <>
          <div className="flex flex-col gap-2 mb-3">
            {form.itens.map((it, idx) => {
              const e = erroItem(it);
              return (
                <div key={it.produtoId} className="text-sm p-2.5 rounded-lg" style={{ background: "var(--bg)", border: e ? "1px solid var(--red-500)" : "1px solid transparent" }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span>{it.nome}</span>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={1} className="stk-input stk-focus font-mono" style={{ width: 72 }} value={Number.isNaN(it.quantidade) ? "" : it.quantidade}
                        onChange={(ev) => setForm({ ...form, itens: form.itens.map((x, i) => (i === idx ? { ...x, quantidade: ev.target.value === "" ? NaN : Number(ev.target.value) } : x)) })} />
                      <span className="text-xs" style={{ color: "var(--text-500)" }}>{it.unidade}</span>
                      <button onClick={() => setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) })} className="stk-focus" style={{ color: "var(--red-500)" }} title="Remover produto"><X size={14} /></button>
                    </div>
                  </div>
                  {e && <p className="text-xs mt-1.5" style={{ color: "var(--red-500)" }}>{e}</p>}
                </div>
              );
            })}
            {form.itens.length === 0 && <p className="text-xs text-center py-3" style={{ color: "var(--text-300)" }}>Nenhum produto nesta saída</p>}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <select className="stk-input stk-focus flex-1" value={novoId} onChange={(e) => setNovoId(e.target.value)}>
              <option value="">Adicionar produto…</option>
              {disponiveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <button onClick={adicionar} disabled={!novoId} className="stk-btn-primary stk-focus px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Plus size={14} /> Adicionar</button>
          </div>

          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Descrição</label>
          <textarea className="stk-input stk-focus mt-1" rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          {form.itens.length === 0 && <p className="text-xs mt-3" style={{ color: "var(--red-500)" }}>{erroForm}</p>}
          <p className="text-xs mt-3" style={{ color: "var(--text-300)" }}>Ao salvar, o estoque dos produtos é ajustado automaticamente</p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setForm(null)} className="stk-btn-outline stk-focus px-4 py-2 rounded-lg text-sm">Cancelar</button>
            <button onClick={salvar} disabled={!!erroForm || salvando} className="stk-btn-primary stk-focus px-4 py-2 rounded-lg text-sm">{salvando ? "Salvando…" : "Salvar alterações"}</button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-4">
            {saida.itens.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                <span>{it.nome}</span>
                <span className="font-mono">{it.quantidade} {it.unidade}</span>
              </div>
            ))}
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-500)" }}>Descrição</p>
          <p className="text-sm mb-4" style={{ color: saida.descricao ? "var(--text-900)" : "var(--text-300)" }}>{saida.descricao || "Nenhuma descrição informada"}</p>
          <div className="flex justify-end gap-2">
            <PrintButton label="Imprimir" onPrint={() => imprimirSaida(saida)} className="stk-btn-outline stk-focus px-4 py-2 rounded-lg text-sm flex items-center gap-2" />
            {ehAdmin && <button onClick={abrirEdicao} className="stk-btn-primary stk-focus px-4 py-2 rounded-lg text-sm">Alterar saída</button>}
          </div>
        </>
      )}
    </Modal>
  );
}
