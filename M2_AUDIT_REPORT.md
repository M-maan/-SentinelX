# SentinelX Milestone 2 Audit Report

Date: 2026-09-13  
Branch: `feature/m2-endpoint-agents`

## Scope verified

- Endpoint enrollment token generation, 30-minute expiry, and revocation.
- Agent-specific hashed credentials with rotation and revocation.
- Heartbeat and telemetry ingestion with validation and organization scoping.
- Device list/detail APIs with online/offline threshold, search, OS/status filters, and pagination.
- Devices dashboard with enrollment UX, filters, pagination, empty/loading/error states, and detail telemetry.
- Go agent identity persistence, enrollment, heartbeat, retry/backoff, Linux `/proc` memory/uptime collection, disk collection, and cross-platform builds.
- API health endpoint at `/api/v1/health`.
- Compose healthchecks and restart policies for PostgreSQL, Redis, API, and web services.

## Verification evidence

| Check | Result |
|---|---|
| API production build | PASS |
| Web production build | PASS |
| Backend tests | PASS — 12 tests |
| Backend/frontend lint | PASS |
| TypeORM lifecycle migration | PASS — `AgentLifecycle1720000002000` |
| Docker Compose build/start | PASS — API, web, PostgreSQL, Redis |
| Live enrollment/heartbeat/telemetry | PASS |
| Search/status/pagination API | PASS |
| Token rotation | PASS; old token rejected with 401 |
| Token revocation | PASS; revoked token rejected with 401 |
| Go tests | PASS |
| Windows amd64 agent build | PASS |
| Linux amd64 agent build | PASS |
| Health check | PASS — database up |

## Manual demo flow

1. Run `docker compose up -d --build`.
2. Open `http://localhost:3000/register` and create an organization.
3. Sign in and open Dashboard → Devices.
4. Generate an enrollment token and copy it.
5. From `agents/sentinelx-agent`, set `SENTINELX_API_URL` and `SENTINELX_ENROLLMENT_TOKEN`, then run `go run ./cmd/sentinelx-agent -once` (or use a built binary).
6. Refresh Devices: the endpoint appears ONLINE with latest telemetry.
7. Use hostname/OS/status filters and Previous/Next pagination.
8. Verify the device detail page and telemetry rows.
9. Rotate/revoke the agent credential through the API; the previous credential must receive 401.

## Caveats

- Windows resource collection uses PowerShell/CIM counters; Linux collection uses `/proc` and `df`. If an OS counter command is unavailable, the agent safely reports zero for that individual metric.
- No alerting/detection/incident/realtime/AI/remediation functionality is included; those remain outside M2.
- Production deployment still requires TLS, managed secrets, external monitoring/alerting, backups, and an operational runbook.
