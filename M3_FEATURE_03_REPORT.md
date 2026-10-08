# SentinelX — M3 Feature 03 Report

## 1. Executive summary

Enhanced the existing device listing API with validated server-side pagination, hostname search, status/OS/version/hostname filters, and whitelisted deterministic sorting. The established `/api/v1/agents` route remains unchanged for M2 consumers; no frontend, migration, or unrelated feature work was added.

## 2. Actual API route

`GET /api/v1/agents`

The route remains protected by the existing JWT and RBAC guards.

## 3. Feature branch

`feature/m3-03-device-listing`, created from the latest `feature/m3-monitoring-dashboard` branch at the approved Feature 02 merge.

## 4. Query parameters

- `page`: positive integer, default `1`.
- `limit`: integer from `1` to `100`, default `20`.
- `search`: case-insensitive partial hostname search, maximum 255 characters; `%`, `_`, and backslashes are escaped.
- `status`: `ONLINE` or `OFFLINE`, based on effective heartbeat status.
- `os`: case-insensitive exact operating-system filter, maximum 80 characters.
- `agentVersion`: case-insensitive exact agent-version filter, maximum 80 characters.
- `hostname`: case-insensitive exact hostname filter, maximum 255 characters.
- `sortBy`: `lastSeen`, `hostname`, `status`, or `recentlyActive`.
- `sortOrder`: `asc` or `desc`.

Invalid values are rejected by the existing global validation pipe with HTTP 400.

## 5. Response contract

The existing M2 response fields are preserved and `totalPages` is added:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0,
  "totalPages": 0
}
```

Device responses continue to omit `credential_hash` because the entity field remains `select: false`.

## 6. Pagination behavior

Pagination uses TypeORM QueryBuilder `skip`/`take` and `getManyAndCount`, so matching totals are calculated by the database. Empty results return `items: []`, `total: 0`, and `totalPages: 0`.

## 7. Search implementation

Hostname search uses parameterized `ILIKE` with explicit escaping for wildcard and escape characters. It is combined with the tenant predicate and all other filters without accepting raw SQL fragments.

## 8. Filter implementation

All filters are applied at the database query level. Status uses the existing heartbeat cutoff rule from M2: `last_seen` at or after the configured cutoff is online; null or older values are offline. Persisted status is not used as a conflicting source of truth.

## 9. Sorting behavior

Only a static whitelist of SQL expressions is used. `lastSeen` sorts by timestamp with `NULLS LAST`; `hostname` sorts by hostname; `status` sorts by effective online/offline status; and `recentlyActive` prioritizes the effective status bucket before last-seen time. Every sort adds `agent.id ASC` as a deterministic tie-breaker.

## 10. Security/organization isolation

- JWT authentication and existing role guards remain active for all list requests.
- Non-Super-Admin users are always scoped by `request.user.organizationId`.
- No client-supplied organization ID is accepted.
- Super Admin retains the existing authorized global scope.
- Query parameters are validated and sortable fields cannot inject identifiers or SQL.

## 11. Backward compatibility

The `/api/v1/agents` route, existing authentication/RBAC behavior, existing `items` response shape, and legacy `status`, `os`, `search`, `page`, and `limit` parameters are preserved. The response now additionally includes `totalPages`.

## 12. Tests

- API test suite: 9 suites passed, 32 tests passed.
- Added coverage for default/custom/max pagination, empty results, totals, hostname search and escaping, status/OS/version/hostname filters, combined filters, all sorting modes, stable ties, organization isolation, Super Admin scope, DTO validation, and existing auth/RBAC regressions.
- Disposable local PostgreSQL/API verification used four non-production sample agents across two organizations; the temporary database was removed afterward.

## 13. Build/lint/typecheck results

- API build: passed.
- API lint: passed.
- API typecheck: passed.
- Frontend build regression: passed.
- Frontend lint: passed.
- Frontend typecheck: passed.
- Docker Compose quiet validation: passed.

## 14. Database verification

- All four existing migrations, including Feature 01 migration `1720000003000-MonitoringIndexes`, applied successfully in the disposable verification database.
- Feature 01 indexes remained intact.
- No migration or schema file was added for Feature 03.
- Neon production data was not modified.

## 15. Files changed

- `apps/api/src/agents/agents.controller.ts`
- `apps/api/src/agents/agents.service.ts`
- `apps/api/src/agents/dto/agent.dto.ts`
- `apps/api/src/agents/agents.list.spec.ts`
- `apps/api/src/agents/dto/device-list-query.dto.spec.ts`
- `M3_FEATURE_03_REPORT.md`

## 16. Known limitations

- The live Neon database was not used for seeded listing records; all populated API checks used an isolated disposable local database to avoid production data changes.
- No frontend client changes were made, so existing frontend callers receive the compatible response fields and can adopt `totalPages` when needed.

## 17. Commit hash

Pending final Feature 03 commit.

## 18. Push status

Pending final Feature 03 commit and push.

## 19. Merge readiness

Feature 03 is ready to merge into `feature/m3-monitoring-dashboard` after explicit approval. It has not been merged into M3 or `main`.
