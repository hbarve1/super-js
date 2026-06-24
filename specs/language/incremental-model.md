# Incremental Compilation Model

**Status:** v1.0  
**Implementation:** `@superjs/compiler` (`superjs/libs/compiler/src/lib/hash.ts`, `Compiler` session)  
**Errors:** cache misses are transparent; stale analysis may emit `SJS-E*` on re-check

---

## Overview

The SuperJS compiler supports incremental reuse of parse, check, and emit results
via content-addressed cache keys. File modification time is **not** used — only
source text, compiler version, and canonicalised config.

## Cache key components

```
cacheKey = SHA-256( fileHash(source) + COMPILER_VERSION + configHash(opts) )
```

| Component | Function | Invalidates when |
|-----------|----------|------------------|
| `fileHash` | SHA-256 of source text | Any character changes |
| `COMPILER_VERSION` | Compiler semver stamp | Compiler upgrade |
| `configHash` | Canonical JSON of compile options | `variants`, `sourceMap`, `jsx`, `strict`, `paths`, … |

## API surface hashes

- **`apiHash`** — SHA-256 of sorted exported signatures. Downstream importers
  re-type-check only when a dependency's public API changes, not private internals.
- **`docHash`** — SHA-256 of documentation comment blocks. Invalidates LSP hover
  and docgen caches without triggering a full re-check.

## Session model

`configureSession`, `openFile`, `closeFile`, `typeAt`, `symbolAt`, and
`diagnosticsFor` operate on a process-wide compiler session (LSP uses one session
per server instance). `transform()` for build plugins uses ephemeral sessions.

## CLI commands

| Command | Incremental behaviour |
|---------|----------------------|
| `superjs check` | Full-project check; may use disk cache when enabled in config |
| `superjs build` | Per-file transform with cache store from `superjs.config.json` |
| `superjs watch` | Re-runs check/build on file change events |
| `superjs verify` | Validates config + fixture diagnostics (no incremental emit) |

## LSP integration

`textDocument/didChange` replaces the full document text and invalidates that
file's cache entry. `lsp.memoryBudgetMB` (default 128) bounds the number of open
documents; LRU eviction drops cold files from the session.

## Invariants

1. Identical `(source, version, config)` must produce bit-identical emit (modulo
   non-deterministic source-map URL fields).
2. Cache entries must not survive `COMPILER_VERSION` bumps.
3. `docHash` changes must not alone invalidate type-check results.
