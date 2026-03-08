FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Prune monorepo to only web's dependencies
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune @onecli/web --docker

# Install dependencies (cached unless package.json/lockfile changes)
FROM base AS deps
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @onecli/db generate
# Dummy DATABASE_URL prevents PGlite from initializing during static page generation
RUN --mount=type=cache,target=/app/apps/web/.next/cache \
    DATABASE_URL="postgresql://build:build@localhost/build" \
    pnpm build --filter=@onecli/web

# Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NO_COLOR=1
ENV FORCE_COLOR=0
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

# Copy Prisma migrations and init script for PGlite mode
COPY --from=builder --chown=node:node /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=node:node /app/packages/db/scripts ./packages/db/scripts

# Install PGlite dependencies for embedded DB mode
RUN cd packages/db && npm init -y > /dev/null 2>&1 && \
    npm install @electric-sql/pglite@0.3.15 prisma@6

# Entrypoint: run migrations then start server
COPY --from=builder --chown=node:node /app/apps/web/entrypoint.sh ./apps/web/entrypoint.sh
RUN chmod +x ./apps/web/entrypoint.sh

USER node

EXPOSE 3000
CMD ["./apps/web/entrypoint.sh"]
