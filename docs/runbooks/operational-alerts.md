# Operational Alerts Runbook

Last updated: 2026-02-17

## Scope

This runbook covers Phase 2 operational alarms for Nova production.

## Alarm Catalog

### `cosmo-production-trust-blocked-sender-spike`

- **Meaning:** Untrusted sender blocks reached a spike threshold.
- **Source:** CloudWatch log metric filter on `[Trust] Blocked sender`.
- **Threshold:** Sum >= 25 over 15 minutes.
- **Action:**
  1. Check `GET /api/agent/trust/events?hours=24` for affected channels.
  2. Validate no malicious channel exposure (unexpected channel enablement).
  3. Confirm user trust mode and trusted contacts are expected.

### `cosmo-production-trust-config-reload-failed`

- **Meaning:** Trust config reload failed at least once in 5 minutes.
- **Source:** CloudWatch log metric filter on `config.reload failed`.
- **Threshold:** Sum >= 1 over 5 minutes.
- **Action:**
  1. Inspect app and agent logs around failure timestamp.
  2. Verify agent WS control channel connectivity.
  3. Retry trust config change from settings and confirm recovery.

### `cosmo-production-gateway-ws-unhealthy-hosts`

- **Meaning:** Gateway WebSocket target group has unhealthy hosts.
- **Source:** `AWS/ApplicationELB` `UnHealthyHostCount`.
- **Threshold:** > 0 over 10 minutes.
- **Action:**
  1. Check ECS service events for rolling failures.
  2. Verify WS health endpoint and target group health.
  3. Roll back latest deployment if health does not recover.

### `cosmo-production-gateway-ws-target-connection-errors`

- **Meaning:** ALB→target connection errors on WS path.
- **Source:** `AWS/ApplicationELB` `TargetConnectionErrorCount`.
- **Threshold:** Sum >= 5 over 10 minutes.
- **Action:**
  1. Verify app listens on gateway WS port.
  2. Validate SG and target group port mapping.
  3. Review recent infra/service updates affecting WS routing.

## Primary Checks

- Gateway health: `GET /api/gateway/health`
- Trust diagnostics: `GET /api/agent/trust/events?hours=24`
- Smoke workflow: `.github/workflows/gateway-smoke.yml`

## Escalation

- If alarm persists > 30 minutes, escalate to on-call owner and prepare rollback decision.
