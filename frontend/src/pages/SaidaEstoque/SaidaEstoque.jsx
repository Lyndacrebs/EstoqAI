import { useEffect, useState } from "react";
import { AlertTriangle, Check, Search, X } from "lucide-react";
import { api } from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";
import PageHeader from "../../components/ui/PageHeader";
import BarcodeScanner from "../../components/ui/BarcodeScanner";
import { ErrorBox } from "../../components/ui/Feedback";

/* Saída de estoque: lê a etiqueta (ou busca pelo nome), define quantidades e confirma */
export default function SaidaEstoque() {
  const [itens, setItens] = useState([]);   // cada item: produto + qtdSaida
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { quantidade, alertas }
  const [restam, setRestam] = useState(10);

  // busca pelo nome: só produtos ativos
  const [nome, setNome] = useState("");
  const [lista, setLista] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const nomeAtraso = useDebounce(nome, 200);

  useEffect(() => {
    if (!nomeAtraso.trim()) { setSugestoes([]); return; }
    let vivo = true;
    api.produtos.buscarAtivosPorNome(nomeAtraso.trim()).then((r) => { if (vivo) setSugestoes(r); }).catch(() => {});
    return () => { vivo = false; };
  }, [nomeAtraso]);

  const jaAdicionado = (id) => itens.some((i) => i.id === id);

  const adicionar = (p) => {
    if (p.quantidade <= 0 || jaAdicionado(p.id)) return;
    setItens((prev) => [...prev, { ...p, qtdSaida: 1 }]);
    setNome(""); setLista(false); setErro("");
  };

  const aoLerCodigo = async (codigo) => {
    setErro("");
    try {
      const p = await api.produtos.buscarPorCodigo(codigo);
      if (jaAdicionado(p.id)) { setErro(`"${p.nome}" já está na saída.`); return; }
      if (p.quantidade <= 0) { setErro(`"${p.nome}" está sem estoque.`); return; }
      adicionar(p);
    } catch (e) {
      setErro(e.message);
    }
  };

  const erroQtd = (i) => {
    if (!Number.isInteger(i.qtdSaida) || i.qtdSaida < 1) return "Informe uma quantidade válida";
    if (i.qtdSaida > i.quantidade) return `Maior que o disponível em estoque (${i.quantidade} ${i.unidade})`;
    return "";
  };
  const temErro = itens.some(erroQtd);

  const confirmar = async () => {
    if (itens.length === 0 || temErro) return;
    setErro(""); setEnviando(true);
    try {
      const r = await api.saidas.registrar({ itens: itens.map((i) => ({ produtoId: i.id, quantidade: i.qtdSaida })), descricao });
      setResultado({ quantidade: itens.length, alertas: r.alertasEstoqueMinimo });
      setRestam(10);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const nova = () => { setItens([]); setDescricao(""); setErro(""); setResultado(null); setRestam(10); };

  useEffect(() => {
    if (!resultado) return undefined;
    const t = setInterval(() => setRestam((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [resultado]);
  useEffect(() => { if (resultado && restam <= 0) nova(); }, [restam, resultado]);

  if (resultado) {
    return (
      <div>
        <PageHeader title="Saída de estoque" />
        <div className="stk-card p-6 max-w-md flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--green-100)" }}>
            <Check size={22} style={{ color: "var(--green-600)" }} />
          </div>
          <p className="font-display font-semibold">Saída registrada</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-500)" }}>{resultado.quantidade} produto(s) atualizados no estoque</p>
          {resultado.alertas.length > 0 && (
            <div className="mt-4 w-full text-left flex flex-col gap-2">
              {resultado.alertas.map((n) => (
                <div key={n} className="flex items-start gap-2 p-3 rounded-lg text-sm font-medium" style={{ background: "var(--amber-100)", color: "var(--amber-text)" }}>
                  <AlertTriangle size={15} className="shrink-0" style={{ marginTop: 2 }} />
                  <span>Produto "{n}" atingiu o limite mínimo de estoque!!</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm mt-4" style={{ color: "var(--text-500)" }}>A tela será recarregada em {Math.max(restam, 0)} segundo(s)</p>
          <button onClick={nova} className="stk-btn-primary stk-focus mt-4 px-5 py-2.5 rounded-lg text-sm">Nova saída agora</button>
        </div>
      </div>
    );
  }

  const visiveis = sugestoes.filter((p) => !jaAdicionado(p.id));

  return (
    <div>
      <PageHeader title="Saída de estoque" subtitle="Leia a etiqueta ou busque pelo nome cada item retirado da prateleira" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 stk-card p-4 md:p-6">
          <ErrorBox mensagem={erro} />
          <BarcodeScanner onRead={aoLerCodigo} disabled={enviando} />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-300)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="relative mb-5">
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-500)" }}>Buscar produto pelo nome</label>
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
              <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder="Digite o nome do produto…" value={nome}
                onChange={(e) => { setNome(e.target.value); setLista(true); }} onFocus={() => setLista(true)} onBlur={() => setTimeout(() => setLista(false), 150)} />
            </div>
            {lista && nome.trim() && (
              <div className="absolute left-0 right-0 mt-1 stk-card z-20 overflow-hidden" style={{ maxHeight: 220, overflowY: "auto", boxShadow: "0 6px 18px rgba(18,32,61,0.12)" }}>
                {visiveis.length === 0 ? (
                  <p className="px-4 py-3 text-sm" style={{ color: "var(--text-300)" }}>Nenhum produto ativo encontrado</p>
                ) : visiveis.map((p) => (
                  <button key={p.id} type="button" disabled={p.quantidade <= 0} onMouseDown={(e) => e.preventDefault()} onClick={() => adicionar(p)}
                    className="stk-focus w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b last:border-b-0"
                    style={{ borderColor: "var(--border)", opacity: p.quantidade <= 0 ? 0.5 : 1, cursor: p.quantidade <= 0 ? "not-allowed" : "pointer" }}>
                    <span>{p.nome}</span>
                    <span className="font-mono text-xs" style={{ color: "var(--text-500)" }}>{p.quantidade <= 0 ? "sem estoque" : `${p.quantidade} ${p.unidade}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {itens.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-300)" }}>Nenhum item adicionado ainda</p>
          ) : (
            <div className="flex flex-col gap-2">
              {itens.map((item) => {
                const e = erroQtd(item);
                return (
                  <div key={item.id} className="p-3 rounded-lg border" style={{ borderColor: e ? "var(--red-500)" : "var(--border)" }}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.nome}</p>
                        <p className="font-mono text-xs" style={{ color: "var(--text-300)" }}>{item.codigoBarras} · disponível: {item.quantidade} {item.unidade}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="number" min={1} max={item.quantidade} className="stk-input stk-focus font-mono" style={{ width: 72 }}
                          value={Number.isNaN(item.qtdSaida) ? "" : item.qtdSaida}
                          onChange={(ev) => setItens(itens.map((x) => (x.id === item.id ? { ...x, qtdSaida: ev.target.value === "" ? NaN : Number(ev.target.value) } : x)))} />
                        <button onClick={() => setItens(itens.filter((x) => x.id !== item.id))} aria-label="Remover item" className="stk-focus" style={{ color: "var(--red-500)" }}><X size={16} /></button>
                      </div>
                    </div>
                    {e && <p className="text-xs mt-2" style={{ color: "var(--red-500)" }}>{e}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="stk-card p-4 md:p-6 h-fit">
          <p className="font-display font-semibold text-sm mb-3">Detalhes da saída</p>
          <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Descrição (opcional)</label>
          <textarea className="stk-input stk-focus mt-1" rows={3} placeholder="Ex: saída para setor de vendas" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <button onClick={confirmar} disabled={itens.length === 0 || temErro || enviando} className="stk-btn-primary stk-focus w-full mt-4 py-2.5 rounded-lg text-sm">{enviando ? "Registrando…" : "Confirmar saída"}</button>
        </div>
      </div>
    </div>
  );
}
