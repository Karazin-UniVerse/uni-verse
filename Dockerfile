FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm --filter @universe/backend build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder --chown=node:node /app /app

USER node
EXPOSE 3001

CMD ["pnpm", "--filter", "@universe/backend", "start:prod"]