# LearnX

LearnX é um rastreador pessoal de estudo de mandarim: aulas (gravadas ou em
grupo), notas em Markdown, vocabulário aprendido e um cronograma de tarefas
de estudo, tudo organizado por usuário.

## Pré-requisitos

- **Node.js 24.x** (a imagem Docker do projeto usa `node:24.16.0-alpine`; não
  há `.nvmrc` nem `engines` fixados no `package.json`, mas recomenda-se essa
  versão)
- **npm**
- **PostgreSQL** rodando localmente (ou acessível pela rede), **ou**
  **Docker Desktop** se preferir usar o `docker-compose.yml` para a aplicação
  (veja a seção [Alternativa via Docker Compose](#alternativa-via-docker-compose) —
  o Postgres em si não é containerizado por este compose)

## Clonar e instalar

```bash
git clone <repository-url>
cd learnx
npm install
```

## Configurar variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Variáveis definidas em `.env.example` (ver `src/core/config/env.ts` para as
regras de validação):

| Variável             | Descrição                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | Ambiente de execução. Padrão `development`.                                                                               |
| `DATABASE_URL`       | String de conexão do PostgreSQL usada pelo Prisma.                                                                        |
| `TEST_DATABASE_URL`  | Opcional. Banco separado usado apenas pelo projeto `integration` do Vitest. Se omitido, cai de volta para `DATABASE_URL`. |
| `JWT_ACCESS_SECRET`  | Segredo para assinar tokens de acesso JWT. Mínimo de 32 caracteres.                                                       |
| `JWT_REFRESH_SECRET` | Segredo para assinar tokens de refresh JWT. Mínimo de 32 caracteres.                                                      |

Gere segredos aleatórios para os dois `JWT_*_SECRET` com:

```bash
openssl rand -base64 48
```

## Banco de dados

Com `DATABASE_URL` apontando para um Postgres acessível, aplique as
migrations:

```bash
npm run db:migrate
```

Em um ambiente de deploy (sem gerar novas migrations), use:

```bash
npm run db:migrate:deploy
```

## Seed de dados de exemplo

```bash
npm run db:seed
```

Isso cria um usuário de demonstração com login:

- **Email**: `demo@learnx.dev`
- **Senha**: `learnx-demo123`

junto com um conjunto realista de dados de exemplo para esse usuário: 8
aulas (gravadas e em grupo, em diferentes status), 6 notas (algumas ligadas
a aulas, outras independentes), 24 palavras de vocabulário (nível HSK1) e 8
tarefas de estudo espalhadas entre passado, hoje e os próximos dias. O
comando é seguro para rodar mais de uma vez: se o usuário de demonstração já
tiver dados relacionados, eles não são duplicados.

## Rodando em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login com as
credenciais de demonstração acima.

## Testes

```bash
npm run test              # todos os testes
npm run test:unit         # apenas o projeto "unit"
npm run test:integration  # apenas o projeto "integration" (requer TEST_DATABASE_URL ou DATABASE_URL)
npm run test:ui           # apenas o projeto "ui"
```

Para rodar a verificação completa usada antes de commits (typecheck + lint +
format:check + test):

```bash
npm run verify
```

## Lint, formatação e tipos

```bash
npm run lint         # eslint
npm run lint:fix      # eslint --fix
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm run typecheck      # tsc --noEmit
```

## Alternativa via Docker Compose

O `docker-compose.yml` define dois serviços para rodar a aplicação (não o
banco de dados — o PostgreSQL precisa estar disponível separadamente, no
host ou em outro container):

- **`app`**: builda a imagem a partir do `Dockerfile` e expõe a aplicação
  Next.js na porta `3000`. Lê `DATABASE_URL`, `JWT_ACCESS_SECRET` e
  `JWT_REFRESH_SECRET` do ambiente. Espera alcançar o Postgres via
  `host.docker.internal` (mapeado via `extra_hosts`).
- **`migrate`** (perfil `migrate`, não inicia por padrão): roda
  `prisma migrate deploy` uma única vez contra o `DATABASE_URL` configurado.
  Útil para aplicar migrations antes de subir o `app`:

  ```bash
  docker compose --profile migrate run --rm migrate
  ```

Depois de aplicar as migrations, suba a aplicação:

```bash
docker compose up app
```

Ajuste `DATABASE_URL` no seu `.env` para apontar para um Postgres alcançável
a partir do container (veja os comentários em `docker-compose.yml` para
detalhes sobre Docker Desktop vs. Docker Engine nativo no Linux).
