# SentinelX — Milestone 1

SentinelX is an endpoint-security platform foundation. Milestone 1 (M1) is frozen as a secure multi-tenant foundation for authentication, organizations, users, and role-based access control. Agents, telemetry, detections, alerts, incidents, real-time monitoring, and AI are intentionally out of scope until Milestone 2.

## Status

M1 functional scope is complete and verified with production builds, automated backend tests, frontend route smoke tests, PostgreSQL migrations, live authentication/RBAC smoke tests, and Docker Compose startup. See [AUDIT_REPORT.md](AUDIT_REPORT.md) for evidence and caveats.

## Stack

- Frontend: Next.js 16, TypeScript, App Router, Tailwind CSS, Zustand, TanStack React Query
- Backend: NestJS, TypeScript, TypeORM, DTO validation
- Data/infrastructure: PostgreSQL, Redis foundation, Docker Compose
- Security: Argon2 password hashing, short-lived JWT access tokens, rotating opaque refresh tokens in HttpOnly cookies, Helmet, throttling, RBAC, organization ownership checks, audit logs

## Repository structure

```text
apps/api/    NestJS API, entities, migrations, tests
apps/web/    Next.js application, pages, API clients, smoke test
docker-compose.yml
.env.example
AUDIT_REPORT.md
```

## Prerequisites

- Node.js 24+
- npm 11+
- Docker Desktop with Compose

## Environment setup

Copy `.env.example` to `.env` and replace the placeholder JWT secrets with long random values. `.env` is local-only and ignored by Git. The API uses `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, and `PORT`; the web app uses `NEXT_PUBLIC_API_URL`.

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

Never enable TypeORM synchronization for shared or production databases; schema changes belong in migrations.

## Demo flow

For local demonstration only, build the API and seed the documented demo account:

```powershell
npm run build -w @sentinelx/api
$env:DEMO_EMAIL='demo@sentinelx.local'; $env:DEMO_PASSWORD='choose-a-local-demo-password'; npm run seed:demo -w @sentinelx/api
```

Then sign in at `http://localhost:3000/login` with the local values you assigned to `DEMO_EMAIL` and `DEMO_PASSWORD`. These credentials are development-only; change them before any shared deployment.

Show the dashboard, Organization page, Users page, user creation, role change, logout, and protected-route behavior. M1 does not include security agents, device telemetry, detections, alerts, incidents, real-time monitoring, or an AI assistant.

## Known production caveats

- Replace all demo credentials and local JWT secrets before deployment.
- `npm audit --omit=dev` currently reports four high-severity upstream `multer` advisories pulled through NestJS platform packages. The available automatic fix is a breaking NestJS downgrade; it was not applied blindly.
- Full frontend component/form automation is not part of this frozen M1 baseline; route smoke coverage is present.
- Add deployment-specific TLS, secret management, observability, backup, and incident-response controls before production use.

## Handover

This repository is the frozen M1 baseline. Milestone 2 should start from this state in a separate change set and must not be mixed into the M1 freeze.
