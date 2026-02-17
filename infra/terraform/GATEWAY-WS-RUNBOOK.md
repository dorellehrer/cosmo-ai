# Gateway WebSocket Rollout Runbook

This runbook documents production rollout for desktop gateway WebSocket routing managed by Terraform.

## Scope

- ECS app task exposes HTTP app port and standalone WS port.
- ALB forwards WS paths to a dedicated WS target group.
- API device registration returns a reachable `wsEndpoint`.
- Cross-instance gateway tool calls are dispatched through a DB-backed queue.

## Prerequisites

- Terraform state is healthy and current workspace is selected.
- ALB and ECS modules are already provisioned.
- You have an HTTPS listener ARN if path-based WS routing on HTTPS is required.

## Configuration

Set these in `infra/terraform/terraform.tfvars` (or workspace variable source):

- `gateway_ws_port` (default `3001`)
- `gateway_ws_health_path` (default `/health`)
- `https_listener_arn` (optional)

If `https_listener_arn` is set, Terraform creates a listener rule forwarding these patterns to the WS target group:

- `/ws`
- `/ws/*`
- `/api/gateway/ws`
- `/api/gateway/ws/*`

## Application Runtime Parity

Set app runtime vars so generated client endpoints match ALB routing:

- `GATEWAY_WS_PORT` (must match `gateway_ws_port`)
- One endpoint strategy:
  - `GATEWAY_WS_PUBLIC_URL` (recommended for production), or
  - `GATEWAY_WS_PUBLIC_HOST` + `GATEWAY_WS_PUBLIC_PORT` + `GATEWAY_WS_PATH`
- Optional dispatch tuning:
  - `GATEWAY_DISPATCH_POLL_MS` (default `500`, minimum `100`)

Agent control plane auth parity (if enabled):

- `AGENT_CONTROL_PLANE_TOKEN` in Next.js app and agent tasks must match.
- Mismatch intentionally blocks internal `config.reload` commands.

## Rollout Procedure

From `infra/terraform`:

```bash
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
```

## Verification Checklist

1. Terraform outputs include `gateway_ws_target_group_arn`.
2. ECS service shows both app and WS target group attachments.
3. ALB health checks are passing for WS target group.
4. Device registration returns `wsEndpoint` and `protocolVersion`.
5. Desktop client successfully opens WS and receives expected events.

## Database Migration Verification

Gateway distributed dispatch depends on `GatewayToolCall` table.

Migration file:

- `prisma/migrations/20260217121500_add_gateway_tool_call_queue/migration.sql`

Verification steps:

1. Confirm app task startup logs include successful Prisma migration deployment.

1. In PostgreSQL, verify table and indexes exist:

- `"GatewayToolCall"`
- `GatewayToolCall_status_createdAt_idx`
- `GatewayToolCall_userId_requiredCapability_status_idx`
- `GatewayToolCall_expiresAt_idx`

1. Call `/api/gateway/health` and confirm `gateway.dispatchQueue` object is present.

### API Validation Example

```bash
curl -s -X POST "https://<your-domain>/api/gateway/devices" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"name":"Runbook Test Device","platform":"web","capabilities":["desktop"]}'
```

Expected fields:

- `deviceId`
- `wsEndpoint`
- `protocolVersion`

### Automated Smoke Check (recommended)

Run the scripted gateway smoke check after deploy:

```bash
GATEWAY_SMOKE_BASE_URL="https://<your-domain>" \
TEST_USER_EMAIL="<test-user-email>" \
TEST_USER_PASSWORD="<test-user-password>" \
npm run smoke:gateway
```

Alternative (if you already have a session cookie):

```bash
GATEWAY_SMOKE_BASE_URL="https://<your-domain>" \
GATEWAY_SMOKE_COOKIE="next-auth.session-token=<session-token>" \
npm run smoke:gateway
```

The script validates:

- `/api/gateway/health` is healthy and returns dispatch queue metrics.
- `/api/gateway/devices` registration returns `device.id`, `wsEndpoint`, `protocolVersion`, and session token.
- `/api/gateway` lists the newly registered device.
- Cleanup path deletes the temporary probe device.

CI automation:

- `.github/workflows/gateway-smoke.yml` runs this check automatically after successful deploy.
- It uses `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` repository secrets.

## Cross-Instance Validation (A/B)

Use this to verify real distributed dispatch behavior (not just local routing).

1. Ensure at least 2 app tasks are running.

1. Register a desktop-capable device that connects to instance B.

1. Send a tool call from a request served by instance A requiring that capability.

1. Confirm request succeeds and `/api/gateway/health` shows queue activity during processing:

- `pending` may briefly increase
- `processing` may briefly increase
- `completedLastHour` increments after success

1. Repeat with induced timeout/disconnect and confirm failure semantics:

- `expiredLastHour` or `failedLastHour` increments
- client receives a clear routing/tool failure error

## Rollback

- Remove `https_listener_arn` (or disable WS path rule condition) and apply.
- Revert `GATEWAY_WS_*` runtime vars to prior working values.
- Re-deploy app task definition if runtime vars changed.

### Rollback Criteria

Trigger rollback if one or more conditions persist for more than 10 minutes:

- WS target group healthy hosts drop below 1.
- Device registration endpoint errors exceed 5%.
- Desktop clients fail WS registration (`ack`) on both supported paths.

## Common Failure Modes

- `wsEndpoint` points to wrong host/port/path
  - Fix `GATEWAY_WS_PUBLIC_URL` or host/port/path vars.
- ALB 404 on WS upgrade path
  - Confirm `https_listener_arn` is set and listener rule exists.
- Target unhealthy
  - Verify `gateway_ws_health_path` matches WS server health endpoint.
- `config.reload` no-op with auth enabled
  - Verify matching `AGENT_CONTROL_PLANE_TOKEN` in app and agent.

## Incident Triage Commands

Terraform state and plan sanity:

```bash
cd infra/terraform
terraform validate
terraform plan -target=module.ecs
```

ALB routing/health quick checks:

```bash
curl -i "https://<your-domain>/health"
curl -i "https://<your-domain>/api/gateway/health"
```

Gateway device registration check:

```bash
curl -s -X POST "https://<your-domain>/api/gateway/devices" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"name":"Incident Probe","platform":"web","capabilities":["desktop"]}'
```
