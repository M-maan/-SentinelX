# SentinelX — Milestone 3 Audit Report

## 1. Executive summary

Milestone 3 adds the monitoring visibility layer on top of the approved M2 endpoint-agent baseline. Organizations can view device counts, search/filter/sort devices, open an endpoint profile, and inspect the latest CPU, memory, disk, and uptime telemetry. M3 does not introduce detections, alerts, incidents, AI, automated response, or advanced SIEM functionality.

## 2. Branch and scope

- Branch: `feature/m3-monitoring-dashboard`
- Base: latest approved M2 UI/device baseline
- Main and frozen M1/M2 history: unchanged
- M3 functionality is isolated until review and approval

## 3. Completed requirements

- Dashboard summary API with total, online, offline, OS, and agent-version counts.
- Device API pagination, search, status/OS/agent-version filters, and sorting.
- Device detail API with organization-scoped lookup and latest telemetry.
- Dedicated telemetry query API with authentication and tenant isolation.
- Monitoring dashboard cards and status/OS visualizations.
- Device management controls and responsive device profile page.
- CPU, memory, disk, and uptime health presentation.
- Database indexes for hostname, OS, agent version, last seen, telemetry timestamp, and agent/time queries.
- README usage and verification documentation.

## 4. Backend verification

- `npm run build --workspace @sentinelx/api`: PASS
- `npm run lint`: PASS
- Agent lifecycle tests: PASS (3 tests)
- `GET /api/v1/health`: HTTP 200
- `GET /api/v1/agents/dashboard/summary` without JWT: HTTP 401 (authentication enforced)

## 5. Frontend verification

- `npm run build --workspace @sentinelx/web`: PASS
- `npm run lint`: PASS
- Frontend smoke checks: PASS for `/login`, `/register`, `/dashboard`, `/dashboard/devices`, and `/dashboard/devices/demo`.
- Device management controls include search, status, OS, agent version, sort, pagination, loading, empty, and error states.
- Device detail includes identity, lifecycle, health bars, uptime, and recent telemetry.

## 6. Database verification

- TypeORM migration `MonitoringIndexes1720000003000` executed successfully.
- Follow-up migration run: `No migrations are pending`.
- TypeORM synchronization remains disabled.

## 7. Docker verification

- `docker compose up -d --build`: PASS.
- Healthy services: API, web, PostgreSQL, and Redis.
- Web available at `http://localhost:3000`.
- API available at `http://localhost:3001`.

## 8. Security verification

- Dashboard, device, and telemetry routes require JWT authentication.
- Device queries are organization-scoped for non-super-admin users.
- Device detail and telemetry lookup validate ownership before returning data.
- No M4 functionality or cross-tenant access path was added.

## 9. Manual verification flow

1. Start Docker Compose and open `http://localhost:3000`.
2. Sign in as a Security Admin or Viewer.
3. Confirm dashboard counts and status/OS visualizations load.
4. Open Devices, search by hostname/agent ID, filter by status/OS/version, change sort order, and use pagination.
5. Open a device row and confirm OS, IP, agent metadata, status, CPU, RAM, disk, uptime, and telemetry history.
6. Repeat with a Viewer account to confirm read-only visibility and with a different organization to confirm isolation.

## 10. Known limitations

- Charts are lightweight responsive visualizations; advanced analytics and prediction are intentionally out of scope.
- Full browser-driven authenticated E2E automation is not included; route smoke, backend tests, API status checks, and the documented manual flow are included.
- Production TLS, external monitoring, backups, managed secrets, and deployment alerting remain environment responsibilities.
- Existing upstream dependency advisories remain documented and were not force-fixed with a breaking downgrade.

## 11. Final status

M3 implementation and local verification are complete on the feature branch. Final approval/merge into `main` remains intentionally gated for reviewer sign-off.
