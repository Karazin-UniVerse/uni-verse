FROM node:26-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/usr/local/share/corepack"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat openssl
RUN mkdir -p /usr/local/share/corepack && chmod -R 777 /usr/local/share/corepack
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @universe/backend build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder --chown=node:node /app /app

USER node
EXPOSE 3001

WORKDIR /app/packages/backend
CMD ["node", "dist/main"]
