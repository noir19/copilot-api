# Request Log Retention Review

## Scope

This change keeps request logging asynchronous while adding bounded retention for operational troubleshooting:

- request logs continue to be enqueued on the request path and flushed in the background
- SQLite request logs are automatically pruned to a configurable retention window
- the default retention is 15 days
- the retention window and cleanup interval are now runtime-configurable

## Changes

### Runtime Config

- Added [`src/lib/dashboard-config.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/lib/dashboard-config.ts).
- New runtime settings:
  - `COPILOT_API_REQUEST_LOG_RETENTION_DAYS`
  - `COPILOT_API_REQUEST_LOG_CLEANUP_INTERVAL_MS`
- Defaults:
  - retention: `15` days
  - cleanup cadence: `21600000` ms (6 hours)

### Request Log Repository

- Updated [`src/db/request-logs.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/request-logs.ts) with `deleteOlderThan(cutoff)`.
- This allows background pruning without affecting request-path inserts.

### Runtime Wiring

- Updated [`src/db/runtime.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/db/runtime.ts).
- Runtime now:
  - reads the retention config once at startup
  - keeps request inserts on the existing async sink
  - prunes expired request logs during dashboard-runtime initialization
  - schedules future pruning on a background interval

### Debug And Docs

- Updated [`src/debug.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/debug.ts) to surface:
  - `REQUEST_LOG_RETENTION_DAYS`
  - `REQUEST_LOG_CLEANUP_INTERVAL_MS`
- Updated [`README.md`](/Users/ken/Desktop/code/ai/copilot-api/README.md) to document async request logging and retention-related env vars.

## Verification

### Lint

Passed:

```bash
bun run lint
```

### Typecheck

Passed:

```bash
bun run typecheck
```

### Tests

Passed:

```bash
bun test tests/request-logs-repository.test.ts tests/dashboard-config.test.ts tests/request-sink.test.ts tests/dashboard-route.test.ts
```

Coverage includes:

- request-log pruning by cutoff
- default retention config values
- cutoff calculation for a 15-day window
- existing async sink behavior

### Build

Passed:

```bash
bun run build
```

## Risks And Follow-up

1. Cleanup currently runs on a fixed interval inside the application process; there is no dashboard UI for changing these values yet.
2. Pruning is based on request `timestamp`, so incorrect system time would affect retention behavior.
3. The startup path performs an immediate prune once dashboard runtime initializes; this is off the request path, but it still adds a small amount of startup work proportional to expired log volume.
