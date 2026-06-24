---
title: LSP Memory Audit
sidebar_position: 2
description: Heap audit for the SuperJS language server at ~100k LOC — retention model, LRU eviction, and close semantics.
section: perf
---

# LSP Memory Audit

Stage 6 / v1.0 RC readiness review of LSP heap behaviour. Complements the
latency + idle-heap benchmarks in [Performance Benchmarks](./index.md).

**Audit date:** 2026-06-24  
**Harness:** [`scripts/audit-lsp-memory.mjs`](../../scripts/audit-lsp-memory.mjs)  
**Committed report:** [`benchmarks/lsp-memory-audit.json`](../../benchmarks/lsp-memory-audit.json)

Reproduce:

```bash
cd superjs && pnpm nx build lsp
cd .. && node --expose-gc scripts/audit-lsp-memory.mjs
# optional heap snapshot for Chrome DevTools:
node --expose-gc scripts/audit-lsp-memory.mjs --snapshot
```

## Summary

| Check | Result | Target |
|-------|--------|--------|
| Idle heap (~100k LOC corpus, single file) | **195.8 MB** | ≤ 250 MB |
| `didClose` releases analysis state | **186.8 MB** freed (ratio 1.0) | ≥ 35% release |
| LRU evicts oldest file under 2 MiB budget | oldest file empty on query | — |
| Multi-file plateau (5 × ~20k LOC) | **45 MB** growth | ≤ 120 MB |

**Verdict:** No unbounded retention found. Per-file state is released on close and
LRU eviction; dominant cost is the in-memory AST + type environment for the active
file(s).

## What is retained per open document

1. **Source text** — `LspServer.sources` and `Compiler.rawSources` share the same
   string reference from `textDocument/didOpen` (not triple-allocated).
2. **`FileState`** (compiler) — parsed AST, diagnostics, typed spans, lowered IR
   snapshot, and module export surface. This is the bulk of heap usage (~190 MB for
   ~140k LOC synthetic corpus vs ~5.3 MB source text).
3. **Touch metadata** — URI → LRU tick map (negligible).

Eviction path (`enforceBudget` or `didClose`) calls `compiler.removeFile`, which
drops `files` and `rawSources` entries for that URI.

## Known limitations (post-1.0)

| Item | Status |
|------|--------|
| `lsp.memoryBudgetMB` estimates bytes from source length only | Does not account for AST/type overhead; a single huge file can exceed true heap budget while under byte estimate |
| No `SJS-W010` client diagnostic on heap pressure | Spec'd; not yet emitted (README notes as later work) |
| JSON-RPC 8 MiB message cap | Planned (threat model T3) |
| Per-phase memory breakdown | Not instrumented in compiler pipeline |

## Relation to CI

- **Bench gate:** `scripts/check-bench-results.mjs` enforces idle heap + P99 hover from `benchmarks/results.json`.
- **Audit gate:** `scripts/check-lsp-memory-audit.mjs` enforces close + LRU checks from `benchmarks/lsp-memory-audit.json`.

_Last updated: 2026-06-24._
