#!/bin/sh

# GH_TOKEN_FILE takes priority over GH_TOKEN
if [ -n "$GH_TOKEN_FILE" ]; then
  GH_TOKEN=$(cat "$GH_TOKEN_FILE")
fi

# Build optional flags
EXTRA_FLAGS=""
if [ "${VERBOSE:-false}" = "true" ] || [ "${VERBOSE:-false}" = "1" ]; then
  EXTRA_FLAGS="$EXTRA_FLAGS --verbose"
fi

if [ "$1" = "--auth" ]; then
  # Run auth command
  exec bun run dist/main.js auth
else
  # Default command
  # shellcheck disable=SC2086
  exec bun run dist/main.js start -g "$GH_TOKEN" $EXTRA_FLAGS "$@"
fi

