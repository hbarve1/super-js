---
title: 19 — Tooling tour
sidebar_position: 20
description: CLI commands for day-to-day development.
section: tour
---

# Tooling tour

**Goal:** Know the core `superjs` subcommands.

| Command | Purpose |
|---------|---------|
| `check` | Type-check without emit |
| `build` | Compile to JS |
| `lint` | Style rules SJS-L* |
| `format` | Canonical formatting |
| `doc` / `docgen` | API docs from exports |
| `init` | Scaffold project templates |
| `lsp` | Language server (stdio) |

## Example

```sjs
// Typical loop
// superjs check src/**/*.sjs
// superjs lint src/**/*.sjs
// superjs build src --out-dir dist
```

[Open in playground](https://superjs.org/playground#code=Ly8gVHlwaWNhbCBsb29wCi8vIHN1cGVyanMgY2hlY2sgc3JjLyoqLyouc2pzCi8vIHN1cGVyanMgbGludCBzcmMvKiovKi5zanMKLy8gc3VwZXJqcyBidWlsZCBzcmMgLS1vdXQtZGlyIGRpc3Q)

## Key takeaways

- Run `check` in CI on every PR.
- `format --check` prevents style drift.
- LSP powers editor diagnostics.

**Next:** [Migrating a TS file](./20-migrating-a-ts-file.md)
