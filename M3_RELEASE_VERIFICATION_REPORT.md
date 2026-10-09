# SentinelX M3 Release Verification Report

## 1. Executive summary

Release-readiness verification was performed from an isolated non-production environment. The M3 integration branch remained unchanged; this branch contains only this report. No production Neon connection, production credentials, M1/M2 source, monitoring functionality, or M4 functionality was modified.

Recommendation: **CONDITIONAL / NOT READY FOR FINAL HANDOVER**. Backend, frontend, disposable PostgreSQL migration/index checks, real two-organization HTTP isolation, and several authenticated desktop browser workflows passed. Docker service startup/build was blocked by the image dependency-install layer. Logout/protected-route interaction, mobile browser verification, polling lifecycle timing, and screenshot evidence remain NOT VERIFIED.

## 2. Git branch and baseline

| Item | Result |
|---|---|
| Workspace | `C:\Dev\SentinelX-M3` (outside OneDrive) |
| Branch | `feature/m3-13-release-readiness` |
| M3 baseline | `62c642020912f67552aa74ed70baab9cee498d7e` |
| Frozen `main` | `5070921c8de2a6dea7018867901f656c99a2bc83` |
| Starting working tree | PASS — clean |
| M3/main modification | NONE |

Feature 12 and Features 01–11 were already integrated in the verified M3 baseline. No reset, force-push, or history rewrite was used.

## 3. Test environment

The database test used a disposable PostgreSQL 16 container named `sentinelx-m3-pg-qa` on local port 55432, with local-only credentials. A local API ran on port 3011 with non-production JWT secrets and a local web build ran on port 3012. The disposable database/container and its test records were removed after verification. No `.env` file was created or copied into the repository.

The repository Compose file requires a `.env`; a temporary sanitized Compose definition was used only to validate configuration. It was deleted after the attempt. Existing unrelated containers were not used as evidence.

## 4. Docker Compose verification

| Check | Status | Evidence |
|---|---|---|
| Sanitized non-production Compose configuration | PASS | `docker compose ... config --quiet` exit 0 |
| PostgreSQL/Redis image availability | PASS | Images resolved for disposable checks |
| Full API/web image build and startup | BLOCKED | Build stalled at Docker `npm install` dependency layer; no project containers accepted as healthy |
| Container health and service connectivity | NOT VERIFIED | Full Compose startup did not complete |
| API health through Compose | NOT VERIFIED | Full Compose startup did not complete |

No rendered secrets or production environment values were printed.

## 5. Database migrations and indexes

| Check | Status | Evidence |
|---|---|---|
| Four TypeORM migrations applied in order | PASS | InitialFoundation, EndpointAgents, AgentLifecycle, MonitoringIndexes |
| Required tables created | PASS | organizations, users, refresh_tokens, audit_logs, agents, agent_telemetry, migrations |
| Migration history recorded | PASS | Four migration rows at timestamps 1720000000000 through 1720000003000 |
| `IDX_agents_credential_hash` | PASS | PostgreSQL metadata query |
| `IDX_agents_organization_last_seen` | PASS | PostgreSQL metadata query |
| `IDX_agent_telemetry_agent_recorded_at` | PASS | PostgreSQL metadata query |
| Rollback/reapply of Feature 01 migration | PASS | Reverted MonitoringIndexes, then reapplied it in disposable PostgreSQL |
| Production Neon migration/data changes | NOT EXECUTED | Intentionally not connected |

## 6. Multi-organization HTTP isolation

Real HTTP verification used two disposable organizations, two Security Admin users, one enrolled device per organization, and one telemetry record per device. The fixtures were created through the actual register/enrollment/telemetry endpoints and removed with the disposable database.

| Check | Status | Sanitized evidence |
|---|---|---|
| Organization A list | PASS | HTTP 200; 1 item, total 1 |
| Organization B list | PASS | HTTP 200; 1 item, total 1 |
| Organization-scoped dashboard | PASS | A total 1, online 1, offline 0 |
| Cross-tenant device detail | PASS | HTTP 404 |
| Cross-tenant telemetry | PASS | HTTP 404 |
| Search cannot bypass scope | PASS | A searching B hostname returned total 0 |
| Pagination remains scoped | PASS | A page 1/limit 1 returned total 1, totalPages 1 |
| Missing JWT | PASS | HTTP 401 |
| Invalid JWT | PASS | HTTP 401 |
| Invalid query parameter | PASS | HTTP 400 |
| Latest telemetry/detail compatibility | PASS | Detail latest count 1; latest query returned 1 item, limit 1 |
| Bounded telemetry history | PASS | Returned 1 item with requested limit 50 |
| Credential exposure | PASS | Sanitized API responses contained no agent credential token/hash |

Super Admin-specific scope and session revocation were not exercised in this fixture and remain NOT VERIFIED.

## 7. Authentication/RBAC and security

JWT and role guards remained active in the live API checks. Security Admin access succeeded for the disposable organization users. Missing and invalid bearer tokens were rejected with HTTP 401. Existing unit tests cover guard and organization-access behavior.

| Security item | Status |
|---|---|
| JWT guard active | PASS |
| RBAC guard active for monitoring routes | PASS |
| Organization principal scoping | PASS |
| Client organization override | PASS by implementation and HTTP scope checks |
| Sensitive credential response exposure | PASS |
| Revoked/expired session live flow | NOT VERIFIED |
| Super Admin live policy | NOT VERIFIED |
| Tracked secrets or `.env` | PASS — only `.env.example` is tracked |
| M4 functionality introduced | PASS — none found |

## 8. Device API integration

The live fixture verified enrollment, telemetry ingestion, dashboard totals, listing, search, pagination, cross-tenant detail/telemetry rejection, latest telemetry, and bounded history. Existing backend tests additionally cover sorting, status/OS/version filters, deterministic ID tie-breaking, and DTO validation.

## 9. Authenticated frontend workflows

Authenticated desktop browser verification used the disposable Organization A account.

| Workflow | Status |
|---|---|
| Login | PASS |
| Dashboard navigation | PASS |
| Metric cards | PASS — total/online/offline/OS values rendered |
| Device status and OS charts | PASS |
| Agent version summary | PASS |
| Selected-device latest telemetry | PASS |
| Device inventory | PASS |
| Hostname search/debounce result | PASS — matching device rendered |
| Device detail navigation | PASS |
| CPU/memory/disk/uptime cards | PASS |
| Historical telemetry charts | PASS |
| Manual refresh controls present | PASS by rendered UI |
| Empty/error/retry states | NOT VERIFIED in authenticated browser |
| Logout/protected-route redirect | NOT VERIFIED — sign-out click did not change route/state in this run |
| Mobile viewport interaction | NOT VERIFIED |
| Screenshots stored as evidence | NOT VERIFIED — no persistent screenshot artifact captured |

The earlier route smoke test remains limited to HTTP 200 reachability; it is not treated as authenticated UI evidence.

## 10. Polling and session lifecycle

The Feature 12 focused harness passed all 8 source-contract checks, including the shared 60-second policy, disabled background polling, stop-on-error behavior, and absence of uncontrolled timer/streaming transports. Existing source inspection confirms query-key preservation and 401 refresh handling.

| Runtime check | Status |
|---|---|
| Source polling policy | PASS |
| Browser dashboard/device/detail rendering | PASS |
| Network-level 60-second refresh timing | NOT VERIFIED |
| Background-tab behavior | NOT VERIFIED |
| Logout cleanup/session expiry | NOT VERIFIED |
| Network interruption/recovery | NOT VERIFIED |
| Duplicate-request runtime behavior | NOT VERIFIED |

## 11. Full regression results

| Check | Result |
|---|---|
| API production build | PASS |
| API Jest tests | PASS — 11 suites, 44 tests |
| API lint | PASS |
| API typecheck | PASS — `tsc --noEmit` |
| Web production build | PASS |
| Web focused verification | PASS — 8/8 |
| Web lint | PASS |
| Web typecheck | PASS — `tsc --noEmit` |
| Route smoke | PASS — `/login`, `/register`, `/dashboard` HTTP 200 |
| Disposable migrations/indexes | PASS |
| Real two-organization HTTP isolation | PASS |
| Docker runtime health | BLOCKED / NOT VERIFIED |

## 12. Findings and limitations

- No Critical or High severity security defect was found.
- Docker image build did not complete at the dependency-install layer, so Compose runtime health is not a PASS.
- Browser logout/protected-route behavior did not produce the expected visible redirect and is recorded as NOT VERIFIED; this requires follow-up before final handover.
- Mobile interaction, screenshot evidence, polling timing, background-tab behavior, session-expiry and network-recovery workflows remain NOT VERIFIED.
- Super Admin and revoked/expired-session live matrices remain NOT VERIFIED.
- This report does not finalize `M3_AUDIT_REPORT.md` and does not approve M3 handover.

## 13. Files changed

- `M3_RELEASE_VERIFICATION_REPORT.md` — this sanitized release-readiness report.

Temporary Compose definitions and disposable database data were removed and are not part of the branch.

## 14. Commit, push and recommendation

Implementation commit: to be recorded after commit.

Final report commit: to be recorded after commit.

Final remote HEAD and push status: to be recorded after the authorized feature-branch push.

Release readiness recommendation: **CONDITIONAL / NOT READY FOR FINAL M3 HANDOVER** until the listed NOT VERIFIED items are completed or explicitly accepted by the release owner. Do not merge this branch into M3 without separate approval. Do not modify `main` and do not start M4.
