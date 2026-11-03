# EstoqAI — Backend

API em **Node.js + Express + SQLite** do sistema de estoque EstoqAI. Atende ao frontend React e às regras de negócio definidas pelo grupo.

## Como rodar

```bash
cd backend
npm install
cp .env.example .env     # depois edite o JWT_SECRET (instruções dentro do arquivo)
npm start                # ou: npm run dev  (reinicia sozinho ao salvar)
```

A API sobe em `http://localhost:3001/api`. Na primeira execução o banco (`src/database/database.sqlite`) é criado e entra o administrador inicial: **admin@estoqai.com / admin123** (troque a senha depois do primeiro acesso).

Para usar com o frontend: na pasta do frontend, `.env` com `VITE_USE_MOCK=false` e `VITE_API_URL=http://localhost:3001/api`, depois `npm run dev`. O endereço do frontend precisa estar em `CORS_ORIGIN` (já vem o padrão do Vite).

## Testes

```bash
npm test
```

Sobe a API com um banco temporário e executa 13 cenários que seguem o roteiro de aceitação (login, sessão derrubada na hora, recuperação de senha, entrada por NF, saídas, ajuste manual, auditoria, dashboard, permissões e concorrência). Não mexe no seu banco real.

## Estrutura

```
src/
  server.js          sobe o servidor (depois que o banco está pronto)
  app.js             rotas, CORS e tratamento de erros
  config/            jwt.js (segredo vem do .env) e upload.js (pasta das fotos)
  database/db.js     tabelas + funções de acesso (executar/buscarUm/buscarTodos/transacao)
  middlewares/       authMiddleware (login/perfil) e uploadMiddleware (foto da NF)
  routes/            uma rota por assunto, com as permissões de cada perfil
  controllers/       regras de negócio e respostas HTTP
  repositories/      consultas SQL
  services/          ocrService.js  <- ponto de encaixe da leitura da nota (OCR)
  utils/             datas, textos, identificadores (EST-0001...), serializadores, erros
tests/api.test.js
```

## O que o sistema faz

- **Estoque simples.** A quantidade fica na coluna `quantidade` do produto. Auditoria em `/api/auditoria`.
- **Produtos:** categoria, quantidade, palavras-chave, limite de estoque baixo e `ativo`. O código de barras é gerado pelo sistema. Não há cadastro avulso nem exclusão física (só desativar e reativar).
- **Usuários:** `/me`, desativar e reativar, `409` para e-mail repetido, bloqueio de auto-desativação e recuperação de senha (3 tentativas por e-mail, bloqueio sem prazo).
- **Sessão:** o middleware consulta o banco a cada requisição; usuário desativado perde o acesso na hora. Token inválido responde `401`.
- **Notas fiscais:** entrada **tudo-ou-nada**. Leitura, confirmação e cadastro dos produtos novos só guardam um *rascunho*; o estoque, a criação dos produtos e a auditoria acontecem juntos, numa única transação, no `/finalizar`. A foto fica em `uploads/notas`, servida só com login.
- **Saídas** com vários itens (registrar, editar e excluir ajustam o estoque) e **dashboard**.
- **Auditoria** completa (setor, antes e depois), só para Administrador.
- **Segurança:** segredo do JWT no `.env`; erros técnicos não vão para o usuário; CORS restrito; `.env` fora do Git.
- Respostas em camelCase e `id` com prefixo (`EST-0001`, `NF-0001`, `SAI-0001`, `LOG-0001`, `USR-0001`), que é o que o frontend mostra na tela. No banco continuam números.

## Ligando o OCR

Edite só o arquivo `src/services/ocrService.js`: a função `lerNota(caminhoDaImagem, produtosAtivos)` hoje devolve uma nota de exemplo. Mantenha o formato de saída descrito no comentário do topo do arquivo e o resto do sistema continua funcionando. O `nomeSugerido` precisa conter `CNPJ 00.000.000/0000-00` (a auditoria usa esse trecho).

## Pontos para ter em mente

- Se o usuário abandonar uma entrada no meio, nada muda no estoque: o rascunho fica parado e é apagado (junto com a foto) na próxima entrada iniciada depois de 24 horas. O código de barras reservado para a etiqueta daquela entrada simplesmente não é usado.
- O sistema usa **uma** conexão com o SQLite e uma fila interna (em `db.js`) para que duas requisições simultâneas não se misturem. Para o tamanho do projeto isso é suficiente.
- O banco e as fotos ficam em disco local; faça backup de `src/database/database.sqlite` e de `uploads/`.
- Fuso horário das datas gravadas: `TZ` no `.env` (padrão `America/Sao_Paulo`).
- `npm audit` aponta avisos em dependências de *instalação* do `sqlite3` (node-gyp). Não afetam a execução; a correção exigiria trocar de versão do `sqlite3` e deve ser avaliada à parte.