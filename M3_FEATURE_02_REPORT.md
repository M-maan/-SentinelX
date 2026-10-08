# SentinelX — M3 Feature 02 Report

## 1. Executive summary

Implemented a secure backend-only Dashboard Summary API at `GET /api/v1/dashboard/summary`. The endpoint aggregates real `agents` records using PostgreSQL queries, applies the existing organization scope and heartbeat cutoff rules, and returns device totals, online/offline counts, operating-system distribution, and agent-version distribution. No frontend components, migrations, or new tables were added.

## 2. Feature scope

- Included: NestJS dashboard module, authenticated summary endpoint, SQL aggregation, response DTO, focused tests.
- Excluded: frontend dashboard, device pagination/filtering, telemetry APIs, charts, alerts, and Feature 03 work.
- Online/offline behavior follows the existing M2 rule: a device is online when `last_seen` is present and not older than `AGENT_OFFLINE_THRESHOLD_SECONDS`; missing or older heartbeats are offline.

## 3. Git branch

- Base: `feature/m3-monitoring-dashboard` at Feature 01 merge `180c2a76ab0d0a3b53cb3094326a1271913fb846`.
- Feature branch: `feature/m3-02-dashboard-api`.
- `main` was not modified.

## 4. Backend files added/modified

- `apps/api/src/app.module.ts`
- `apps/api/src/dashboard/dashboard.module.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/dashboard/dto/dashboard-summary-response.dto.ts`
- `apps/api/src/dashboard/dashboard.service.spec.ts`
- `apps/api/src/dashboard/dashboard.controller.spec.ts`
- `M3_FEATURE_02_REPORT.md`

## 5. Dashboard API contract

`GET /api/v1/dashboard/summary`

Requires a Bearer access token and accepts no client-controlled organization ID.

Response:

```json
{
  "totalDevices": 25,
  "onlineDevices": 18,
  "offlineDevices": 7,
  "osDistribution": [{ "os": "Linux", "count": 10 }],
  "agentVersions": [{ "version": "1.0.0", "count": 25 }]
}
```

Empty scopes return zero counts and empty arrays. Blank or null OS/version values are normalized to `Unknown`.

## 6. Database queries used

The service performs three PostgreSQL aggregate queries against `agents`: one for total/online/offline counts, one for OS grouping, and one for agent-version grouping. It does not join or load telemetry. The organization predicate is parameterized and applied to all three queries for non-Super-Admin users.

## 7. Online/offline status source

Status is derived from `last_seen` and `AGENT_OFFLINE_THRESHOLD_SECONDS`, matching `AgentsService.list`. The persisted `agents.status` value is not used as a second, conflicting source of truth.

## 8. Authentication verification

- The controller uses `JwtAuthGuard` and `RolesGuard`.
- Existing roles are preserved: `SUPER_ADMIN`, `SECURITY_ADMIN`, `ANALYST`, and `VIEWER`.
- Live unauthenticated request returned HTTP 401 with `Missing bearer token`.
- Authenticated empty-scope request returned HTTP 200.

## 9. Organization isolation verification

- Non-Super-Admin queries use only `request.user.organizationId` from the verified JWT principal.
- No organization ID is accepted from query parameters or request body.
- Missing organization context produces an empty result scope rather than a global query.
- Super Admin follows the existing M2 global-scope convention.

## 10. Test results

- `npm run test -w @sentinelx/api`: 7 suites passed, 20 tests passed.
- Focused tests cover empty results, totals, online/offline counts, OS distribution, agent versions, cutoff behavior, organization scoping, missing organization handling, Super Admin scope, and controller delegation.
- No records were inserted into Neon. The live authenticated check used an in-memory signed test token against the empty database.

## 11. Build/lint/typecheck results

- API build: passed.
- API lint: passed.
- API typecheck: passed.
- Frontend build regression: passed.
- Frontend lint: passed.
- Frontend typecheck: passed after the frontend build generated its normal type artifacts.
- Docker Compose configuration validation: passed.

## 12. API verification evidence

- Compiled API connected to Neon successfully over the configured PostgreSQL SSL URL.
- `/api/v1/health` returned HTTP 200.
- `/api/v1/dashboard/summary` returned HTTP 401 without authentication.
- With an authenticated viewer principal for an organization with no enrolled devices, the endpoint returned:

```json
{
  "totalDevices": 0,
  "onlineDevices": 0,
  "offlineDevices": 0,
  "osDistribution": [],
  "agentVersions": []
}
```

- A populated live aggregation was not fabricated because Neon currently has no enrolled devices or user fixtures. SQL aggregation behavior is covered by the focused service tests.

## 13. Known limitations

- No populated live Neon organization was available for a non-empty end-to-end response check; no production data was created to manufacture one.
- PostgreSQL/Node emitted the existing `sslmode=require` compatibility warning; the connection succeeded and Neon SSL was enforced by the configured URL.
- The endpoint is ready for frontend consumption but no frontend integration was added by design.

## 14. Commit hash

Implementation commit: `41126eefa2f9cca1671b32a7c81d09fc0985fd86`.

## 15. Push status

Implementation commit pushed to `origin/feature/m3-02-dashboard-api`; report finalization is included in the follow-up push.

## 16. Merge readiness

Feature 02 is ready to merge into `feature/m3-monitoring-dashboard` after explicit approval. It has not been merged into M3 or `main`.
