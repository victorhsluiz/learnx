# Architecture

LearnX is a monolithic, fullstack Next.js (App Router) application. There is
no separate backend process: the "backend" is the set of Route Handlers
under `src/app/api/v1/**`, backed by a layered architecture in `src/core`
and `src/modules`.

## Layers

Every feature module follows the same four layers, each with a single
responsibility (Single Responsibility Principle):

```
Route Handler (src/app/api/v1/**/route.ts)
        │  thin: parses the request, delegates to a controller
        ▼
Controller (modules/<name>/<name>.controller.ts)
        │  validates the DTO (zod), calls the service, shapes the response
        ▼
Service (modules/<name>/<name>.service.ts)
        │  business rules, orchestration; depends on a repository
        │  *interface*, never on Prisma directly
        ▼
Repository (modules/<name>/<name>.repository.ts)
        │  implements the module's repository interface using Prisma
        ▼
PostgreSQL (via src/core/database/prisma.ts)
```

**Dependency direction always points down and toward interfaces**, not
concrete implementations (Dependency Inversion Principle): a service depends
on a `WordRepository` interface, not on `PrismaWordRepository`. This is what
makes it possible to swap in a fake repository in unit tests without
touching the service's code.

Each module owns its own request/response shapes (DTOs) and the mapping
between its Prisma model and its API representation, so a module can be
read and modified in isolation (Open/Closed-friendly: extending one module
doesn't require touching another).

## Route Handlers as the only HTTP boundary

There are no Server Actions in this app. Every read/write goes through a
versioned REST endpoint under `/api/v1/**`, called from the frontend via a
thin `apiClient`. This keeps the contract explicit, testable independently
of any UI, and consistent with treating the app as "a real backend" for the
purposes of this project (see the README for why that matters here).

### `withRoute()`

Route handlers are wrapped in `withRoute()`
(`src/core/http/with-route.ts`), which centralizes error handling so
individual controllers don't each need their own try/catch:

- An `AppError` (or subclass, see below) is mapped to its own
  `status`/`code`/`message`.
- A `ZodError` (thrown by `schema.parse(...)`) is mapped to `422
VALIDATION_ERROR`, with each failing field listed in `error.details.issues`.
- Anything else is treated as a bug: logged server-side via `console.error`,
  and mapped to a generic `500 INTERNAL_ERROR` — the real message/stack is
  never sent to the client.

Because Next.js 16 always passes a context argument to route handlers (even
when there are no dynamic params, it's `{ params: Promise<{}> }`),
`withRoute` accepts and forwards that context untyped by default, or typed
via the generated `RouteContext<'/path/[id]'>` helper for dynamic routes:

```ts
export const GET = withRoute<RouteContext<"/api/v1/words/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser(request);
  const word = await wordService.getById(user.id, id);
  return ok(word);
});
```

### Response envelope

Every response follows one of two shapes, produced by the helpers in
`src/core/http/responses.ts`:

```ts
// success (ok / created)
{ "data": { ... }, "meta"?: { ... } }

// error (fail — usually via withRoute, not called directly)
{ "error": { "code": "NOT_FOUND", "message": "...", "details"?: ... } }
```

`meta` is used for pagination info (see below) and other response-level
metadata; it's omitted when there's nothing to report.

### Pagination

List endpoints accept `?page=&pageSize=` query params, parsed by
`parsePagination()` (`src/core/http/pagination.ts`) into `{ page, pageSize,
skip, take }` — `skip`/`take` map directly to Prisma's options. Invalid or
out-of-range values silently fall back to defaults (page 1, page size 20,
capped at 100) rather than failing the request, since pagination is a
convenience, not a strict contract. `buildPaginationMeta()` turns a params
object plus a total count into the `meta` block returned to the client.

### Errors

`src/core/errors/app-error.ts` defines `AppError` and the subclasses used
across the app: `ValidationError` (422), `UnauthorizedError` (401),
`ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409).
Services and repositories throw these directly — e.g. a repository throws
`ConflictError` on a unique constraint violation, a service throws
`NotFoundError` when a lookup by id scoped to the current user returns
nothing. `withRoute()` is the only place that knows how to turn an `AppError`
into an HTTP response.

### Authentication

`requireUser(request)` (`src/core/http/require-user.ts`) is what a
controller calls to get the current user's id, throwing `UnauthorizedError`
if there's no valid session. **JWT verification is not implemented yet** —
this is a deliberate placeholder that always throws until the auth module
(access/refresh tokens, `core/security/jwt.ts`) is built. No route can
accidentally treat an unauthenticated request as authenticated in the
meantime.

## Dependency injection: the container

`src/core/container/container.ts` is the composition root: the one place in
the app where a concrete repository implementation is paired with a
service via constructor injection, and exported ready to use. Controllers
import services from the container; they never construct a repository or
service themselves.

```ts
// inside container.ts, once the words module exists
const wordRepository = new PrismaWordRepository(prisma);
export const wordService = new WordService(wordRepository);
```

```ts
// inside the words controller
import { wordService } from "@/core/container";
```

This is a plain object, not a DI framework — intentionally. The app is
small enough that a framework would add ceremony without a corresponding
benefit; the container exists to keep the _wiring_ in one place, not to
provide runtime reflection or lifecycle management.

## Data access

`src/core/database/prisma.ts` exports a single `PrismaClient` instance
(built with the `@prisma/adapter-pg` driver adapter, see
`docs/` and the Prisma section of the README for why), cached on
`globalThis` to survive Next.js's dev-mode hot reloads without opening a
new connection pool on every edit.

`src/core/database/repository.ts` defines the base `Repository<Entity,
CreateInput, UpdateInput>` interface every module's repository interface
extends. `userId` is part of the base contract, not repeated ad-hoc per
method, because every domain entity in this single-user-per-account app is
scoped to a user.

## Environment configuration

`src/core/config/env.ts` validates `process.env` against a zod schema once,
lazily (via a `Proxy`), and caches the result. Misconfiguration (a missing
or invalid variable) throws immediately with every failing variable listed,
instead of surfacing as a confusing runtime error somewhere deep in the
code the first time that variable is actually used.

## Testing

Tests live under `tests/`, split into three Vitest projects (see
`vitest.config.ts`):

- **unit** (`tests/unit`) — no I/O. Services are tested against a fake
  repository implementing the module's interface; pure helpers
  (`with-route`, `pagination`, `env`) are tested directly.
- **integration** (`tests/integration`) — exercises route handlers against
  a real database (`TEST_DATABASE_URL`, a separate `learnx_test` database so
  these never touch dev data).
- **ui** (`tests/ui`) — component tests with Testing Library + jsdom.

## Deliberately left out (for now)

This project intentionally leaves some things unimplemented so there's real
work to practice on top of a working, well-organized base. See
`docs/roadmap.md` (added once there's more to list) for the running list —
things like SRS scheduling, RBAC, rate limiting, and moving from this
lightweight layered style toward tactical DDD are deliberately not done yet.
