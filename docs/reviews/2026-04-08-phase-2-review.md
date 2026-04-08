# Phase 2 Review

## Scope

Phase 2 delivered the real backend metrics path for the dashboard:

- request log ingestion from live API routes
- SQLite-backed aggregation queries for dashboard views
- dashboard API routes for overview, usage, model breakdown, recent requests, and model mappings
- runtime wiring so the request sink flush loop starts with the application

## Changes

### Request Log Repository

- Added [`src/db/request-logs.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/request-logs.ts).
- Repository coverage:
  - batch insert for request log records
  - overview metrics aggregation
  - model breakdown aggregation
  - recent requests query with limit support

### Runtime Integration

- Updated [`src/db/runtime.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/runtime.ts).
- Runtime now exposes:
  - `requestLogRepository`
  - started `requestSink` flush lifecycle
- The sink write path now delegates to the request log repository instead of ad hoc storage logic.

### Live Request Instrumentation

- Added [`src/lib/request-log.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/lib/request-log.ts) to build structured log events and enqueue them asynchronously.
- Updated handlers and routes to emit logs after request completion:
  - [`src/routes/chat-completions/handler.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/routes/chat-completions/handler.ts)
  - [`src/routes/messages/handler.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/routes/messages/handler.ts)
  - [`src/routes/embeddings/route.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/routes/embeddings/route.ts)
  - [`src/routes/models/route.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/routes/models/route.ts)
- Logged fields include route, raw model, mapped display model, status, status code, latency, stream flag, token counts when available, and error summary.

### Dashboard API

- Added [`src/routes/dashboard/route.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/routes/dashboard/route.ts).
- Added route support for:
  - `GET /api/dashboard/overview`
  - `GET /api/dashboard/usage`
  - `GET /api/dashboard/models`
  - `GET /api/dashboard/requests`
  - `GET /api/dashboard/mappings`
  - `POST /api/dashboard/mappings`
  - `PUT /api/dashboard/mappings/:id`
  - `DELETE /api/dashboard/mappings/:id`
- Updated [`src/server.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/server.ts) to mount the dashboard API and wire runtime dependencies.

## Verification

### Tests

Passed:

```bash
bun test tests/request-sink.test.ts tests/model-mapping-store.test.ts tests/model-mappings-repository.test.ts tests/request-logs-repository.test.ts tests/dashboard-route.test.ts
```

Coverage of new behavior:

- repository aggregation queries
- dashboard API responses
- mapping CRUD API behavior
- request sink start lifecycle and batch writes

### Typecheck

Passed:

```bash
bun run typecheck
```

### Lint

Passed on changed files:

```bash
./node_modules/.bin/eslint --no-cache src/db/request-sink.ts src/db/request-logs.ts src/db/runtime.ts src/routes/dashboard/route.ts src/routes/chat-completions/handler.ts src/routes/messages/handler.ts src/routes/embeddings/route.ts src/routes/models/route.ts src/lib/request-log.ts src/server.ts tests/request-sink.test.ts tests/request-logs-repository.test.ts tests/dashboard-route.test.ts
```

Note:

- ESLint emits a `baseline-browser-mapping` staleness notice from dependencies.
- This is informational and did not produce a lint failure.

## Risks And Follow-up

1. The dashboard backend is ready, but there is still no user-facing dashboard frontend. That lands in Phase 3.
2. Request logging for streamed responses depends on handler completion paths; later verification should confirm end-of-stream accounting under real traffic.
3. `usage` data still depends on the upstream GitHub/Copilot endpoint shape, so the frontend should tolerate missing fields.
4. Mapping writes reload the in-memory store immediately, but there is not yet a dedicated manual reload endpoint or cache status UI.
