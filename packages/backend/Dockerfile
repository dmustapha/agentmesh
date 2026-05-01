# AgentMesh Backend — Dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/ ./packages/
RUN pnpm --filter backend build

FROM alpine:latest AS axl-build
RUN apk add --no-cache go gcc musl-dev
WORKDIR /axl
COPY axl/ ./
RUN GOTOOLCHAIN=go1.25.5 go build -o /usr/local/bin/axl-node ./cmd/node/

FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=axl-build /usr/local/bin/axl-node /usr/local/bin/axl-node
RUN chmod +x /usr/local/bin/axl-node
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY packages/backend/package.json ./packages/backend/
EXPOSE 3001
CMD ["node", "packages/backend/dist/index.js"]
