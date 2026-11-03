import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { ErrorBox } from "../../components/ui/Feedback";

/* Etapa 3: completa o cadastro de cada produto novo (só os campos que a NF não trouxe) */
export default function ProductForm({ item, indice, total, onSave, salvando, erro }) {
  const [form, setForm] = useState({ categoria: "", descricao: "", palavrasChave: "", limiteEstoqueBaixo: 10 });
  const set = (campo, valor) => setForm({ ...form, [campo]: valor });

  return (
    <div>
      <PageHeader
        title="Completar cadastro do produto"
        subtitle={`Produto novo identificado na NF (${indice + 1} de ${total}) — os dados já lidos não precisam ser repetidos`}
      />
      <div className="stk-card p-6 max-w-2xl">
        <ErrorBox mensagem={erro} />
        <div className="p-3 rounded-lg mb-5 flex items-center justify-between text-sm" style={{ background: "var(--bg)" }}>
          <div>
            <p className="font-semibold">{item.descricaoOriginal}</p>
            <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-500)" }}>{item.quantidade} {item.unidade} · já obtido pela leitura da NF</p>
          </div>
          <Sparkles size={16} style={{ color: "var(--teal-500)" }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Categoria</label>
            <input className="stk-input stk-focus mt-1" placeholder="Ex: Eletrônicos" value={form.categoria} onChange={(e) => set("categoria", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Limite de estoque baixo</label>
            <input type="number" min={0} className="stk-input stk-focus mt-1 font-mono" value={form.limiteEstoqueBaixo} onChange={(e) => set("limiteEstoqueBaixo", Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Descrição</label>
            <textarea className="stk-input stk-focus mt-1" rows={2} placeholder="Detalhes do produto" value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-500)" }}>Palavras-chave (variações de nome)</label>
            <input className="stk-input stk-focus mt-1" placeholder="separadas por vírgula — ex: garrafa inox, squeeze termico" value={form.palavrasChave} onChange={(e) => set("palavrasChave", e.target.value)} />
            <p className="text-xs mt-1" style={{ color: "var(--text-300)" }}>Sempre que uma NF trouxer um desses termos, o sistema reconhece como este mesmo produto. Você pode adicionar mais depois, na edição do produto.</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => onSave({ ...form, categoria: form.categoria.trim(), palavrasChave: form.palavrasChave.split(",").map((k) => k.trim()).filter(Boolean) })}
            disabled={!form.categoria.trim() || salvando}
            className="stk-btn-primary stk-focus px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">
            {salvando ? "Salvando…" : "Salvar produto e gerar etiqueta"} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
