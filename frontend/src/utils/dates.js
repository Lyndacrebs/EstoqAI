// Funções de data (sempre no fuso local do usuário)

const pad2 = (n) => String(n).padStart(2, "0");

export function dateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayStr() {
  return dateStr(new Date());
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

// "2026-11-01 21:30"
export function nowStamp() {
  const d = new Date();
  return `${dateStr(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "2026-11-01" -> "01/11/2026"
export function fmtDate(str) {
  if (!str) return "—";
  return str.slice(0, 10).split("-").reverse().join("/");
}
