# RAG Client

A scalable React 18 + Vite + TypeScript application organized by business
feature. Redux Toolkit owns global client state, `createAsyncThunk` orchestrates
API workflows, and Axios provides one environment-driven HTTP client.

## Requirements

- Node.js 18.18 or newer
- npm 9 or newer
- An API compatible with the contracts described below

## Start the application

```powershell
Copy-Item .env.example .env
npm ci --registry=https://registry.npmjs.org
npm run dev
```

The default API URL is `http://127.0.0.1:4000/api/v1`.
The explicit registry flag is needed in this workspace because its configured
corporate npm feed does not currently mirror Vite or Redux Toolkit.

## Commands

```powershell
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

## Architecture

```text
src/
├── app/                    # Application composition only
│   ├── providers/
│   ├── router/
│   └── store/
├── config/                 # Environment configuration
├── features/               # Business-owned vertical slices
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   └── types/
│   ├── dashboard/
│   ├── not-found/
│   └── users/
├── services/               # Shared API client and error normalization
├── shared/                 # Cross-feature components, routes, and types
└── styles/
```

The request flow is:

```text
Component
  -> dispatch(async thunk)
  -> feature API service
  -> shared Axios baseService
  -> backend
  -> thunk lifecycle action
  -> feature reducer
  -> typed selector
  -> component
```

### Boundaries

- A feature owns its API calls, components, pages, thunks, slice, selectors,
  and domain types.
- Consumers should import a feature through its `index.ts` public API.
- `app` composes features but does not contain business logic.
- `shared` must not contain feature-specific behavior.
- Thunks orchestrate requests; Axios details stay in feature API services.
- HTTP-only authentication cookies are sent through `withCredentials`. Tokens
  are never stored in Redux or browser storage.
- API errors are converted to serializable objects before reaching Redux.

## API contracts

All successful endpoints return:

```json
{
  "success": true,
  "data": {}
}
```

Configured endpoints:

```text
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout
GET  /users
```

`/auth/register`, `/auth/login`, and `/auth/me` return an authenticated user in
`data`. `/users` returns an array of user records in `data`.

## Adding a feature

1. Create `src/features/<feature-name>`.
2. Add `api`, `components`, `pages`, `store`, and `types` only when needed.
3. Export the supported public surface from the feature's `index.ts`.
4. Add the reducer to `app/store/rootReducer.ts`.
5. Add lazy routes to `app/router/AppRouter.tsx`.
6. Add reducer and thunk lifecycle tests beside the feature store.
