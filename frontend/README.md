# EstoqAI — Frontend

Sistema web de controle de estoque (React + Vite + Tailwind). Telas: Login, Dashboard, Nova entrada (NF), Saída de estoque, Produtos, Notas fiscais, Saídas, Auditoria e Usuários.

## Como rodar

```bash
npm install
cp .env.example .env     # no Windows: copy .env.example .env
npm run dev              # abre em http://localhost:5173
```

Para gerar a versão final: `npm run build` (arquivos em `dist/`).

## Dois modos de funcionamento (arquivo `.env`)

| Variável | Valor | O que faz |
|---|---|---|
| `VITE_USE_MOCK` | `true` (padrão) | Usa dados de teste dentro do próprio navegador. **Não precisa do backend.** Ao recarregar a página (F5), os dados voltam ao início. |
| `VITE_USE_MOCK` | `false` | Fala com o backend de verdade, no endereço de `VITE_API_URL` (ex.: `http://localhost:3000`). |

Logins do modo de teste (senha `12345678`): `usuarioteste1@empresa.com` (Administrador), `usuarioteste2@empresa.com` (Operador), `usuarioteste3@empresa.com` (Visualizador), `usuarioteste4@empresa.com` (inativo). Também existe `admin@estoqai.com` / `admin`.

## Onde mexer em cada coisa

```
src/
  pages/        uma pasta por tela (Dashboard, Produtos, Saidas, ...)
  components/   ui/ (filtros, janela, botão imprimir, código de barras...) e layout/ (menu lateral, proteção de rotas)
  services/     api.js (porta única de dados) · http.js (rede) · real/realApi.js (backend) · mock/ (dados de teste)
  contexts/     AuthContext (login, sessão, usuário desativado)
  hooks/        useFetch, useDebounce
  utils/        datas, textos, perfis/menu, impressão
  styles/       tokens.css (cores), components.css, layout.css, login.css, base.css
docs/CONTRATO_API.md   formato que o frontend espera do backend
```

- **Trocar cores/identidade visual:** `src/styles/tokens.css`.
- **Mudou uma rota ou campo do backend:** só `src/services/real/realApi.js` (as telas não mudam).
- **Mudou permissão de perfil / menu:** `src/utils/roles.js`.

Obs.: o estilo é dividido em arquivos `.css` (cores, cartões, botões, menu, login) e em classes utilitárias do Tailwind escritas direto no JSX para espaçamentos e alinhamentos.

## Subir no GitHub em uma branch separada

```bash
git clone https://github.com/Lyndacrebs/EstoqAI.git
cd EstoqAI
git checkout -b frontend-gabrielle
# substitua o conteúdo da pasta frontend/ por este projeto (sem node_modules e dist)
git add .
git commit -m "Frontend real em React"
git push -u origin frontend-gabrielle
```

## Orientação de uso

- **Mantenha pelo menos dois administradores ativos.** O sistema não deixa ninguém desativar o próprio cadastro, e um administrador pode redefinir a senha do outro. Se houver só um e ele ficar bloqueado na recuperação de senha, só dá para resolver mexendo direto no banco de dados.
- **Recuperação de senha:** cada e-mail tem 3 tentativas. Depois disso o bloqueio só sai com um login correto ou quando um administrador redefine a senha pela edição do usuário.
- **Alterar a quantidade de um produto na mão** é feito só pelo Administrador, pelo lápis ao lado do campo, com motivo de no mínimo 20 caracteres (fica na Auditoria).

## Observações

- A leitura do código de barras pela câmera só funciona em `localhost` ou em `https://`.
- A leitura da NF por IA, no modo de teste, devolve sempre os mesmos itens de exemplo.
- No computador, o botão "Usar câmera do celular" mostra um aviso (a câmera nativa só abre em celular/tablet); use "Subir uma foto".
- Fontes são carregadas do Google Fonts; sem internet o sistema usa a fonte padrão do navegador.
