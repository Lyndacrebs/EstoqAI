import { USE_MOCK } from "../config/env";
import { mockApi } from "./mock/mockApi";
import { realApi } from "./real/realApi";

/*
  Porta única de acesso aos dados. As telas só importam "api" daqui.
  VITE_USE_MOCK=true  -> dados de teste (sem backend)
  VITE_USE_MOCK=false -> backend real (VITE_API_URL)
*/
export const api = USE_MOCK ? mockApi : realApi;
