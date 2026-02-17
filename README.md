# Nova AI

Nova is a personal AI assistant platform with a Next.js web app, desktop app (Electron), and optional per-user cloud agent runtime.

## Current Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Next.js App Router + API routes
- Auth: NextAuth (credentials + Google + GitHub)
- Data: Prisma + PostgreSQL (`@prisma/adapter-pg`)
- Billing: Stripe subscriptions + credit-based usage
- Desktop: Electron main/preload + macOS automation toolkit
- Agent runtime: standalone TypeScript service in `agent/`

## Integration Status

- OAuth providers implemented: `google`, `spotify`, `notion`, `slack`, `hue`, `sonos`
- Preview providers (visible but non-connectable): `whatsapp`, `discord`, `phone`
- Preview connect attempts return structured API error: `{ code: 'NOT_YET_SUPPORTED', provider }`

## Gateway Status

- Device registry API: `src/app/api/gateway/devices/route.ts`
- WebSocket hub + routing: `src/lib/gateway/*`
- Desktop gateway client: `electron/gateway-client.ts` (feature-flagged)
- Chat-side device routing: feature-flagged via `ENABLE_GATEWAY_TOOL_ROUTING=1`

## Build and Validation

Run these before shipping:

```bash
npm run lint
npm run build
npm --prefix agent run build
```

## Setup

```bash
npm install
npm --prefix agent install
cp .env.example .env.local
npx prisma migrate dev
npm run dev
```

## Key Environment Variables

```env
# Core
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
# Optional: shared token for internal agent control-plane commands (config reload, etc.)
AGENT_CONTROL_PLANE_TOKEN=

# AI
OPENAI_API_KEY=

# Integrations
INTEGRATION_ENCRYPTION_KEY=
INTEGRATION_OAUTH_STATE_SECRET=

# Gateway
ENABLE_GATEWAY_CLIENT=0
ENABLE_GATEWAY_TOOL_ROUTING=0
ENABLE_IMESSAGE_WATCHER=0
ENABLE_IMESSAGE_CAPABILITY=0
GATEWAY_WS_PORT=3001
# Optional public endpoint overrides for desktop gateway clients:
# If set, this full URL is returned directly (example: wss://gateway.heynova.se/ws)
GATEWAY_WS_PUBLIC_URL=
# Or compose from host/port/path:
GATEWAY_WS_PUBLIC_HOST=
GATEWAY_WS_PUBLIC_PORT=
GATEWAY_WS_PATH=/ws

# Rate limiting
# memory (default) or database (shared across instances)
RATE_LIMIT_DRIVER=database
# Optional internal cleanup endpoint auth token
RATE_LIMIT_MAINTENANCE_TOKEN=

# Contact delivery (choose one)
CONTACT_WEBHOOK_URL=
# or AWS SES:
CONTACT_FROM_EMAIL=
CONTACT_TO_EMAIL=
```

## Notes

- `src/proxy.ts` is used for Next.js 16 proxy/matcher behavior.
- Generated build artifacts and package install directories are ignored by default.

## Scheduled Maintenance

- Workflow: `.github/workflows/rate-limit-cleanup.yml` (runs hourly + manual trigger)
- Calls: `POST /api/internal/rate-limit-cleanup`
- Required repository secrets:
  - `RATE_LIMIT_CLEANUP_URL` (full endpoint URL, e.g. `https://www.heynova.se/api/internal/rate-limit-cleanup`)
  - `RATE_LIMIT_MAINTENANCE_TOKEN` (must match app env var `RATE_LIMIT_MAINTENANCE_TOKEN`)

## Post-Deploy Gateway Smoke

- Workflow: `.github/workflows/gateway-smoke.yml`
- Runs automatically after successful `Deploy Nova AI` workflow and can be run manually.
- Required repository secrets:
  - `TEST_USER_EMAIL`
  - `TEST_USER_PASSWORD`
- Workflow default base URL is `https://www.heynova.se`.
- For manual/local runs you can still pass an explicit authenticated cookie via `GATEWAY_SMOKE_COOKIE`.

Gateway metric delta checker (for A/B validation windows):

```bash
GATEWAY_SMOKE_BASE_URL="https://www.heynova.se" \
TEST_USER_EMAIL="<test-user-email>" \
TEST_USER_PASSWORD="<test-user-password>" \
GATEWAY_DELTA_SAMPLE_SECONDS=30 \
GATEWAY_EXPECT_COMPLETED_INC=1 \
npm run smoke:gateway:delta
```

## Gateway WS Rollout (Terraform)

Use this when enabling production-default desktop gateway connectivity.

Detailed ops runbook: `infra/terraform/GATEWAY-WS-RUNBOOK.md`.

### 1) Terraform variables

Set these in `infra/terraform/terraform.tfvars`:

- `gateway_ws_port` — container port for the standalone WS server (default `3001`)
- `gateway_ws_health_path` — WS server health path (default `/health`)
- `https_listener_arn` — optional existing ALB HTTPS listener ARN

If `https_listener_arn` is set, Terraform creates a listener rule forwarding:

- `/ws`, `/ws/*`
- `/api/gateway/ws`, `/api/gateway/ws/*`

to the gateway WS target group.

### 2) App environment

Set runtime env vars for endpoint generation:

- `GATEWAY_WS_PORT` (must match `gateway_ws_port`)
- One of:
  - `GATEWAY_WS_PUBLIC_URL` (full explicit URL), or
  - `GATEWAY_WS_PUBLIC_HOST`/`GATEWAY_WS_PUBLIC_PORT` + `GATEWAY_WS_PATH`

Control-plane auth parity (if enabled):

- `AGENT_CONTROL_PLANE_TOKEN` in the Next.js app must match `AGENT_CONTROL_PLANE_TOKEN` in agent tasks.
- Mismatched values block `config.reload` control messages by design.

### 3) Apply and inspect

From `infra/terraform`:

```bash
terraform plan
terraform apply
```

Confirm output `gateway_ws_target_group_arn` is present and attached to the app ECS service.

### 4) Validate after deploy

Check WS health path via ALB:

```bash
curl -i "https://<your-domain>/health"
```

Check registration endpoint returns a WS endpoint:

```bash
curl -s -X POST "https://<your-domain>/api/gateway/devices" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"name":"Test Device","platform":"web","capabilities":["desktop"]}'
```

Expected result includes `wsEndpoint` and `protocolVersion`.
