#!/bin/sh

# Build optional flags
EXTRA_FLAGS=""
if [ "${VERBOSE:-false}" = "true" ] || [ "${VERBOSE:-false}" = "1" ]; then
  EXTRA_FLAGS="$EXTRA_FLAGS --verbose"
fi

if [ "$1" = "--auth" ]; then
  # Run auth command
  exec bun run dist/main.js auth
elif [ -n "$GH_TOKEN_FILE" ]; then
  # Read token metadata directly from the mounted file and keep watching it at runtime.
  # shellcheck disable=SC2086
  exec bun run dist/main.js start --github-token-file "$GH_TOKEN_FILE" $EXTRA_FLAGS "$@"
else
  # Default command
  # shellcheck disable=SC2086
  exec bun run dist/main.js start -g "$GH_TOKEN" $EXTRA_FLAGS "$@"
fi
