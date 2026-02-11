# Nova AI Agent Container
# Runs as an isolated per-user AI agent on AWS ECS Fargate
# Each user gets their own container — zero data leakage between users

FROM node:22-slim AS base

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# ── Build stage ──────────────────────────────
FROM base AS builder

COPY agent/package.json agent/package-lock.json* ./
RUN npm ci --production=false

COPY agent/ .
RUN npm run build 2>/dev/null || true

# ── Runtime stage ────────────────────────────
FROM base AS runtime

# Non-root user for security
RUN groupadd -r nova && useradd -r -g nova -m nova

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Agent data directory (sessions, memory, skills)
RUN mkdir -p /data/sessions /data/memory /data/skills /data/workspace \
    && chown -R nova:nova /data

# Environment variables (overridden by ECS task definition)
ENV NODE_ENV=production
ENV PORT=18789
ENV HEALTH_PORT=18790
ENV DATA_DIR=/data
ENV NOVA_AGENT_ID=""
ENV NOVA_USER_ID=""
ENV DATABASE_URL=""
ENV MODEL_PROVIDER="openai"
ENV MODEL_NAME="gpt-5-mini"
ENV API_KEY_SECRET_ARN=""
ENV AGENT_NAME="Nova"
ENV AGENT_PERSONALITY="friendly"

# Expose WebSocket control plane and health check
EXPOSE 18789 18790

USER nova

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:18790/health || exit 1

CMD ["node", "dist/index.js"]
