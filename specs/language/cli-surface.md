# CLI Surface

**Status:** v1.0  
**Implementation:** `superjs/apps/cli` (`@superjs/cli`)  
**Grammar:** N/A  
**Errors:** non-zero exit when diagnostics contain errors; see `specs/error-codes.md`

---

## Overview

The `superjs` CLI is the primary batch interface for check, build, format, lint,
documentation generation, and project scaffolding.

## Commands

| Command | Purpose |
|---------|---------|
| `superjs check [paths…]` | Type-check `.sjs` files; exit 1 on errors |
| `superjs build` | Emit JavaScript per `superjs.config.json` |
| `superjs watch` | Watch mode for `check` / `build` |
| `superjs format [paths…]` | Format sources (idempotent) |
| `superjs lint [paths…]` | Run lint rules (`SJS-L*`); `--fix` for auto-fixes |
| `superjs verify` | Validate config + diagnostic fixtures |
| `superjs docgen` | Generate API docs from `doc()` comments |
| `superjs lsp` | Start language server (stdio) |
| `superjs init <template>` | Scaffold project (`workers-api`, `lambda-handler`, …) |
| `superjs migrate from-prototype` | Rewrite prototype syntax to v1.0 SJS |

## Configuration

`superjs.config.json` schema: `specs/config-schema.json`. Key fields:

- `strict` — warnings as errors
- `sourceMap` — `none` | `inline` | `external`
- `paths` — module path mapping
- `lint` — per-rule severity overrides

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Compile / check errors |
| 2 | Invalid arguments or config |

## Relationship to tooling spec

LSP, linter, and formatter semantics are normatively defined in
`009-tooling-surface.md` (Chapter 8). This file covers only the CLI command
surface and configuration contract.
