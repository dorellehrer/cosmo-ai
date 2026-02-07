# Nova AI — Next.js Production Dockerfile
# Multi-stage build for AWS ECS Fargate deployment
# Uses Next.js standalone output for minimal image size

FROM node:22-alpine AS base

# ── Dependencies stage ─────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# ── Build stage ────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (dummy URL — generate doesn't connect to DB)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Build Next.js (standalone output)
# Dummy env vars needed at build time — some API route modules initialize
# SDK clients at module scope. These are never used for real requests.
ENV NEXT_TELEMETRY_DISABLED=1
ENV OPENAI_API_KEY="sk-dummy-build-key"
ENV NEXTAUTH_SECRET="dummy-build-secret"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="https://www.heynova.se"
RUN npm run build

# ── Production stage ───────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set up standalone output directory
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated client (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# Copy Prisma schema + migrations for runtime migration
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "const http = require('http'); const req = http.get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(3000, () => { req.destroy(); process.exit(1); });"

# Apply pending migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy 2>&1 || echo 'Migration skipped' && node server.js"]
