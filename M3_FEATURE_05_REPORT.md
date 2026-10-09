# SentinelX — M3 Feature 05 Report

## 1. Executive summary

Implemented a secure, bounded telemetry query API for authorized devices. The backend reuses the existing `AgentTelemetry` storage, agent ownership scope, JWT/RBAC guards, and Feature 01 telemetry index. No frontend, migration, or production-data changes were made.

## 2. Feature scope

Feature 05 is backend-only. It supports the latest telemetry snapshot and bounded recent telemetry history for an enrolled device while preserving Feature 04's `latestTelemetry` response.

## 3. Actual implemented API route

`GET /api/v1/agents/:id/telemetry`

The route accepts either the existing agent UUID or the enrolled `agentId` identifier. It is protected by the existing JWT authentication and RBAC guards.

## 4. Query parameters

- `limit`: optional integer from `1` to `100`; default `50`.
- `latest`: optional boolean. When `true`, the effective limit is `1` regardless of `limit`.

Invalid values are rejected by the existing global validation pipe with HTTP 400.

## 5. Request/response contract

Example recent response:

```json
{
  "items": [
    {
      "id": "telemetry-id",
      "agentId": "agent-uuid",
      "cpuUsage": 25.5,
      "memoryTotal": 1000,
      "memoryUsed": 480,
      "memoryUsage": 48,
      "diskTotal": 2000,
      "diskUsed": 1200,
      "diskUsage": 60,
      "uptimeSeconds": 86400,
      "recordedAt": "2026-10-09T10:05:00.000Z",
      "createdAt": "2026-10-09T10:05:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50
}
```

Devices without telemetry return HTTP 200 with `items: []`, `total: 0`, and the effective `limit`. Unknown or unauthorized devices return the established HTTP 404 not-found response.

## 6. Metric units and null handling

- `cpuUsage`, `memoryUsage`, and `diskUsage` are stored percentage values.
- `memoryTotal`, `memoryUsed`, and `diskTotal`, `diskUsed` use the existing byte fields.
- `uptimeSeconds` is measured in seconds.
- `recordedAt` preserves the stored PostgreSQL timestamp.
- The API returns stored values as-is and does not fabricate missing metrics. Nullable/partial values remain `null` where present.

## 7. Query performance

Telemetry is queried only after the scoped agent is found, with `where: { agentId }`, `recordedAt DESC`, `id DESC`, and a database `take` limit. The query reuses Feature 01's `IDX_agent_telemetry_agent_recorded_at` index and never loads unbounded history.

## 8. Authentication and RBAC

The endpoint uses the existing `JwtAuthGuard` and `RolesGuard`, allowing the same authorized roles as device listing and detail routes: Super Admin, Security Admin, Analyst, and Viewer. Credential hashes and agent tokens are not selected or serialized.

## 9. Organization isolation

Non-Super-Admin requests scope the device lookup to the caller's organization before telemetry access. Super Admin uses the existing global scope. Client-provided organization IDs are not accepted. Cross-organization access returns HTTP 404.

## 10. Automated tests

- API test suite: 11 suites passed, 44 tests passed.
- Added coverage for newest-first history, default/max/latest limits, deterministic timestamp and ID ordering, empty history, partial metrics, UUID and agent identifier lookup, cross-organization access, Super Admin scope, credential omission, and DTO validation.
- Existing Feature 04 detail, Feature 03 listing, Feature 02 dashboard, JWT/RBAC, organization isolation, and agent-auth regressions remain passing.

## 11. API verification evidence

Against a disposable local PostgreSQL database with isolated fixtures:

- Recent query: HTTP 200, bounded two-row response, newest record first.
- `latest=true`: HTTP 200, exactly one newest record.
- Cross-organization device: HTTP 404.
- Invalid `limit=101`: HTTP 400.
- Missing JWT: HTTP 401.
- Credential hash: absent from response.

The disposable database was removed after verification. No production Neon records were created or modified.

## 12. Build/lint/typecheck results

- API production build: passed.
- API tests: passed, 11 suites / 44 tests.
- API lint: passed.
- API typecheck: passed through the production build.
- Frontend production build regression: passed.
- Frontend lint: passed.
- Frontend typecheck: passed.
- Docker Compose quiet validation: passed.

## 13. Files changed

- `apps/api/src/agents/agents.controller.ts`
- `apps/api/src/agents/agents.service.ts`
- `apps/api/src/agents/dto/agent.dto.ts`
- `apps/api/src/agents/agents.telemetry.spec.ts`
- `apps/api/src/agents/dto/device-list-query.dto.spec.ts`
- `M3_FEATURE_05_REPORT.md`

## 14. Known limitations

The populated API verification used an isolated disposable PostgreSQL database rather than Neon production, by design. No frontend telemetry charts or polling were implemented.

## 15. Feature branch

`feature/m3-05-telemetry-api`, based on M3 merge `cf09b65a16a6234250dbb4c1b4bca232d2508feb`.

## 16. Implementation commit hash

Implementation commit: `ce2b8902933214fc341b3a63ac5366f7ce84106f`.

## 17. Push status

Feature branch `feature/m3-05-telemetry-api` pushed successfully to `origin` at the finalized report commit.

## 18. Merge readiness

Feature 05 is ready for explicit approval after push. It has not been merged into `feature/m3-monitoring-dashboard` or `main`, and Feature 06 has not been started.
