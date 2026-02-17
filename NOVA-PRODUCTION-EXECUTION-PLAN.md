# Nova Production Execution Plan

Last updated: 2026-02-17

## Objective

Ship Nova to stable full production with enforceable trust boundaries, observability, and safe deployment operations.

## Current Status Snapshot

- ✅ Single-chat canonical model enforced in API + DB
- ✅ Trust policy modes (`owner_only`, `allowlist`, `open`) with runtime enforcement
- ✅ Trust settings UI and owner-guard protections
- ✅ Channel-aware normalization in trust matching
- ✅ Basic trust runtime metrics + blocked logging

## Phase Breakdown

### Phase 1 — Trust Hardening Completion

- ✅ Channel-specific identifier validation at API boundary
- ✅ Persist blocked trust events for diagnostics (`AgentTrustEvent`)
- ✅ Add trust blocked-event aggregation endpoint (`/api/agent/trust/events`)

### Phase 2 — Operational Observability

- ✅ Add dashboard/alerts for:
  - blocked trust events rate
  - `config.reload` failures
  - stale online devices
  - websocket handshake failure rate
- ✅ Add daily smoke workflow (chat + trust + gateway health)

### Phase 2.1 — In Progress

- ✅ Add dashboard/alerts implementation details to infra (CloudWatch alarms + runbook)

### Phase 3 — Product Integrity

- ✅ Remove remaining backend multi-conversation mutation paths not needed in single-chat mode
- ✅ Add invariant checks in CI for one-conversation-per-user

### Phase 4 — Release Safety

- ⬜ Add pre-deploy gate checklist in CI (schema drift + health precheck)
- ⬜ Add post-deploy canary verification script (trust read/write/block flow)

### Phase 5 — UX & Policy Completion

- ⬜ Add explicit UI error handling for owner guard failures (backend already enforces)
- ⬜ Add trust diagnostics panel backed by `/api/agent/trust/events`

## Working Notes

- Keep all trust enforcement server-side and runtime-side; UI remains convenience only.
- Prefer additive migrations and safe rollback paths.
- Keep API ownership checks (`session.user.id`) on every route.
