# Dashboard Pricing And Sticky Review — 2026-04-09

## Scope

This review covers the dashboard persistence and UI work shipped in release `1.1.2`.

- Persist OpenRouter pricing snapshots and estimated cost in SQLite instead of computing cost in the browser
- Backfill historical request pricing when possible
- Normalize request and alias model ids to lowercase to remove duplicate rows caused by casing
- Rework dashboard sticky behavior for overview, filters, and log table headers
- Improve request logs table layout and horizontal scrolling
- Split overview token summary into input and output
- Rework trend chart token view to keep a single `Token` tab while rendering input/output bars together

## Findings

No blocking findings remain in the shipped diff.

Issues found and fixed during implementation:

1. Sticky table headers were ineffective inside the horizontal scroll container.
   Fix: extracted the log header into its own sticky layer and synced horizontal scroll with the body.

2. Overview metrics and top chrome were using separate sticky anchors, which caused visible drift while scrolling.
   Fix: moved header, tabs, and overview metrics into one sticky container.

3. Model distribution could split the same model into multiple rows because of casing differences.
   Fix: normalized persisted model ids and aliases to lowercase and aggregated defensively in the UI.

4. Trend card briefly regressed to a white screen because `formatCompactNumber` was removed from imports while still used by the Y axis.
   Fix: restored the import and re-verified the built dashboard on the local dev server.

## Key Changes

### Backend

- `request_logs` now stores:
  - pricing source
  - pricing model id
  - prompt/completion/request pricing
  - `estimated_cost_usd`
- overview aggregation now returns:
  - `inputTokens`
  - `outputTokens`
  - `totalTokens`
  - summed persisted estimated cost
- time series now returns:
  - `inputTokens`
  - `outputTokens`
  - `tokens`
  - `requests`
  - `errors`

### Frontend

- request log table no longer computes estimated cost client-side
- overview cards show separate input/output token totals
- trend chart keeps three tabs:
  - `请求数`
  - `Token`
  - `错误数`
- `Token` now renders two bars per bucket:
  - input token
  - output token
- trend summary now includes:
  - current total
  - peak bucket
  - peak value
  - non-zero buckets
- global overscroll behavior is constrained to reduce page bounce

## Verification

Verified during implementation:

- `bun test tests/request-logs-repository.test.ts tests/dashboard-route.test.ts`
- `bun run lint`
- `bun run build:dashboard`

Manual QA was performed against local dashboard instance `http://localhost:4142/dashboard` using MCP browser checks for:

- overview sticky behavior
- log filter/header sticky behavior
- model casing normalization in distribution output
- trend chart tab behavior
- post-fix recovery from runtime white screen

## Release Notes

Release `1.1.2` is primarily a dashboard correctness and usability release. The main user-visible changes are accurate persisted pricing, normalized model breakdowns, more stable sticky behavior, clearer token reporting, and a denser but more readable overview layout.
