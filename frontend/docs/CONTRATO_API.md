# Contrato da API — EstoqAI

Este é o formato que o **frontend espera** do backend. Ele foi montado a partir do protótipo aprovado e das regras de negócio definidas pelo grupo. Será usado para comparar com o backend e listar o que precisa mudar.

- Base: `VITE_API_URL` (ex.: `http://localhost:3000`)
- Autenticação: `Authorization: Bearer <token>` em todas as rotas, exceto login e recuperação de senha.
- Erros: status HTTP adequado + `{ "mensagem": "texto para o usuário" }`.
- `401` = token inválido/vencido. `403` com a palavra "desativ" ou "token" na mensagem = usuário desativado (sessão encerrada na hora). Outros `403` = perfil sem permissão (só mostra a mensagem).
- Datas: `YYYY-MM-DD`; data e hora: `YYYY-MM-DD HH:mm`.

## Autenticação
| Rota | Corpo / resposta |
|---|---|
| `POST /usuarios/login` | `{ email, senha }` → `{ token, usuario }`. Usuário inativo: `403 "Cadastro desativado…"` (checado **antes** da senha). Erro de login: `401` com mensagem genérica. |
| `GET /usuarios/me` | → `usuario` (o frontend consulta a cada ~15 s; se o usuário foi desativado, devolver `403`). |
| `POST /usuarios/recuperar-senha/verificar` | `{ nome, dataNascimento, email, perfil }` → `{ chaveRecuperacao }` (chave temporária). Rota pública. Veja as regras abaixo. |
| `POST /usuarios/recuperar-senha/redefinir` | `{ chaveRecuperacao, novaSenha }` → `{ ok: true }`. Grava a nova senha (hash) e zera o contador de tentativas. |

**Regras da recuperação de senha**
- O nome é comparado sem diferenciar maiúsculas, acentos e espaços extras; data de nascimento, e-mail e perfil precisam bater com o cadastro.
- **3 tentativas por e-mail**, contadas no backend (inclusive para e-mails que não existem, para não revelar quais estão cadastrados). Mensagens sempre genéricas, sem dizer qual campo errou: `400` "Os dados informados não conferem. Você ainda tem N tentativa(s)." e, na 3ª, "Os dados informados não conferem. Procure um usuário administrador."
- Depois da 3ª falha, o e-mail fica **bloqueado sem prazo** (`423` "Recuperação de senha bloqueada. Procure um usuário administrador."). O bloqueio só sai por **login correto** ou quando um **Administrador redefine a senha** pela edição do usuário.
- Usuário inativo: `403` "Cadastro desativado…". Evitar a palavra "token" nas mensagens (o frontend a usa para detectar sessão inválida).
- Sugestão: script de emergência no backend para redefinir a senha do administrador (uso excepcional do grupo).

`usuario`: `{ id, nome, email, dataNascimento, perfil, ativo }` — perfil: `Administrador` | `Operador` | `Visualizador`.

## Dashboard
`GET /dashboard/resumo` → `{ produtosAtivos, produtosEstoqueBaixo, novosNaSemana, estoqueBaixo: [{ id, nome, quantidade, unidade, limite }], movimentacaoSemana: [{ dia, entradas, saidas }], atividadeRecente: [{ tipo: "entrada"|"saida", texto, quando }] }`

## Produtos
`produto`: `{ id, codigoBarras, nome, categoria, quantidade, unidade, descricao, palavrasChave[], limiteEstoqueBaixo, ativo, dataCadastro }`

| Rota | Observação |
|---|---|
| `GET /produtos?status=ativos\|inativos\|todos&busca=` | lista |
| `GET /produtos/:id` | detalhe |
| `GET /produtos/codigo/:codigoBarras` | `404` se não existe; `400` se inativo |
| `GET /produtos/ativos/busca?nome=` | só produtos **ativos** (saída por nome) |
| `PUT /produtos/:id` | produto inativo → `400` (reativar antes). **Não aceita alterar `quantidade`** (nem do Administrador): `400`. |
| `PATCH /produtos/:id/quantidade` | só Administrador. `{ quantidade, motivo }` → `produto`. `quantidade` inteira ≥ 0 e diferente da atual; `motivo` com **mínimo de 20 caracteres** (validar no backend). Produto inativo → `400`. Grava na auditoria: ação "Alterou quantidade manualmente", setor "Produtos", detalhes `<id> — <nome> — Motivo: <motivo>`, antes `Quantidade: X un`, depois `Quantidade: Y un`. |
| `PATCH /produtos/:id/desativar` e `/reativar` | exclusão é sempre lógica |

## Notas fiscais (entrada)
1. `POST /notas-fiscais/leitura` (multipart, campo `imagem`) → `{ leituraId, nomeSugerido, itens: [{ id, descricaoOriginal, quantidade, unidade, valorUnitario, produtoVinculado: { id, nome } | null }] }`
2. `POST /notas-fiscais` `{ leituraId, nome, itens: [{ id, produtoId|null, descricaoOriginal, quantidade, unidade, valorUnitario }] }` → `{ notaId, produtosNovos: [{ id, descricaoOriginal, quantidade, unidade }] }`. Soma ao estoque dos itens com `produtoId`.
3. `POST /notas-fiscais/:id/produtos-novos` `{ item, categoria, limiteEstoqueBaixo, descricao, palavrasChave[] }` → `produto` (cria o produto com a quantidade da NF e gera o código de barras).
4. `POST /notas-fiscais/:id/finalizar` → grava **uma única** entrada de auditoria `Deu entrada por NF - "<CNPJ>"`.
5. `GET /notas-fiscais?busca=&de=&ate=` → `[{ id, nome, data, usuarioResponsavel, quantidadeProdutos }]`
6. `GET /notas-fiscais/:id` → resumo + `{ imagemUrl, itens: [{ nome, quantidade, unidade, valorUnitario }] }`. A foto enviada na leitura deve ser **guardada** pelo backend e devolvida em `imagemUrl`. A rota da imagem exige login (`Authorization: Bearer`); o frontend baixa a imagem com o token e a exibe. A impressão da NF usa **somente essa foto**.

## Saídas
| Rota | Observação |
|---|---|
| `GET /saidas?busca=&de=&ate=` | `[{ id, data, usuarioResponsavel, quantidadeProdutos }]` |
| `GET /saidas/:id` | + `{ descricao, itens: [{ produtoId, nome, quantidade, unidade }] }` |
| `POST /saidas` | `{ itens: [{ produtoId, quantidade }], descricao }` → `{ id, alertasEstoqueMinimo: [nomes] }`. Quantidade ≤ estoque. |
| `PUT /saidas/:id` | só Administrador; ajusta o estoque pela diferença |
| `DELETE /saidas/:id` | só Administrador; devolve as quantidades ao estoque |

## Usuários (só Administrador)
`GET /usuarios?status=&busca=`, `POST /usuarios` `{ nome, dataNascimento, email, senha, perfil }`, `PUT /usuarios/:id`, `PATCH /usuarios/:id/desativar|reativar`. Nunca devolver a senha. E-mail repetido → `409`. O usuário não pode desativar o próprio cadastro: `PATCH /usuarios/:id/desativar` com o id do usuário logado → `400` "Você não pode desativar o seu próprio cadastro." (evita ficar sem administrador).

## Auditoria (só Administrador)
`GET /auditoria?setor=&usuario=&de=&ate=` → `[{ id, dataHora, usuario, acao, setor, detalhes, antes, depois }]`. Em `antes`/`depois`, uma linha por produto, separadas por `\n`. Produto novo na NF: só aparece em `depois`, com `(novo)` no fim da linha.

## Permissões por perfil
- **Administrador:** tudo (inclusive o ajuste manual de quantidade, com motivo).
- **Operador:** Dashboard, Nova entrada, Saída, Produtos (não altera quantidade), Notas fiscais, Saídas (só consulta).
- **Visualizador:** Dashboard, Produtos, Notas fiscais e Saídas (só consulta e impressão).
