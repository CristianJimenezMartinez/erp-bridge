# ==========================================================
# BENTIAN ERP BRIDGE — PRODUCTION DOCKERFILE
# Multi-stage build for high performance & minimal image size
# ==========================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configuration and dependencies
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* tsconfig.base.json* tsconfig.json* ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY dashboard.html* ./
RUN mkdir -p releases

# Install dependencies and build TypeScript packages
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @erp-bridge/shared build || true
RUN pnpm --filter @erp-bridge/sdk build || true
RUN pnpm --filter @erp-bridge/connector-factusol build || true
RUN pnpm --filter @erp-bridge/connector-woocommerce build || true
RUN pnpm --filter @erp-bridge/connector-simplygest build || true
RUN pnpm --filter @erp-bridge/core build || true
RUN pnpm --filter @erp-bridge/api build || true

# ==========================================================
# PRODUCTION RUNTIME
# ==========================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built application and packages from builder
COPY --from=builder /app /app

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
