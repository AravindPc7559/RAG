# RAG Server

An Express 5 + TypeScript modular monolith using MongoDB, HTTP-only JWT
cookies, request validation, structured logging, role authorization, and
Controller → Service → Repository boundaries.

## Requirements

- Node.js 22.12 or newer
- MongoDB
- npm 10 or newer

Node 22.22.3 is already installed through NVM on this machine:

```powershell
nvm use 22.22.3
```

## Start locally

```powershell
Copy-Item .env.example .env
npm ci --registry=https://registry.npmjs.org
npm run dev
```

The API starts at `http://127.0.0.1:4000/api/v1`.

The public registry flag is required in this workspace because its configured
corporate feed does not currently mirror all project dependencies.

## Commands

```powershell
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm start
npm run seed:admin
```

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` before running
`seed:admin`. If the email already exists, the account is promoted to an active
administrator without changing its password.

## Architecture

```text
src/
├── app.ts
├── server.ts
├── config/
│   ├── database.ts
│   ├── env.ts
│   └── logger.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.middleware.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.schema.ts
│   │   ├── auth.mapper.ts
│   │   └── auth.module.ts
│   ├── users/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   ├── user.model.ts
│   │   ├── user.routes.ts
│   │   ├── user.schema.ts
│   │   └── user.module.ts
│   └── health/
├── routes/
└── shared/
    ├── errors/
    ├── middleware/
    ├── security/
    ├── types/
    └── utils/
```

Request flow:

```text
Route
  → validation/authentication middleware
  → Controller
  → Service
  → Repository
  → MongoDB
```

### Boundaries

- Routes contain endpoint and middleware wiring.
- Controllers translate HTTP input and output.
- Services own business rules and authorization-independent workflows.
- Repositories own MongoDB queries.
- Mappers ensure password hashes and persistence details never enter responses.
- Module factories manually wire dependencies without decorators or a DI
  framework.
- The composition root injects repositories, which allows API integration tests
  to use an in-memory implementation.

## API response format

Successful response:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

Error response:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}
}
```

## Endpoints

```text
GET  /api/v1/health/live
GET  /api/v1/health/ready

POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout

GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users       admin only
PATCH  /api/v1/users/:id   admin only
DELETE /api/v1/users/:id   admin only
```

All user endpoints require a valid cookie session. Authentication validates the
JWT signature and reloads the account on every request, so deleted or disabled
accounts lose access immediately.

## Scaling model

- API instances are stateless and can run behind a load balancer.
- MongoDB uses bounded connection pooling.
- Health and readiness endpoints support container orchestration.
- Request IDs and Pino JSON logs support distributed observability.
- Rate limits use in-process storage locally. Replace the default store with a
  shared Redis-compatible store before running multiple API instances.
- Move email, file processing, AI/RAG indexing, and other slow operations into
  independently scalable queue workers.
- Extract a module into a separate service only when it needs independent
  deployment, ownership, scaling, or failure isolation.
