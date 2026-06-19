# WS-A7: Node 24 blocking CI matrix

**Branch:** `feature/v1.0-node24`  
**Effort:** small  
**Deps:** none — start immediately  
**PR base:** `main`

## Objective

Promote Node 24 from the nightly non-blocking CI job to the blocking matrix,
alongside Node 20 LTS and Node 22 LTS. Any Node 24 failure blocks GA.

## Context

- CI config: `.github/workflows/ci.yml`
- Current matrix: check what node versions are in the `strategy.matrix` for the main CI job
- Node 24 is the current Active LTS release (April 2026 release cycle)

## What to change

### 1. Find current CI matrix

Read `.github/workflows/ci.yml`. Look for:
```yaml
strategy:
  matrix:
    node-version: [20, 22]
```
or similar. May also have a separate `nightly` job for Node 24.

### 2. Add Node 24 to blocking matrix

Change:
```yaml
strategy:
  matrix:
    node-version: [20, 22]
```
to:
```yaml
strategy:
  matrix:
    node-version: [20, 22, 24]
```

### 3. Remove or disable the nightly non-blocking job for Node 24

If there's a separate `nightly` workflow that tests Node 24 as non-blocking, either:
- Remove the Node 24 entry from nightly (since it's now in main CI)
- Or keep it as a canary for Node 26/next-lts

### 4. Verify

Run the CI matrix locally (or push to a test branch):
```bash
# Simulate: run tests with Node 24 active
nvm use 24  # or node version manager equivalent
cd superjs && pnpm test
```

## Implementation steps

1. Read `.github/workflows/ci.yml`.
2. Find the `node-version` matrix.
3. Add `24` to the matrix array.
4. Find any nightly/non-blocking Node 24 job and update it.
5. Push to branch `feature/v1.0-node24` and open PR.
6. Verify CI runs on all 3 Node versions.

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` matrix includes `[20, 22, 24]`
- [ ] CI runs on all 3 Node versions on every PR push
- [ ] No separate non-blocking Node 24 nightly job remains (or it's been updated to Node 26 canary)
- [ ] CI green on Node 24 (no Node 24-specific failures)
- [ ] PR description notes: "Node 24 promoted per C7 / v1.0 requirement"

## Notes

- If there are Node 24 compatibility failures, fix them before merging this PR — they must be fixed before GA per the Stage 6 exit criteria
- Node 24 uses V8 12.x; likely no breaking changes for a Node.js-targeting compiler, but verify
- If pnpm or Vitest has Node 24 issues, pin versions or update in the same PR
