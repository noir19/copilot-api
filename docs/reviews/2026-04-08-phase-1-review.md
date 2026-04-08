# Phase 1 Review

## Scope

Phase 1 delivered the backend foundations for the dashboard work:

- SQLite schema initialization
- asynchronous request sink with bounded retries and drops
- model mappings SQLite repository
- in-memory model mapping store with reloadable lifecycle
- runtime initialization wiring for database-backed dashboard services

## Changes

### Data Layer

- Added [`src/db/schema.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/schema.ts) to initialize:
  - `request_logs`
  - `model_mappings`
  - `dashboard_meta`
- Added [`src/db/model-mappings.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/model-mappings.ts) for CRUD access to model mappings.

### Async Logging Foundation

- Added [`src/db/request-sink.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/request-sink.ts).
- Request sink behavior:
  - enqueue on request path
  - explicit batch flush
  - retry queue with retry window and attempt cap
  - oldest-entry drop on queue overflow

### Model Mapping Cache

- Added [`src/lib/model-mapping-store.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/lib/model-mapping-store.ts).
- Store behavior:
  - full load from repository on startup
  - in-memory O(1) display name resolution
  - reload support after config writes
  - cache metadata snapshot with version, count, enabled count, timestamps

### Runtime Wiring

- Added [`src/db/runtime.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/runtime.ts).
- Updated [`src/start.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/start.ts) to initialize dashboard runtime during server startup.
- Updated [`src/lib/paths.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/lib/paths.ts) and [`src/debug.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/debug.ts) to surface the SQLite database path.

## Verification

### Tests

Passed:

```bash
bun test tests/request-sink.test.ts tests/model-mapping-store.test.ts tests/model-mappings-repository.test.ts
```

Coverage of new behavior:

- async request sink flush
- retry and drop semantics
- queue overflow handling
- model mapping repository CRUD
- model mapping cache load and reload lifecycle

### Typecheck

Passed:

```bash
bun run typecheck
```

### Lint

Passed on changed files:

```bash
./node_modules/.bin/eslint --no-cache src/db/request-sink.ts src/db/schema.ts src/db/model-mappings.ts src/db/runtime.ts src/lib/model-mapping-store.ts src/lib/model-map.ts src/lib/paths.ts src/start.ts src/debug.ts tests/request-sink.test.ts tests/model-mapping-store.test.ts tests/model-mappings-repository.test.ts
```

Note:

- ESLint emits a `baseline-browser-mapping` staleness notice from dependencies.
- This is informational and did not produce a lint failure after code fixes.

## Risks And Follow-up

1. `request_logs` writes are initialized, but request handlers are not yet emitting real records. That lands in Phase 2.
2. `model-map.ts` still loads JSON aliases for current compatibility. The request path is not yet switched to the SQLite-backed cache.
3. Dashboard APIs and UI are not included in this phase.
4. Runtime initialization is singleton-based; later phases should avoid bypassing it from route-level code.
