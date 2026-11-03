import { API_URL } from "../config/env";
import { getToken } from "./session";
import { ApiError } from "./errors";

/*
  Único lugar que fala com o backend pela rede:
  - monta o endereço (API_URL + rota);
  - envia o token em todas as requisições (Authorization: Bearer <token>);
  - quando o token vence ou o usuário foi desativado, avisa o sistema para voltar ao login.
*/

let authErrorHandler = null;

// O AuthContext registra aqui o que fazer quando a sessão deixa de valer
export function setAuthErrorHandler(fn) {
  authErrorHandler = fn;
}

// Usado também pelo modo de teste, que não passa pela rede
export function reportAuthError(err) {
  if (authErrorHandler) authErrorHandler(err);
}

function buildUrl(path, params) {
  const base = API_URL.replace(/\/$/, "") + path;
  const url = new URL(base, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

// 401 = sessão inválida. 403 só encerra a sessão se for token inválido ou cadastro desativado
// (um 403 de "perfil sem permissão" apenas mostra a mensagem).
function isSessionError(status, message, path) {
  if (path.endsWith("/usuarios/login")) return false;
  if (status === 401) return true;
  return status === 403 && /token|desativ/i.test(message);
}

async function request(method, path, { params, body, formData } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // o navegador define o Content-Type sozinho
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(buildUrl(path, params), { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message = (data && (data.mensagem || data.erro)) || `Erro ${res.status}`;
    const err = new ApiError(res.status, message);
    if (isSessionError(res.status, message, path) && authErrorHandler) authErrorHandler(err);
    throw err;
  }
  return data;
}

// Imagens protegidas por login (ex.: foto da NF): o navegador não envia o token em <img>,
// então a imagem é baixada com o token e exibida a partir de um endereço local (blob).
export async function getImageUrl(url) {
  if (!url || /^(blob:|data:)/.test(url)) return url || null;
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(buildUrl(url), { headers });
  if (!res.ok) throw new ApiError(res.status, "Não foi possível carregar a imagem.");
  return URL.createObjectURL(await res.blob());
}

export const http = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body) => request("POST", path, { body }),
  put: (path, body) => request("PUT", path, { body }),
  patch: (path, body) => request("PATCH", path, { body }),
  delete: (path) => request("DELETE", path),
  postForm: (path, formData) => request("POST", path, { formData }),
};
