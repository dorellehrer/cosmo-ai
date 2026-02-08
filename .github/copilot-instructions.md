# Nova AI — Copilot Instructions

## Architecture Overview

Next.js 16 App Router application (React 19, TypeScript) — a freemium AI chat assistant ("Nova") with Stripe billing, NextAuth v4, Prisma 7 on PostgreSQL/AWS RDS, and multi-model AI (GPT-5 Mini, GPT-5.2, Claude Sonnet 4.5, Claude Opus 4.6, GPT-5.2 Pro) with a credit-based billing system. Tailwind CSS v4 (CSS-first, no JS config file). Includes a personal AI agent platform where each user gets an isolated AWS ECS Fargate container. Production deployment uses `output: 'standalone'` with Docker on ECS.

Path alias: `@/*` → `./src/*`. All imports use this alias.

## Authentication

- **NextAuth v4** (not v5/Auth.js) with JWT strategy — no Prisma adapter. OAuth user records are created/updated manually in the `signIn` callback in [src/lib/auth.ts](src/lib/auth.ts).
- Middleware ([src/middleware.ts](src/middleware.ts)) handles page-level redirects only. Protected routes: `/chat`, `/settings`, `/agent`. **API routes must self-guard** with `getServerSession(authOptions)` and check `session?.user?.id`.
- Session/JWT types are augmented in [src/types/next-auth.d.ts](src/types/next-auth.d.ts) to include `id: string`.
- Signup is a standalone POST endpoint at `/api/auth/signup` (bcrypt, 12 rounds).

## API Route Conventions

Every API route follows this pattern:
1. `getServerSession(authOptions)` → 401 if no `session.user.id`
2. Prisma queries always filter by `userId: session.user.id` (ownership)
3. Wrap in try/catch, `console.error` for logging, return `NextResponse.json({ error })` with proper status
4. Next.js 16: dynamic route params require `await params` (e.g., `const { id } = await params`)
5. Rate limit using `checkRateLimit()` from [src/lib/rate-limit.ts](src/lib/rate-limit.ts) — presets: `RATE_LIMIT_API`, `RATE_LIMIT_CHAT`, `RATE_LIMIT_AUTH`, `RATE_LIMIT_AGENT_PROVISION`
6. Public endpoints (e.g., `/api/health`) skip auth but still benefit from rate limiting

## Database (Prisma)

- **PostgreSQL on AWS RDS**. All DB access goes through Prisma. No external SDKs.
- Client generated to `src/generated/prisma/` (not node_modules) — these files are committed.
- Global singleton in [src/lib/prisma.ts](src/lib/prisma.ts) cached on `globalThis` to survive HMR.
- Models: `User`, `Conversation`, `Message`, `UsageRecord`, `AgentInstance`, `AgentSession`, `AgentMemory`, `AgentChannel`, `AgentSkill`. All IDs use `cuid()`.
- `UsageRecord.date` is a `String` in `YYYY-MM-DD` format (not DateTime) with composite unique `[userId, date]`.
- After schema changes: `npx prisma migrate dev` then `npx prisma generate`.

## Chat & AI Streaming

- Chat route ([src/app/api/chat/route.ts](src/app/api/chat/route.ts)) uses the **OpenAI SDK directly** with manual SSE streaming (a custom `ReadableStream`). The `ai` npm package is installed but unused.
- SSE event types: `conversationId`, `content`, `title`, `done`.
- Auto-generates conversation titles after the first user+assistant exchange via a separate OpenAI call.
- Client parses SSE via `ReadableStream` reader in [src/app/chat/[[...id]]/page.tsx](src/app/chat/[[...id]]/page.tsx).

## Billing (Stripe)

- Two tiers defined in [src/lib/stripe.ts](src/lib/stripe.ts): Free (50 msgs/day, $0) and Pro (unlimited, $20/mo).
- `isPro()` checks `stripeSubscriptionId` existence + `subscriptionEnd` not past — no DB query, pure field check.
- Webhook at `/api/stripe/webhook` handles `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`. Uses raw body + signature verification.
- **Caution**: tier config is duplicated in the pricing page — keep in sync with `src/lib/stripe.ts`.

## Internationalization (next-intl)

- 10 locales (en, es, zh, hi, ar, pt, fr, de, ja, sv). Default: `en`. Arabic is RTL.
- Locale resolved from `NEXT_LOCALE` cookie → `Accept-Language` header → fallback `en`. No URL-based routing.
- Server components: `const t = await getTranslations('namespace')`. Client components: `useTranslations('namespace')`.
- Messages in `src/i18n/messages/{locale}.json`. All user-facing strings must be translated.

## Context & State Patterns

All 4 contexts in `src/contexts/` follow identical structure:
- `'use client'`, createContext + Provider + `useXxx()` hook (throws if outside provider)
- State persisted to `localStorage` with `nova-*` prefixed keys (e.g., `nova-notifications`, `nova-integrations`)
- `isLoaded` guard prevents writing before initial localStorage read

Provider hierarchy (order matters — IntegrationsContext depends on NotificationsContext):
```
SessionProvider → NotificationsProvider → IntegrationsProvider → VoiceSettingsProvider → KeyboardShortcutsProvider
```

## Component Conventions

- PascalCase filenames, named exports. `'use client'` only where needed.
- Pages: `page.tsx` with co-located `loading.tsx` for Suspense boundaries.
- Landing page components in `src/components/landing/` with barrel export via `index.ts`.
- Animations use CSS `--delay` stagger pattern with intersection observer.

## Personal AI Agent Platform

Each user gets an isolated personal AI agent running in its own AWS ECS Fargate container.

### Architecture

- **Isolation**: One container per user — no data leakage between users. API keys stored in AWS Secrets Manager.
- **Control Plane**: Agent container runs a WebSocket server (port 18789) and Express health check (port 18790). The Next.js app communicates with agents via `wsEndpoint`. Uses `wss://` in production, `ws://` in development.
- **Database**: AWS RDS PostgreSQL accessed via Prisma (Next.js app) and `pg` driver (agent container). `DATABASE_URL` injected via ECS Secrets (Secrets Manager), never passed as plain-text env var.
- **Agent Lifecycle**: Provision → Running → Stop/Restart → Destroy. Orchestrated in [src/lib/agent.ts](src/lib/agent.ts).
- **API Key Flow**: At container startup, the agent fetches its API key from Secrets Manager using the `API_KEY_SECRET_ARN` env var.

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/aws.ts` | ECS, Secrets Manager, CloudWatch operations |
| `src/lib/agent.ts` | Agent lifecycle orchestrator (provision, stop, restart, destroy) |
| `src/types/agent.ts` | All agent TypeScript types, `AVAILABLE_MODELS`, `BUILTIN_SKILLS` |
| `src/app/api/agent/route.ts` | List agents (GET), Provision via SSE (POST) |
| `src/app/api/agent/[id]/route.ts` | Agent CRUD + actions (stop/restart/destroy) |
| `src/app/api/agent/channels/route.ts` | Channel management (WhatsApp, Telegram, Discord, etc.) |
| `src/app/api/agent/skills/route.ts` | Skill marketplace and installation |
| `src/app/api/agent/memory/route.ts` | Memory browsing and clearing |
| `src/app/agent/setup/page.tsx` | 3-step setup wizard (model → personality → launch) |
| `src/app/agent/[id]/page.tsx` | Agent dashboard (status, channels, skills, memory, settings) |
| `agent/` | Container source (Dockerfile, runtime at `agent/src/index.ts`) |

### Agent Container (`agent/`)

- Node 22 + Chromium (Playwright) in Docker
- WebSocket commands: `chat`, `status`, `memory.add`, `session.list`, `session.clear`
- In-memory session management with PostgreSQL persistence via `pg` driver
- Memory buffer flushed to PostgreSQL every 30 seconds
- Health check on port 18790

### Environment Variables (Agent System)

```
DATABASE_URL, DIRECT_URL (AWS RDS PostgreSQL)
AWS_REGION, AWS_ECS_CLUSTER_ARN, AWS_SUBNETS, AWS_SECURITY_GROUPS
AWS_CONTAINER_IMAGE, AWS_EXECUTION_ROLE_ARN, AWS_TASK_ROLE_ARN
AWS_ACCOUNT_ID, AWS_LOG_GROUP
```

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (flat config, ESLint 9+)
npx prisma studio    # Visual DB browser
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate client to src/generated/prisma/
```

## Production Deployment

- **Hosting**: AWS ECS Fargate for both the Next.js app and per-user agent containers.
- **Docker**: Dockerfile at project root (Next.js app), `agent/Dockerfile` (agent container). Both multi-stage builds.
- **CI/CD**: GitHub Actions workflow at `.github/workflows/deploy.yml` — builds & pushes both images to ECR, runs Prisma migrations, and triggers ECS service update.
- **Health Check**: `/api/health` endpoint — public, verifies DB connectivity, used by ALB health probes.
- **Security Headers**: Configured in `next.config.ts` — HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy.
- **Secrets**: All sensitive values (DATABASE_URL, API keys) managed via AWS Secrets Manager. Never committed or passed as plain-text env vars to containers.
