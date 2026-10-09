# ==========================================================
# BENTIAN ERP BRIDGE — PRODUCTION DOCKERFILE
# Multi-stage build for high performance & minimal image size
# ==========================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm (LTS v9)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace configuration and dependencies
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* tsconfig.base.json* tsconfig.json* ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY dashboard.html* ./
RUN mkdir -p releases

# Install dependencies and build TypeScript packages
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @erp-bridge/shared build
RUN pnpm --filter @erp-bridge/sdk build
RUN pnpm --filter @erp-bridge/connector-factusol build
RUN pnpm --filter @erp-bridge/connector-woocommerce build
RUN pnpm --filter @erp-bridge/connector-simplygest build
RUN pnpm --filter @erp-bridge/core build
RUN pnpm --filter @erp-bridge/api build

# ==========================================================
# PRODUCTION RUNTIME
# ==========================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built application and packages from builder as unprivileged user
COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
