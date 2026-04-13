# Dashboard Token Trend Periods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dashboard token trends readable by splitting input/output token charts and allow selecting specific natural day/week/month/year periods.

**Architecture:** Extend the existing time-series path instead of adding a new endpoint. The frontend computes natural period bounds and the backend applies an exclusive `timeTo` filter before bucket aggregation.

**Tech Stack:** Bun, Hono, React, Recharts, TypeScript, Biome.

---

## File Structure

- Modify `src/db/request-logs.ts`: add `timeTo` to time-series filtering and repository options.
- Modify `src/routes/dashboard/route.ts`: parse and forward `timeTo`.
- Modify `dashboard/src/lib/dashboard-api.ts`: allow `loadTimeSeries` to pass `timeTo`.
- Modify `dashboard/src/components/dashboard/request-trend-card.tsx`: add natural period picker state, compute natural bounds, and split token charts.
- Modify `tests/request-logs-repository.test.ts`: add bounded time-series coverage.
- Modify `tests/dashboard-route.test.ts`: add route forwarding coverage.

## Tasks

### Task 1: Backend bounded time-series support

**Files:**
- Modify: `src/db/request-logs.ts`
- Modify: `src/routes/dashboard/route.ts`
- Test: `tests/request-logs-repository.test.ts`
- Test: `tests/dashboard-route.test.ts`

- [ ] Add `timeTo?: string` to `getTimeSeries` option types in the repository and dashboard route dependency.
- [ ] Update `readTimeSeries` to add `timestamp < ?` when `timeTo` is present.
- [ ] Update `/api/dashboard/time-series` to read `timeTo` and pass it into `deps.getTimeSeries`.
- [ ] Add a repository test that inserts rows before, inside, and exactly at the upper bound and expects only inside rows in the result.
- [ ] Add a route test asserting `timeTo` is forwarded to `getTimeSeries`.
- [ ] Run `bun test tests/request-logs-repository.test.ts tests/dashboard-route.test.ts`.

### Task 2: Frontend API and natural period state

**Files:**
- Modify: `dashboard/src/lib/dashboard-api.ts`
- Modify: `dashboard/src/components/dashboard/request-trend-card.tsx`

- [ ] Update `loadTimeSeries(bucketMinutes, limit, timeFrom?, timeTo?)`.
- [ ] Add natural period state in the trend card for date, week, month, and year.
- [ ] Compute local natural period `timeFrom`, exclusive `timeTo`, and bucket limits for day/week/month/year.
- [ ] Keep rolling mode behavior unchanged.
- [ ] Show the matching picker only when `windowMode === "calendar"`.

### Task 3: Split token chart rendering

**Files:**
- Modify: `dashboard/src/components/dashboard/request-trend-card.tsx`

- [ ] Replace the shared token chart with two stacked charts in Token mode.
- [ ] Keep request and error modes as a single chart.
- [ ] Update Token summary cards to show Input total, Output total, peak bucket, and active bucket count.
- [ ] Keep loading and empty states stable.

### Task 4: Verification and manual review instance

**Files:**
- No direct source edits expected.

- [ ] Run `bun run lint`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Start an instance on port 4142.
- [ ] Open `http://localhost:4142/dashboard` and capture a screenshot for review.
