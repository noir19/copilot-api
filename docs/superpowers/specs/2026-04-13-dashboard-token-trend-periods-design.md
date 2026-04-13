# Dashboard Token Trend Periods Design

## Context

The dashboard request trend card currently supports rolling and current natural windows with day/week/month/year granularity. Token mode renders input and output token bars on one chart with a shared Y axis. In real data, input token volume can be orders of magnitude larger than output token volume, which makes output bars hard to read.

The desired workflow is to inspect token/request/error trends for a specific natural day, ISO week, month, or year, not only the current natural period. ISO weeks start on Monday and end on Sunday.

## Design

Token mode will render two vertically stacked bar charts:

- Input Token chart
- Output Token chart

Both charts use the same bucketed time-series data, X-axis formatting, loading state, and tooltip period labels. Each chart owns its own Y axis so output token values remain visible when input values are much larger.

Time selection keeps the existing two-window model:

- Rolling: recent buckets for the selected granularity.
- Natural: a calendar-aligned period picker for the selected granularity.

Natural period controls:

- Day: date input, covering local 00:00 through the next day 00:00.
- Week: week input, covering Monday 00:00 through the next Monday 00:00.
- Month: month input, covering the first day of the selected month through the first day of the next month.
- Year: numeric year input, covering January 1 through January 1 of the next year.

The frontend computes `timeFrom` and `timeTo` as ISO strings. The backend `/api/dashboard/time-series` endpoint will accept `timeTo` and aggregate records with `timestamp >= timeFrom` and `timestamp < timeTo`. Rolling mode can continue using only `bucket` and `limit`.

## Data Flow

1. User selects `自然` and a granularity.
2. The trend card shows the matching period picker.
3. The frontend computes bucket size, bucket limit, `timeFrom`, and `timeTo`.
4. The dashboard API fetches `/api/dashboard/time-series?bucket=...&limit=...&timeFrom=...&timeTo=...`.
5. The repository applies the bounded time filter, aggregates buckets, fills missing buckets, and returns ascending points.
6. The trend card renders requests/errors in a single chart, and tokens in two stacked charts.

## Testing

Repository tests should cover bounded natural time-series filtering with `timeFrom` and `timeTo`, including exclusion of rows at the upper bound.

Route tests should cover forwarding `timeTo` from `/api/dashboard/time-series` into the dependency call.

Frontend verification should include build/typecheck and a local dashboard instance on port 4142 for manual review.
