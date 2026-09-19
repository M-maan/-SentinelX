# SentinelX — Milestone 2

SentinelX is an endpoint-security platform foundation. Milestone 1 (M1) is frozen as a secure multi-tenant foundation for authentication, organizations, users, and role-based access control. Milestone 2 adds endpoint enrollment and device telemetry while keeping detections, alerts, incidents, real-time monitoring, and AI out of scope.

## Status

M1 and M2 functional scopes are complete and verified on the M2 branch with production builds, automated backend tests, frontend route smoke tests, PostgreSQL migrations, live enrollment/heartbeat/telemetry checks, and Docker Compose startup. M2 is frozen on `feature/m2-endpoint-agents`; `main` remains the unchanged M1 baseline. See [M2_FINAL_AUDIT_REPORT.md](M2_FINAL_AUDIT_REPORT.md) for final evidence and caveats.

## Stack

- Frontend: Next.js 16, TypeScript, App Router, Tailwind CSS, Zustand, TanStack React Query
- Backend: NestJS, TypeScript, TypeORM, DTO validation
- Data/infrastructure: PostgreSQL, Redis foundation, Docker Compose
- Security: Argon2 password hashing, short-lived JWT access tokens, rotating opaque refresh tokens in HttpOnly cookies, Helmet, throttling, RBAC, organization ownership checks, audit logs

## Repository structure

```text
apps/api/    NestJS API, entities, migrations, tests
apps/web/    Next.js application, pages, API clients, smoke test
agents/      Go endpoint agent (`agents/sentinelx-agent`)
docker-compose.yml
.env.example
AUDIT_REPORT.md
M2_FINAL_AUDIT_REPORT.md
```

## Prerequisites

- Node.js 24+
- npm 11+
- Docker Desktop with Compose

## Environment setup

Copy `.env.example` to `.env` and replace the placeholder JWT secrets with long random values. `.env` is local-only and ignored by Git. The API uses `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `PORT`, `CORS_ORIGIN`, and `AGENT_OFFLINE_THRESHOLD_SECONDS`; the web app uses `NEXT_PUBLIC_API_URL`.

For the Go agent, configure `SENTINELX_API_URL` (normally `http://localhost:3001/api/v1`), `SENTINELX_ENROLLMENT_TOKEN` for first enrollment, and optionally `SENTINELX_AGENT_ID`, `SENTINELX_AGENT_TOKEN`, `SENTINELX_AGENT_VERSION`, `SENTINELX_INTERVAL`, and `SENTINELX_DATA_DIR`.

## Local development

Install dependencies from the repository root:

```powershell
npm install
```

Start PostgreSQL and Redis:

```powershell
docker compose up postgres redis -d
```

Build the API and apply TypeORM migrations:

```powershell
npm run build -w @sentinelx/api
npm run migration:run -w @sentinelx/api
```

Start API and web in separate terminals:

```powershell
npm run dev:api
npm run dev:web
```

Open `http://localhost:3000`.

## Production builds and tests

```powershell
npm run build -w @sentinelx/api
npm run build -w @sentinelx/web
npm run lint
npx --no-install tsc --noEmit --pretty false --project apps/web/tsconfig.json
npm run test -w @sentinelx/api -- --no-coverage
npm run test:smoke -w @sentinelx/web
```

The backend test suite covers authentication services and organization/RBAC guards. The frontend smoke test checks the public and protected route responses.

## Docker Compose

Build and start the complete M1 stack:

```powershell
docker compose build
docker compose up -d
docker compose ps
```

Services are exposed at Web `http://localhost:3000`, API `http://localhost:3001`, PostgreSQL `localhost:5432`, and Redis `localhost:6379`. The API container uses the Compose service names for its database and Redis connections.

## Database commands

```powershell
npm run migration:run -w @sentinelx/api
npm run migration:revert -w @sentinelx/api
```

Never enable TypeORM synchronization for shared or production databases; schema changes belong in migrations. To inspect migration status after a production build:

```powershell
docker compose exec api ./node_modules/.bin/typeorm migration:show -d dist/database/data-source.js
```

## Demo flow

For local demonstration only, build the API and seed the documented demo account:

```powershell
npm run build -w @sentinelx/api
$env:DEMO_EMAIL='demo@sentinelx.local'; $env:DEMO_PASSWORD='choose-a-local-demo-password'; npm run seed:demo -w @sentinelx/api
```

Then sign in at `http://localhost:3000/login` with the local values you assigned to `DEMO_EMAIL` and `DEMO_PASSWORD`. These credentials are development-only; change them before any shared deployment.

Show the dashboard, Organization page, Users page, user creation, role change, logout, and protected-route behavior. For M2, open Devices as a Security Admin, generate a short-lived enrollment token, configure the Go agent, run one heartbeat/telemetry cycle, and confirm the endpoint appears ONLINE with telemetry. Test hostname/agent ID, OS, status, and pagination filters, then revoke or rotate the agent credential and verify the old credential is rejected.

## Known production caveats

- Replace all demo credentials and local JWT secrets before deployment.
- `npm audit --omit=dev` currently reports four high-severity upstream `multer` advisories pulled through NestJS platform packages. The available automatic fix is a breaking NestJS downgrade; it was not applied blindly.
- Full frontend component/form automation is not part of this frozen M1 baseline; route smoke coverage is present.
- Add deployment-specific TLS, secret management, observability, backup, and incident-response controls before production use.

## Milestone 2 completed scope

M2 is implemented and frozen on `feature/m2-endpoint-agents`, based on the frozen M1 commit. It includes:

- 30-minute organization enrollment tokens with revocation.
- Hashed agent credentials with rotation and revocation.
- Organization-scoped enrollment, heartbeat, telemetry, list, and detail APIs.
- Online/offline status, hostname/agent ID search, OS/status filters, and pagination.
- Devices dashboard and telemetry detail page.
- Go agent identity persistence, retry/backoff, and real CPU, memory, disk, and uptime collection on Windows/Linux.
- Docker health checks and API health endpoint.

Verification evidence is recorded in [M2_FINAL_AUDIT_REPORT.md](M2_FINAL_AUDIT_REPORT.md) and [M2_AUDIT_REPORT.md](M2_AUDIT_REPORT.md).

For a local agent, generate an enrollment token as a Security Admin from Devices, then run from `agents/sentinelx-agent`:

```powershell
$env:SENTINELX_API_URL='http://localhost:3001/api/v1'
$env:SENTINELX_ENROLLMENT_TOKEN='sx_enroll_...'
go run ./cmd/sentinelx-agent -once
```

Use `SENTINELX_INTERVAL=60s` and omit `-once` for continuous local operation. Enrollment tokens are secrets and must not be committed or shared in screenshots.

## Verification commands

```powershell
npm run build
npm run lint
npm test
npm run test:smoke -w @sentinelx/web
docker compose up -d --build
docker compose ps
docker compose exec api ./node_modules/.bin/typeorm migration:show -d dist/database/data-source.js
```

## M2 known limitations

- M2 does not include detections, alerts, incidents, realtime streaming, AI, or remediation.
- Production still requires TLS, managed secrets, external monitoring/alerting, backups, and a service manager for the Go agent.
- Windows collection uses PowerShell/CIM and Linux collection uses `/proc` and `df`; unavailable OS counters safely produce zero for that metric.
- Known upstream dependency advisories remain documented; no breaking automatic downgrade was applied.

## Handover

### Milestone 3 monitoring dashboard

M3 is developed on `feature/m3-monitoring-dashboard` and adds a visibility layer on top of the existing M2 agent data. It does not add detections, alerts, incidents, AI, automated response, or advanced SIEM functionality.

Completed M3 scope:

- Authenticated dashboard summary with total, online, offline, operating-system, and agent-version counts.
- Organization-scoped device listing with hostname/agent ID search, status/OS/agent-version filters, pagination, and sorting.
- Device profile view with identity, OS, network, lifecycle, status, and latest telemetry information.
- Telemetry query endpoint with organization ownership validation and CPU, memory, disk, and uptime data.
- Responsive health visualizations and recent telemetry history.
- PostgreSQL indexes for device lookup and telemetry time-series queries.

M3 usage flow:

1. Sign in and open **Dashboard** to see organization-wide device health counts.
2. Open **Devices**, use search/filter/sort controls, and select a device row.
3. Review the device profile, latest health bars, uptime, and recent telemetry records.
4. Generate an enrollment package from Devices only when a Security Admin needs to add another endpoint.

M3 verification commands:

```powershell
git checkout feature/m3-monitoring-dashboard
npm run build -w @sentinelx/api
npm run build -w @sentinelx/web
npm run lint
npm run test:smoke -w @sentinelx/web
npm run migration:run -w @sentinelx/api
docker compose up -d --build
docker ps
```

The dashboard summary and telemetry routes require a valid JWT and enforce organization isolation. TLS, managed secrets, centralized monitoring, backups, and deployment-specific alerting remain operational concerns outside this local M3 implementation.

The `main` branch remains the frozen M1 baseline. Milestone 2 work is isolated to `feature/m2-endpoint-agents` and must not be merged into M1 until its own acceptance checklist passes.
