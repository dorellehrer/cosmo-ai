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
```

## Notes

- `src/proxy.ts` is used for Next.js 16 proxy/matcher behavior.
- Generated build artifacts and package install directories are ignored by default.
