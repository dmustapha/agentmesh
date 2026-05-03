# AgentMesh Backend — Dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ ./packages/
RUN pnpm --filter backend build

FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache openssl
# Use pre-built Linux binary — works on any x86_64 cloud host
COPY axl/node-linux-amd64 /usr/local/bin/axl-node
RUN chmod +x /usr/local/bin/axl-node
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"]
