# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# The ENV values flagged by this rule below are inert placeholders used
# only to satisfy build-time env validation (see the comment above them),
# not real secrets. Real secrets are injected at container start, never
# baked into this image.

# --- Base ---------------------------------------------------------------
# Pinned Node LTS matching the version used in development (see package.json
# engines once defined). Alpine keeps the final image small.
FROM node:24.16.0-alpine AS base
WORKDIR /app

# --- Dependencies ---------------------------------------------------------
# Installed in their own stage so this layer is cached as long as
# package*.json don't change, independent of source code changes.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma Client is generated from prisma/schema.prisma into
# src/generated/prisma and must exist before `next build` type-checks and
# bundles the app.
RUN npx prisma generate

# `next build` evaluates route handlers to determine which are static vs
# dynamic, which imports core/database/prisma.ts and therefore validates
# env vars (see core/config/env.ts). Real secrets are never baked into the
# image — they're injected at container start (see docker-compose.yml) —
# so build-time-only placeholders satisfy that validation here. They are
# not used for any actual database connection during the build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV JWT_ACCESS_SECRET="build-time-placeholder-not-used-at-runtime00"
ENV JWT_REFRESH_SECRET="build-time-placeholder-not-used-at-runtime0"
RUN npm run build

# --- Runtime ----------------------------------------------------------------
# Next.js "standalone" output (see next.config.ts) produces a minimal
# server bundle with only the node_modules actually used at runtime, so we
# don't need to reinstall or copy the full node_modules tree here.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Database migrations are NOT run from this image. Run them separately
# (e.g. `npm run db:migrate:deploy` from CI, or docker compose --profile
# migrate) before starting this container — see docker-compose.yml.
CMD ["node", "server.js"]
