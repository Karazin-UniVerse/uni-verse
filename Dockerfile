FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm install
RUN pnpm --filter @universe/backend build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app /app

EXPOSE 3001

CMD ["pnpm", "--filter", "@universe/backend", "start:prod"]
