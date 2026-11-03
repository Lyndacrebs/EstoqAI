// Guarda o token de login e os dados do usuário no navegador

const TOKEN_KEY = "estoqai_token";
const USER_KEY = "estoqai_usuario";

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function saveSession(token, usuario) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  } catch { /* navegador sem armazenamento: segue sem salvar */ }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* nada a fazer */ }
}
