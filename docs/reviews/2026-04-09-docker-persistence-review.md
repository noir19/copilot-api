# Docker Persistence Review

## Scope

This change updates the container deployment defaults so the dashboard SQLite database is persisted together with the managed GitHub token state.

## Changes

### Dockerfile

- Updated [`Dockerfile`](/Users/ken/Desktop/code/ai/copilot-api/Dockerfile).
- Added:
  - `RUN mkdir -p /root/.local/share/copilot-api`
  - `VOLUME ["/root/.local/share/copilot-api"]`

This makes the default application data directory explicit in the image and aligns the container with the runtime defaults used by the server.

### Docker Compose

- Updated [`docker-compose.yml`](/Users/ken/Desktop/code/ai/copilot-api/docker-compose.yml).
- Updated [`docker-compose.example.yml`](/Users/ken/Desktop/code/ai/copilot-api/docker-compose.example.yml).

The compose files now mount the whole application data directory instead of mounting only the token file:

- host: application data directory
- container: `/root/.local/share/copilot-api`

This persists:

- `github_token`
- `copilot-api.db`

The token file path now points to:

- `GH_TOKEN_FILE=/root/.local/share/copilot-api/github_token`

## Verification

### Lint

Passed:

```bash
bun run lint:fix
```

### Build

Passed:

```bash
bun run build
```

## Risks And Follow-up

1. Existing users who previously mounted only a token file need to update their compose volume mapping if they want dashboard history persistence.
2. The image still relies on the default root home path; if the container user changes later, the volume target should be updated with it.
