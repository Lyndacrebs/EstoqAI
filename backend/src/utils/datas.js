// Funções de data e hora usadas pelo sistema.
// As datas são gravadas como texto no horário do servidor (TZ definido no .env):
//   data           -> "2026-11-03"
//   data e hora    -> "2026-11-03 14:35:07"
const pad = (n) => String(n).padStart(2, '0');

function formatarData(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Data de hoje (YYYY-MM-DD)
function hoje() {
  return formatarData(new Date());
}

// Data de "n" dias atrás (YYYY-MM-DD)
function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatarData(d);
}

// Data e hora de "n" horas atrás (YYYY-MM-DD HH:mm:ss)
function horasAtras(n) {
  const d = new Date(Date.now() - n * 3600 * 1000);
  return `${formatarData(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Data e hora de agora (YYYY-MM-DD HH:mm:ss)
function agora() {
  const d = new Date();
  return `${formatarData(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// "2026-11-03 14:35:07" -> "2026-11-03 14:35" (formato que o frontend exibe)
function semSegundos(dataHora) {
  return String(dataHora || '').slice(0, 16);
}

// "2026-11-03 14:35:07" -> "2026-11-03"
function soData(dataHora) {
  return String(dataHora || '').slice(0, 10);
}

// Texto curto para a "atividade recente" do dashboard: "agora", "há 5 min", "há 2 h", "ontem"...
function tempoDecorrido(dataHora) {
  const feito = new Date(String(dataHora).replace(' ', 'T'));
  const minutos = Math.floor((Date.now() - feito.getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Abreviação do dia da semana de uma data "YYYY-MM-DD"
function diaDaSemana(data) {
  const [a, m, d] = data.split('-').map(Number);
  return DIAS_SEMANA[new Date(a, m - 1, d).getDay()];
}

// Confere se o texto é uma data válida no formato YYYY-MM-DD
function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto))) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  return dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
}

module.exports = { hoje, diasAtras, horasAtras, agora, semSegundos, soData, tempoDecorrido, diaDaSemana, dataValida };
