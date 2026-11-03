import { Search } from "lucide-react";

/* Barra de filtros padrão: mesmo visual em todas as telas */

export function FilterBar({ children }) {
  return <div className="stk-card p-4 mb-5 flex items-end gap-4 flex-wrap">{children}</div>;
}

export function FilterField({ label, width, children }) {
  return (
    <div style={{ width }}>
      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-500)" }}>{label}</label>
      {children}
    </div>
  );
}

export function SearchField({ placeholder, value, onChange }) {
  return (
    <FilterField label="Buscar" width={260}>
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-300)" }} />
        <input className="stk-input stk-focus" style={{ paddingLeft: 34 }} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </FilterField>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <FilterField label={label} width={200}>
      <select className="stk-input stk-focus" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </FilterField>
  );
}

export function DateRangeFields({ from, to, setFrom, setTo }) {
  return (
    <>
      <FilterField label="De" width={160}>
        <input type="date" className="stk-input stk-focus" value={from} onChange={(e) => setFrom(e.target.value)} />
      </FilterField>
      <FilterField label="Até" width={160}>
        <input type="date" className="stk-input stk-focus" value={to} onChange={(e) => setTo(e.target.value)} />
      </FilterField>
    </>
  );
}

export function StatusTabsField({ tab, setTab }) {
  return (
    <FilterField label="Status">
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--border)" }}>
        {[["ativos", "Ativos"], ["inativos", "Inativos"], ["todos", "Todos"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="stk-focus px-3.5 py-1.5 rounded-md text-sm font-medium" style={{ background: tab === k ? "white" : "transparent", color: tab === k ? "var(--text-900)" : "var(--text-500)" }}>
            {l}
          </button>
        ))}
      </div>
    </FilterField>
  );
}
