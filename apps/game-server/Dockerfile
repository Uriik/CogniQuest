FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Prune the workspace to extract the required packages for game-server
FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@cogniquest/game-server --docker

# 2. Add lockfile and install dependencies
FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
COPY tsconfig.base.json tsconfig.base.json
RUN pnpm turbo run build --filter=@cogniquest/game-server...

# 3. Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy built outputs and dependencies
COPY --from=installer --chown=nestjs:nodejs /app/ .

WORKDIR /app/apps/game-server
EXPOSE 3001
ENV PORT=3001

CMD ["npx", "tsx", "src/main.ts"]
