# Copilot API Proxy

[中文说明](./README.zh-CN.md)

> [!WARNING]
> This is a reverse-engineered proxy of GitHub Copilot API. It is not supported by GitHub, and may break unexpectedly. Use at your own risk.

> [!WARNING]
> **GitHub Security Notice:**  
> Excessive automated or scripted use of Copilot (including rapid or bulk requests, such as via automated tools) may trigger GitHub's abuse-detection systems.  
> You may receive a warning from GitHub Security, and further anomalous activity could result in temporary suspension of your Copilot access.
>
> GitHub prohibits use of their servers for excessive automated bulk activity or any activity that places undue burden on their infrastructure.
>
> Please review:
>
> - [GitHub Acceptable Use Policies](https://docs.github.com/site-policy/acceptable-use-policies/github-acceptable-use-policies#4-spam-and-inauthentic-activity-on-github)
> - [GitHub Copilot Terms](https://docs.github.com/site-policy/github-terms/github-terms-for-additional-products-and-features#github-copilot)
>
> Use this proxy responsibly to avoid account restrictions.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E519XS7W)

---

**Note:** If you are using [opencode](https://github.com/sst/opencode), you do not need this project. Opencode supports GitHub Copilot provider out of the box.

---

## Project Overview

A reverse-engineered proxy for the GitHub Copilot API that exposes it as an OpenAI and Anthropic compatible service. This allows you to use GitHub Copilot with any tool that supports the OpenAI Chat Completions API or the Anthropic Messages API, including to power [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview).

## Architecture

### Request Flow

There are two distinct request paths depending on the client protocol:

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│                                                             │
│  Anthropic format           OpenAI format                   │
│  POST /v1/messages          POST /v1/chat/completions        │
└────────────┬────────────────────────┬───────────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────────────────────────────────────────────┐
│                    Hono HTTP Server                         │
│                    src/server.ts                            │
│                                                             │
│  /v1/messages ──► messages/handler.ts                       │
│                   translateToOpenAI()    ◄── format convert │
│                                                             │
│  /v1/chat/completions ──► chat-completions/handler.ts       │
│                           (native OpenAI, no conversion)    │
└────────────────────────────┬───────────────────────────────┘
                             │
                             │  Both paths converge here
                             ▼
┌────────────────────────────────────────────────────────────┐
│              createChatCompletions()                        │
│        src/services/copilot/create-chat-completions.ts      │
│                                                             │
│  Attaches: Authorization: Bearer ${state.copilotToken}      │
│  Target:   https://api.githubcopilot.com                    │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
                    GitHub Copilot API
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                    Response path                            │
│                                                             │
│  /v1/messages ──► translateToAnthropic()  (format convert) │
│  /v1/chat/completions ──► passthrough                       │
│                                                             │
│  Both paths: enqueueRequestLog() ──► SQLite async sink      │
└────────────────────────────────────────────────────────────┘
```

### Anthropic ↔ OpenAI Format Translation

Requests arriving at `/v1/messages` go through a two-way translation layer in `src/routes/messages/`:

| Direction | Function | File |
|-----------|----------|------|
| Request: Anthropic → OpenAI | `translateToOpenAI()` | `non-stream-translation.ts` |
| Response: OpenAI → Anthropic (non-stream) | `translateToAnthropic()` | `non-stream-translation.ts` |
| Response: OpenAI → Anthropic (stream) | `translateChunkToAnthropicEvents()` | `stream-translation.ts` |

Key field mappings (Anthropic → OpenAI):

| Anthropic field | OpenAI field | Notes |
|---|---|---|
| `model` | `model` | resolved via `resolveModelName()` |
| `max_tokens` | `max_tokens` | non-GPT-5 models |
| `max_tokens` | `max_completion_tokens` | GPT-5 models only |
| `stop_sequences` | `stop` | |
| `system` (string or block array) | `messages[0]` role=`system` | block array joined with `\n\n` |
| user `tool_result` blocks | role=`tool` messages | split into separate messages |
| assistant `tool_use` blocks | `tool_calls` array | |
| `thinking` blocks | merged into `content` text | OpenAI has no thinking concept |
| `tool_choice: any` | `"required"` | |
| `tool_choice: tool` | `{type:"function", function:{name}}` | |
| tools `input_schema` | tools `parameters` | |

> **Note:** `thinking` blocks are one-way lossy — they are sent to Copilot as plain text but Copilot responses never contain thinking blocks.

### Model Resolution

Every request model name goes through `resolveModelName()` (`src/lib/model-map.ts`) before reaching Copilot:

```
Requested model name
        │
        ▼
1. SQLite alias lookup (model_aliases table, in-memory cache)
        │ hit → resolved name
        │ miss ↓
2. Exact match against state.models list
        │ hit → original name
        │ miss ↓
3. Dash-to-dot conversion (e.g. claude-sonnet-4-6 → claude-sonnet-4.6)
   (can be disabled in dashboard Settings)
        │ hit → matched name
        │ miss ↓
4. Passthrough (original name sent as-is)
```

### Data Layer (SQLite)

All runtime data is persisted in a single SQLite database (WAL mode):

| Table | Purpose |
|---|---|
| `request_logs` | Async request log ingestion; used for dashboard trends, recent requests, cost estimates |
| `model_aliases` | Request-path alias resolution; keyed by `(source_model, enabled)`, loaded into in-memory cache on startup, refreshed after writes |
| `dashboard_meta` | Dashboard settings (retention policy, dash-to-dot toggle, etc.) |
| `openrouter_pricing_cache` | Daily snapshot of OpenRouter pricing; used to estimate equivalent cost |

Default DB path: `~/.local/share/copilot-api/copilot-api.db` — override with `COPILOT_API_DB_PATH`.

## Features

- **OpenAI & Anthropic Compatibility**: Exposes GitHub Copilot as an OpenAI-compatible (`/v1/chat/completions`, `/v1/models`, `/v1/embeddings`) and Anthropic-compatible (`/v1/messages`) API.
- **Claude Code Integration**: Easily configure and launch [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) to use Copilot as its backend with a simple command-line flag (`--claude-code`).
- **Usage Dashboard**: A web-based dashboard to monitor your Copilot API usage, view quotas, and see detailed statistics.
- **SQLite-backed Dashboard Control Plane**: The dashboard persists request logs, model aliases, and display-name mappings in SQLite so operational data survives restarts and can be managed in the UI or via SQL.
- **Rate Limit Control**: Manage API usage with rate-limiting options (`--rate-limit`) and a waiting mechanism (`--wait`) to prevent errors from rapid requests.
- **Manual Request Approval**: Manually approve or deny each API request for fine-grained control over usage (`--manual`).
- **Token Visibility**: Option to display GitHub and Copilot tokens during authentication and refresh for debugging (`--show-token`).
- **Flexible Authentication**: Authenticate interactively or provide a GitHub token directly, suitable for CI/CD environments.
- **Automatic Token Recovery**: Persists GitHub `access_token` and `refresh_token`, refreshes GitHub tokens before expiry, refreshes Copilot IDE tokens automatically, and retries once on `401 token expired`.
- **Runtime Token Reloading**: Watches `GH_TOKEN_FILE` / `--github-token-file` for updates so containers can pick up host-side `copilot-api auth` runs without restarting.
- **Support for Different Account Types**: Works with individual, business, and enterprise GitHub Copilot plans.

## Demo

https://github.com/user-attachments/assets/7654b383-669d-4eb9-b23c-06d7aefee8c5

## Prerequisites

- Bun (>= 1.2.x)
- GitHub account with Copilot subscription (individual, business, or enterprise)

## Installation

To install dependencies, run:

```sh
bun install
```

## Authentication Architecture

The proxy now treats GitHub authentication as a managed token lifecycle instead of a one-time login:

- `copilot-api auth` stores structured token metadata in `~/.local/share/copilot-api/github_token`
- The stored file can include `access_token`, `refresh_token`, and expiry timestamps
- `start` will prefer `--github-token-file` or `GH_TOKEN_FILE`, then fall back to the local token store, then interactive auth
- GitHub access tokens are refreshed automatically when a refresh token is available
- Copilot IDE tokens are refreshed in the background and retried once if the API returns `401 token expired`
- If a watched token file changes at runtime, the process reloads it and refreshes the Copilot token

Two key mappings drive the whole flow:

- `github_token.accessToken -> state.githubToken -> authorization: token ${state.githubToken}`
- `GET /copilot_internal/v2/token -> response.token -> state.copilotToken -> Authorization: Bearer ${state.copilotToken}`

```text
GitHub Device Flow / host-side copilot-api auth
                    |
                    v
+--------------------------------------------------+
| github_token JSON file                           |
|                                                  |
|  accessToken               -> GitHub access token|
|  refreshToken              -> GitHub refresh token
|  accessTokenExpiresAt      -> access token expiry|
|  refreshTokenExpiresAt     -> refresh token expiry
|  updatedAt                 -> last update time   |
+--------------------------------------------------+
                    |
                    | load as one object / watch for file changes
                    v
+--------------------------------------------------+
| src/lib/token.ts                                 |
| Token Manager                                    |
|                                                  |
|  1. Read the whole github_token JSON             |
|  2. accessToken -> state.githubToken             |
|  3. expiry fields -> decide whether refresh is needed
|  4. refreshToken -> refresh GitHub access token  |
|  5. write updated github_token JSON              |
|  6. use state.githubToken to fetch Copilot token |
+--------------------------------------------------+
                    |
                    v
state.githubToken
                    |
                    v
GitHub header: authorization: token ${state.githubToken}
                    |
                    v
GET /copilot_internal/v2/token
                    |
                    v
response.token -> state.copilotToken
                    |
                    v
Copilot header: Authorization: Bearer ${state.copilotToken}
                    |
                    v
API request
```

## Using with Docker

Build image

```sh
docker build -t copilot-api .
```

Run the container

```sh
# Create a directory on your host to persist the GitHub token metadata and related data
mkdir -p ./copilot-data

# Run the container with a bind mount to persist the managed token store.
# This keeps refresh tokens and expiry metadata available across container restarts.

docker run -p 4141:4141 -v $(pwd)/copilot-data:/root/.local/share/copilot-api copilot-api
```

> **Note:**
> The GitHub token metadata, SQLite dashboard database, and related runtime data will be stored in `copilot-data` on your host. This is mapped to `/root/.local/share/copilot-api` inside the container, ensuring persistence across restarts and preserving both token refresh state and dashboard history.

### Dashboard Data Model

The dashboard now uses SQLite as the source of truth for runtime metadata:

- `request_logs`: async request log ingestion for dashboard trends, recent requests, and troubleshooting
- `model_aliases`: request-path alias resolution, replacing the old `model-aliases.json` workflow. The table is keyed by `(source_model, enabled)` so one request model can keep separate enabled and disabled configurations, while duplicate rows for the same request model and status are rejected.

`model_aliases` are loaded into an in-memory cache on startup and refreshed after dashboard writes, so requests do not query SQLite on every model lookup.

### Docker with Environment Variables

You can still pass the GitHub token directly to the container using environment variables:

```sh
# Build with GitHub token
docker build --build-arg GH_TOKEN=your_github_token_here -t copilot-api .

# Run with GitHub token
docker run -p 4141:4141 -e GH_TOKEN=your_github_token_here copilot-api

# Run with additional options
docker run -p 4141:4141 -e GH_TOKEN=your_token copilot-api start --verbose --port 4141
```

> **Tradeoff:**
> `GH_TOKEN` only injects a raw access token. It does not give the server a watched file or refresh metadata, so it is the least resilient option for long-running containers.

### Docker with a Watched Token File

For long-running containers, prefer mounting the token file produced by `copilot-api auth` and passing it through `GH_TOKEN_FILE`:

```sh
mkdir -p ~/.local/share/copilot-api

# Run auth once on the host. This writes a structured token file with refresh metadata.
npx copilot-api@latest auth

docker run \
  -p 4141:4141 \
  -v ~/.local/share/copilot-api/github_token:/run/secrets/gh_token:ro \
  -e GH_TOKEN_FILE=/run/secrets/gh_token \
  copilot-api
```

This mode gives you:

- automatic GitHub access-token refresh when a refresh token is available
- runtime reload if the mounted file changes
- no container restart required after re-running `copilot-api auth` on the host
- automatic Copilot token refresh after a GitHub token update

### Docker Compose Example

```yaml
version: "3.8"
services:
  copilot-api:
    build: .
    ports:
      - "4141:4141"
    volumes:
      - /path/to/github_token:/run/secrets/gh_token:ro
    environment:
      - GH_TOKEN_FILE=/run/secrets/gh_token
    restart: unless-stopped
```

The Docker image includes:

- Multi-stage build for optimized image size
- Non-root user for enhanced security
- Health check for container monitoring
- Pinned base image version for reproducible builds

## Dashboard

Open `http://localhost:4141/dashboard` after starting the server.

The dashboard is currently localized in Chinese and includes:

- 实时 usage / quota 概览
- 来自 SQLite 的请求量、模型分布和最近请求
- 请求日志页面，便于排查错误、模型命中和延迟
- 模型别名管理，直接写入 `model_aliases`

If you want to change model aliases outside the UI, update the SQLite database directly instead of using `model-aliases.json`.

### Dashboard Architecture

The dashboard has two components: a **frontend SPA** (built to `dist/dashboard/`) served directly by the proxy, and a **backend API** mounted at `/api/dashboard`.

```
Browser
  │
  ├── GET /dashboard           ← static HTML shell (src/routes/dashboard/assets.ts)
  ├── GET /dashboard/assets/*  ← JS/CSS bundles
  │
  └── API calls to /api/dashboard/*
        │
        ▼
  createDashboardRoute()  (src/routes/dashboard/route.ts)
        │
        ├── GET /overview          ← request totals, error rate, latency, token sums
        ├── GET /usage             ← live Copilot quota (proxied from GitHub API)
        ├── GET /models            ← model breakdown + OpenRouter cost estimate
        ├── GET /time-series       ← bucketed trend data (configurable bucket size)
        ├── GET /requests          ← paginated request log (server-side filtering)
        ├── GET /requests/count    ← total count for pagination
        ├── GET /supported-models  ← Copilot model list (from state.models cache)
        ├── GET /aliases           ← list aliases + in-memory cache snapshot
        ├── POST/PUT/DELETE /aliases/:id  ← CRUD, triggers in-memory reload
        └── GET/POST /settings     ← dashboard_meta + sink config
```

### Request Log Data Flow

Every API request (both `/v1/messages` and `/v1/chat/completions`) is logged asynchronously through a multi-stage pipeline:

```
Request handler (messages/handler.ts or chat-completions/handler.ts)
        │
        │ enqueueRequestLog()
        ▼
Request Sink  (src/db/request-sink.ts)
  In-memory queue (max 10,000 records, oldest dropped on overflow)
        │
        │ flush every 500ms in batches of 100
        ▼
writeBatch()  (src/db/runtime.ts)
        │
        ├── for each record with no pricing yet:
        │     OpenRouter Pricing Service
        │       └── daily SQLite snapshot (openrouter_pricing_cache)
        │             └── if stale: fetch https://openrouter.ai/api/v1/models
        │     → enrich record with estimated USD cost
        │
        ▼
requestLogRepository.insertBatch()
        │
        ▼
SQLite: request_logs table
        │
        └── on startup and every 6h: prune records older than retention cutoff
            (default 15 days, configurable via dashboard Settings or env var)
```

Sink config (flush interval, batch size, queue size, retry) can be adjusted live from the dashboard Settings tab and is persisted to `dashboard_meta`.

### Model Alias Write Path

Alias changes made in the dashboard take effect immediately without restart:

```
Dashboard UI  POST/PUT/DELETE /api/dashboard/aliases/:id
        │
        ▼
modelAliasRepository  (SQLite model_aliases table)
        │
        ▼
modelAliasStore.reload()  (rebuilds in-memory Map)
        │
        ▼
resolveModelName()  uses the updated Map on the next request
```

`model_aliases` uses `(source_model, enabled)` as its composite primary key while keeping `id` as the stable row identifier for dashboard edit/delete operations. Duplicate writes return a `409 model_alias_conflict` response with the conflicting request model and status instead of a generic internal error.

## Using with npx

You can run the project directly using npx:

```sh
npx copilot-api@latest start
```

With options:

```sh
npx copilot-api@latest start --port 8080
```

For authentication only:

```sh
npx copilot-api@latest auth
```

## Command Structure

Copilot API now uses a subcommand structure with these main commands:

- `start`: Start the Copilot API server. This command loads a watched token file, the persisted token store, or runs authentication if needed.
- `auth`: Run GitHub authentication flow without starting the server. This writes the managed token file used for automatic refresh and for `--github-token-file` / `GH_TOKEN_FILE` workflows.
- `check-usage`: Show your current GitHub Copilot usage and quota information directly in the terminal (no server required).
- `debug`: Display diagnostic information including version, runtime details, file paths, and authentication status. Useful for troubleshooting and support.

## Command Line Options

### Start Command Options

The following command line options are available for the `start` command:

| Option         | Description                                                                   | Default    | Alias |
| -------------- | ----------------------------------------------------------------------------- | ---------- | ----- |
| --port         | Port to listen on                                                             | 4141       | -p    |
| --verbose      | Enable verbose logging                                                        | false      | -v    |
| --account-type | Account type to use (individual, business, enterprise)                        | individual | -a    |
| --manual       | Enable manual request approval                                                | false      | none  |
| --rate-limit   | Rate limit in seconds between requests                                        | none       | -r    |
| --wait         | Wait instead of error when rate limit is hit                                  | false      | -w    |
| --github-token | Provide GitHub token directly (must be generated using the `auth` subcommand) | none       | -g    |
| --github-token-file | Read GitHub token metadata from a file and watch for runtime updates     | none       | none  |
| --claude-code  | Generate a command to launch Claude Code with Copilot API config              | false      | -c    |
| --show-token   | Show GitHub and Copilot tokens on fetch and refresh                           | false      | none  |
| --proxy-env    | Initialize proxy from environment variables                                   | false      | none  |

### Auth Command Options

| Option       | Description               | Default | Alias |
| ------------ | ------------------------- | ------- | ----- |
| --verbose    | Enable verbose logging    | false   | -v    |
| --show-token | Show GitHub token on auth | false   | none  |

### Debug Command Options

| Option | Description               | Default | Alias |
| ------ | ------------------------- | ------- | ----- |
| --json | Output debug info as JSON | false   | none  |

## API Endpoints

The server exposes several endpoints to interact with the Copilot API. It provides OpenAI-compatible endpoints and now also includes support for Anthropic-compatible endpoints, allowing for greater flexibility with different tools and services.

### OpenAI Compatible Endpoints

These endpoints mimic the OpenAI API structure.

| Endpoint                    | Method | Description                                               |
| --------------------------- | ------ | --------------------------------------------------------- |
| `POST /v1/chat/completions` | `POST` | Creates a model response for the given chat conversation. |
| `GET /v1/models`            | `GET`  | Lists the currently available models.                     |
| `POST /v1/embeddings`       | `POST` | Creates an embedding vector representing the input text.  |

### Anthropic Compatible Endpoints

These endpoints are designed to be compatible with the Anthropic Messages API.

| Endpoint                         | Method | Description                                                  |
| -------------------------------- | ------ | ------------------------------------------------------------ |
| `POST /v1/messages`              | `POST` | Creates a model response for a given conversation.           |
| `POST /v1/messages/count_tokens` | `POST` | Calculates the number of tokens for a given set of messages. |

### Usage Monitoring Endpoints

New endpoints for monitoring your Copilot usage and quotas.

| Endpoint     | Method | Description                                                  |
| ------------ | ------ | ------------------------------------------------------------ |
| `GET /usage` | `GET`  | Get detailed Copilot usage statistics and quota information. |
| `GET /token` | `GET`  | Get the current Copilot token being used by the API.         |

## Example Usage

Using with npx:

```sh
# Basic usage with start command
npx copilot-api@latest start

# Run on custom port with verbose logging
npx copilot-api@latest start --port 8080 --verbose

# Use with a business plan GitHub account
npx copilot-api@latest start --account-type business

# Use with an enterprise plan GitHub account
npx copilot-api@latest start --account-type enterprise

# Enable manual approval for each request
npx copilot-api@latest start --manual

# Set rate limit to 30 seconds between requests
npx copilot-api@latest start --rate-limit 30

# Wait instead of error when rate limit is hit
npx copilot-api@latest start --rate-limit 30 --wait

# Provide GitHub token directly
npx copilot-api@latest start --github-token ghp_YOUR_TOKEN_HERE

# Prefer a watched token file for long-running servers
npx copilot-api@latest start --github-token-file ~/.local/share/copilot-api/github_token

# Run only the auth flow
npx copilot-api@latest auth

# Run auth flow with verbose logging
npx copilot-api@latest auth --verbose

# Show your Copilot usage/quota in the terminal (no server needed)
npx copilot-api@latest check-usage

# Display debug information for troubleshooting
npx copilot-api@latest debug

# Display debug information in JSON format
npx copilot-api@latest debug --json

# Initialize proxy from environment variables (HTTP_PROXY, HTTPS_PROXY, etc.)
npx copilot-api@latest start --proxy-env
```

## Using the Dashboard

After starting the server, open the built-in dashboard at:

```text
http://localhost:4141/dashboard
```

The dashboard is now served directly by the proxy and reads real data from:

- SQLite request logs for request counts, model distribution, recent requests, and token totals
- the live `GET /api/dashboard/usage` endpoint for Copilot quota data
- OpenRouter 官方模型价格目录的自然日 SQLite 快照，用于估算同等请求走 OpenRouter 的费用

Current dashboard tabs:

- **Overview**: real request totals, success/error rates, latency, token totals, Copilot quota cards, model distribution, and request trend chart (day/week/month/year granularity)
- **Overview**: real request totals, success/error rates, latency, token totals, OpenRouter cost estimate, Copilot quota cards, model distribution, and request trend chart (default hourly / 24h window)
- **Logs**: server-side paginated request logs with model/route/status/time filtering
- **Model Aliases**: create, edit, delete, and enable or disable request-path aliases that are persisted in SQLite and reloaded into the in-memory cache
- **Model Aliases**: create, edit, delete, and enable or disable request-path aliases that are persisted in SQLite and reloaded into the in-memory cache; the dashboard also shows the current Copilot-supported model list for easier configuration
- **Settings**: log retention policy and async queue configuration

The dashboard data is persisted in the same application data directory used for token state:

- default SQLite path: `~/.local/share/copilot-api/copilot-api.db`
- override path with `COPILOT_API_DB_PATH`
- request logs are written asynchronously through an in-memory sink
- request logs are retained for the most recent 15 days by default
- override retention with `COPILOT_API_REQUEST_LOG_RETENTION_DAYS`
- override background cleanup cadence with `COPILOT_API_REQUEST_LOG_CLEANUP_INTERVAL_MS`

For frontend development:

```sh
bun run dev:dashboard
```

For production assets:

```sh
bun run build
```

This builds the server bundle and the dashboard assets into `dist/dashboard`, which are then served by the `/dashboard` routes.

## Using with Claude Code

This proxy can be used to power [Claude Code](https://docs.anthropic.com/en/claude-code), an experimental conversational AI assistant for developers from Anthropic.

There are two ways to configure Claude Code to use this proxy:

### Interactive Setup with `--claude-code` flag

To get started, run the `start` command with the `--claude-code` flag:

```sh
npx copilot-api@latest start --claude-code
```

You will be prompted to select a primary model and a "small, fast" model for background tasks. After selecting the models, a command will be copied to your clipboard. This command sets the necessary environment variables for Claude Code to use the proxy.

Paste and run this command in a new terminal to launch Claude Code.

### Manual Configuration with `settings.json`

Alternatively, you can configure Claude Code by creating a `.claude/settings.json` file in your project's root directory. This file should contain the environment variables needed by Claude Code. This way you don't need to run the interactive setup every time.

Here is an example `.claude/settings.json` file:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4141",
    "ANTHROPIC_AUTH_TOKEN": "dummy",
    "ANTHROPIC_MODEL": "gpt-4.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "gpt-4.1",
    "ANTHROPIC_SMALL_FAST_MODEL": "gpt-4.1",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "gpt-4.1",
    "DISABLE_NON_ESSENTIAL_MODEL_CALLS": "1",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "permissions": {
    "deny": [
      "WebSearch"
    ]
  }
}
```

You can find more options here: [Claude Code settings](https://docs.anthropic.com/en/docs/claude-code/settings#environment-variables)

You can also read more about IDE integration here: [Add Claude Code to your IDE](https://docs.anthropic.com/en/docs/claude-code/ide-integrations)

## Running from Source

The project can be run from source in several ways:

### Development Mode

```sh
bun run dev
```

### Production Mode

```sh
bun run start
```

## Usage Tips

- To avoid hitting GitHub Copilot's rate limits, you can use the following flags:
  - `--manual`: Enables manual approval for each request, giving you full control over when requests are sent.
  - `--rate-limit <seconds>`: Enforces a minimum time interval between requests. For example, `copilot-api start --rate-limit 30` will ensure there's at least a 30-second gap between requests.
  - `--wait`: Use this with `--rate-limit`. It makes the server wait for the cooldown period to end instead of rejecting the request with an error. This is useful for clients that don't automatically retry on rate limit errors.
- If you have a GitHub business or enterprise plan account with Copilot, use the `--account-type` flag (e.g., `--account-type business`). See the [official documentation](https://docs.github.com/en/enterprise-cloud@latest/copilot/managing-copilot/managing-github-copilot-in-your-organization/managing-access-to-github-copilot-in-your-organization/managing-github-copilot-access-to-your-organizations-network#configuring-copilot-subscription-based-network-routing-for-your-enterprise-or-organization) for more details.

## Review Documents

| Date | Scope | Document |
|------|-------|----------|
| 2026-04-09 | Dashboard: trend granularity + cleanup | [20260409-dashboard-trend-granularity-and-cleanup](review/20260409-dashboard-trend-granularity-and-cleanup.md) |
| 2026-04-09 | Dashboard: hourly trend default + OpenRouter cost estimate | [20260409-dashboard-openrouter-cost-estimate](review/20260409-dashboard-openrouter-cost-estimate.md) |
| 2026-04-09 | OpenRouter pricing: daily SQLite cache | [20260409-openrouter-daily-sqlite-cache](review/20260409-openrouter-daily-sqlite-cache.md) |
| 2026-04-09 | Dashboard: supported models list in alias page | [20260409-dashboard-supported-models-list](review/20260409-dashboard-supported-models-list.md) |
