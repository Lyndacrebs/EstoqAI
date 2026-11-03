// Configurações lidas do arquivo .env (veja .env.example)

// Endereço da API do backend
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// true = modo de teste (dados falsos, sem backend). Só vira "API real" se VITE_USE_MOCK=false
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
