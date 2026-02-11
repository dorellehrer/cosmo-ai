# Nova AI - Product Status

## Positioning

Nova aims to be a practical personal AI assistant that can chat, use external integrations, and (when available) route actions to user devices.

## What Is In Place

- Authenticated web product with chat, settings, onboarding, pricing, and marketing pages
- Credit-based model selection and Stripe-backed billing
- Persistent conversations and usage tracking
- OAuth integration flows for Google, Spotify, Notion, Slack, Hue, and Sonos
- Desktop app with native automation surface (files, apps, system, accessibility, routines)
- Gateway foundation (device registry, WebSocket protocol, in-memory routing hub)

## What Is Deliberately Preview/Beta

- WhatsApp, Discord, and Phone integrations are visible previews, not connectable OAuth flows yet
- Some tool results are explicitly labeled as beta/simulated for user clarity
- Gateway-assisted device tool routing is rollout-gated (`ENABLE_GATEWAY_TOOL_ROUTING`)

## Reliability Priorities

1. Keep lint/build/agent-build green on every change.
2. Keep UI claims aligned with backend capability.
3. Treat integration/provider contracts as shared source-of-truth.
4. Keep security baselines enforced (OAuth state signing, CSP hardening, rate-limit abstraction).

## Current Technical Truth

- Primary runtime database target: PostgreSQL via Prisma
- Next.js proxy entrypoint: `src/proxy.ts`
- Agent secret contracts are explicit envelope payloads with `kind` + `version`
- Skill IDs are canonicalized with legacy compatibility mapping to avoid breaking existing records
