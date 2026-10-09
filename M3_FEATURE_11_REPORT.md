# SentinelX M3 Feature 11 — Automatic Polling and Monitoring Refresh

## Executive summary

Feature 11 adds lightweight TanStack Query polling to the existing monitoring console. Dashboard summary data, the current device inventory query, selected-device dashboard detail, endpoint detail, and bounded telemetry history refresh every 60 seconds using real authenticated API requests.

## Scope and branch

- Branch: `feature/m3-11-polling-refresh`
- Frontend-only implementation.
- No Socket.io, WebSockets, backend endpoints, database tables, migrations, alerting, or advanced analytics were added.
- Existing manual refresh controls and query keys remain in use.

## Polling implementation

- Shared constant: `MONITORING_POLL_INTERVAL_MS = 60_000`.
- Shared TanStack Query options use `refetchInterval`, `retry: false`, and `refetchIntervalInBackground: false`.
- Dashboard summary refreshes counts, status distribution, OS distribution, and agent-version summary.
- Dashboard device/detail queries refresh only the current selected device; no telemetry fan-out is introduced.
- Device inventory refreshes only the current page and preserves search, filters, sort, page, and page size through the existing query key.
- Device detail refreshes backend status, last seen, metadata, and latest telemetry.
- Telemetry history refreshes the existing `limit=50` query and preserves Feature 10 chronological ordering and null gaps.

## Lifecycle, errors, and manual refresh

- Queries are enabled only when the session token and required device ID are present.
- TanStack Query owns observer lifecycle and cleanup; no custom polling loop was added.
- Background-tab polling is disabled.
- Polling stops after a query error, including unauthorized/forbidden failures, and resumes after a successful manual retry/refetch.
- Existing session refresh/logout handling remains in the authenticated API helper.
- Manual refresh buttons continue to refetch current queries immediately and show background-refresh indicators.
- Previously loaded data remains visible after background refresh failures with an explicit stale/error warning.

## Security and data accuracy

- Only existing authenticated API requests are used.
- No client organization ID, new storage, credentials, or tokens were introduced.
- Backend remains authoritative for device status, ownership, and tenant isolation.
- No synthetic device or telemetry data is generated.
- No automatic polling was added to the existing 400 ms hostname-search debounce.

## Verification

| Check | Result |
| --- | --- |
| Frontend production build | PASS |
| Frontend lint | PASS |
| Frontend typecheck | PASS |
| Route smoke tests | PASS: `/login`, `/register`, `/dashboard`, `/dashboard/devices/[id]` returned HTTP 200 |
| Backend production build | PASS |
| Backend lint | PASS |
| Backend typecheck | PASS |
| Backend tests | PASS: 11 suites, 44 tests |
| Docker Compose quiet validation | NOT VERIFIED: clean clone intentionally has no `.env` |
| Authenticated browser/poll timing tests | NOT VERIFIED: no authorized staging credentials available |
| Screenshot evidence | Not claimed; no authenticated browser session was available |

## Files changed

- `apps/web/lib/query-config.ts`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/devices/page.tsx`
- `apps/web/app/dashboard/devices/[id]/page.tsx`
- `apps/web/app/globals.css`
- `M3_FEATURE_11_REPORT.md`

## Known limitations

- Real 60-second timing, background-tab behavior, logout during polling, and recovery against a live authorized API require staging credentials and were not browser-tested.
- Docker Compose requires a non-production `.env` and was intentionally not run with production credentials.
- No frontend unit-test runner is configured; polling behavior was verified through query configuration, build/typecheck, source review, route smoke, and backend regressions.

## Git delivery

- Base M3 commit: `773581cf733afa7f8471cc54d627ac41e1f4eaf4`
- Implementation commit: `2c074deadbef6c7e5e360ec1ea06146041ceef10`
- Report commit: `8743af50405938fecf97e4ff3215eaea4c1ec3c2`
- Final remote HEAD: verified at the branch tip after the final metadata push
- Push status: PASS; initial feature branch push completed successfully
- Merge readiness: ready for review after push; not merged into M3 or `main`.
