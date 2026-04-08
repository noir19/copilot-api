# Biome Migration Review

## Scope

This change replaces the previous ESLint and Prettier-based setup with Biome as the single linting and formatting tool for the repository.

The migration includes:

- package script and pre-commit hook replacement
- removal of the ESLint-specific config and dependencies
- addition of a repository-level `biome.json`
- one-time repository formatting and import organization pass under the new toolchain

## Changes

### Tooling

- Added [`biome.json`](/Users/ken/Desktop/code/ai/copilot-api/biome.json).
- Removed [`eslint.config.js`](/Users/ken/Desktop/code/ai/copilot-api/eslint.config.js).
- Updated [`package.json`](/Users/ken/Desktop/code/ai/copilot-api/package.json):
  - `lint` now runs `biome check .`
  - `lint:fix` now runs `biome check --write .`
  - `format` now runs `biome format --write .`
  - `simple-git-hooks` pre-commit now runs `bun run lint:fix`
  - removed `lint-staged` integration
- Updated [`AGENTS.md`](/Users/ken/Desktop/code/ai/copilot-api/AGENTS.md) to reflect the Biome workflow.

### Dependency Changes

- Added `@biomejs/biome`.
- Removed:
  - `@echristian/eslint-config`
  - `eslint`
  - `lint-staged`
  - `prettier-plugin-packagejson`
- Lockfile updated in [`bun.lock`](/Users/ken/Desktop/code/ai/copilot-api/bun.lock).

### Codebase Rewrite Under New Formatter

- Biome reformatted and reorganized imports across the repository.
- This affected server code, dashboard code, tests, and config files.
- There are no intended behavior changes in these formatting-only rewrites.

### Small Manual Fixes During Migration

- Updated [`dashboard/src/app.tsx`](/Users/ken/Desktop/code/ai/copilot-api/dashboard/src/app.tsx) to satisfy Biome's React hook dependency rule.
- Updated [`src/lib/tokenizer.ts`](/Users/ken/Desktop/code/ai/copilot-api/src/lib/tokenizer.ts) to use a template literal instead of string concatenation.
- Added missing SVG titles in [`pages/index.html`](/Users/ken/Desktop/code/ai/copilot-api/pages/index.html) to satisfy accessibility linting.

## Verification

### Lint

Passed:

```bash
bun run lint
```

### Lint Fix

Passed:

```bash
bun run lint:fix
```

### Typecheck

Passed:

```bash
bun run typecheck
```

### Build

Passed:

```bash
bun run build
```

Build notes:

- `tsdown` still emits the pre-existing `bun:sqlite` unresolved import warning and treats it as external.
- Vite still emits the pre-existing chunk-size warning for the dashboard bundle.

## Risks And Follow-up

1. This migration intentionally changes the repository formatting baseline, so future diffs against older branches may look noisier until they are rebased.
2. Biome does not reproduce every ESLint plugin rule from the previous stack; the repository now relies on Biome's built-in ruleset instead of the old custom ESLint bundle.
3. If you want tighter lint parity later, the next step would be to add targeted Biome rule overrides rather than reintroducing ESLint.
