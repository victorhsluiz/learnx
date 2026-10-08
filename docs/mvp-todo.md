# O que falta para o MVP

Este documento lista **apenas** o que falta para o app funcionar de ponta a
ponta como MVP usável no dia a dia. Não inclui polimento, testes extras ou
melhorias — isso fica em `docs/roadmap.md` (a criar na Task 17) para as
tasks de treinamento.

Já feito: autenticação completa (registro/login/sessão/refresh/logout),
shell do frontend, módulo Lessons (API+UI), módulo Notes (API only).

## 1. Notes — UI (falta da Fase 2) ✅ feito

- [x] Página `/notes`: lista com busca por texto, recorte do conteúdo,
      filtro por aula
- [x] Editor: textarea de Markdown + preview (biblioteca leve, ex.
      `react-markdown`)
- [x] Seletor de aula (dropdown com as lessons do usuário, opcional)
- [x] Criar/editar/excluir nota

Sem isso, notas só existem via API — inútil pro uso real.

## 2. Vocabulário (Fase 3 completa — API + UI)

Núcleo do app (registrar palavras aprendidas). Sem isso não há
"gerenciador de estudos" de verdade.

- [ ] Model `Word` no Prisma (hanzi, pinyin, translation, notes?,
      learnedAt, lessonId?, tags, partOfSpeech?) + unicidade
      `(userId, hanzi, pinyin)`
- [ ] CRUD API com filtros (q, tag, lessonId, intervalo de data) — mesmo
      padrão de camadas já usado
- [ ] UI: tabela com busca/filtros, formulário rápido de adição (foco em
      digitar rápido no fim do estudo)
- [ ] Agrupamento simples por dia/aula (pode ser só um filtro, não
      precisa de agregação sofisticada)

## 3. Cronograma (Fase 4 — pode simplificar bastante)

O plano original tinha recorrência (`NONE|DAILY|WEEKLY`) + geração de
ocorrências + cronômetro de sessões. Para o MVP, **simplificar**:

- [ ] Model `StudyTask` **sem recorrência** por agora: título, tipo,
      data, status (pendente/feito), minutos estimados/reais opcionais
- [ ] API CRUD simples (sem geração de ocorrências)
- [ ] UI: lista por data (não precisa ser grade semanal completa), marcar
      feito/pulado

Recorrência e cronômetro de sessão em tempo real ficam pro roadmap — dá
pra logar minutos manualmente por ora.

## 4. Dashboard com dados reais

Hoje é placeholder. Mínimo pro MVP:

- [ ] Contagem de palavras aprendidas (total e últimos 7 dias)
- [ ] Aulas concluídas vs pendentes
- [ ] Tarefas do cronograma pendentes hoje/na semana

Não precisa de streak, gráficos ou agregações elaboradas — só números
simples via query direta.

## 5. Coisas pequenas que travam o uso real

- [ ] Seed com dados de exemplo mais completos (hoje só cria 1 usuário
      demo)
- [ ] `README.md` com passo a passo de setup (clonar → `.env` → migrate
      → seed → `npm run dev`)

---

## Fora do MVP (fica pro roadmap / tasks de treinamento)

Recorrência de cronograma, cronômetro de sessões, SRS, tags como
entidade, import/export CSV, áudio/TTS, busca full-text, editor rico,
multi-usuário/RBAC, rate limiting, observabilidade, OpenAPI, cache, PWA,
i18n, CI, testes de UI adicionais.

## Estimativa de esforço

Os itens 1-4 seguem exatamente o mesmo padrão já estabelecido (schema →
repository → service → controller → rotas → UI), então cada um é
mecânico de replicar. O item 3 (cronograma) é o mais rápido justamente
por ter sido simplificado.
