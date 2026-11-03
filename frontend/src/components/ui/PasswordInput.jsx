import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/* Campo de senha com o "olhinho" para mostrar/esconder o que foi digitado */
export default function PasswordInput({ value, onChange, onKeyDown, placeholder, className = "" }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <input type={visivel ? "text" : "password"} className={`stk-input stk-focus ${className}`} style={{ paddingRight: 40 }}
        value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} />
      <button type="button" onClick={() => setVisivel((v) => !v)} aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-500)" }}>
        {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
