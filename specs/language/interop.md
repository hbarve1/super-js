# Interop with TypeScript

**Status:** v1.0  
**Implementation:** `@superjs/interop`, `@superjs/types-*` wrappers (WS-B3)  
**Errors:** `SJS-W001`–`SJS-W002` on `dynamic` boundaries; `SJS-E002` on unsafe assignments

---

## Overview

SuperJS interoperates with existing TypeScript and JavaScript ecosystems via:

1. **`.d.ts` → `.d.sjs` translation** (`translateDts` in `@superjs/interop`)
2. **Hand-curated `@superjs/types-*` packages** for popular npm libraries
3. **`dynamic` at FFI boundaries** with narrowing before typed use

## `dynamic` escape hatch

Values from untyped JS use the `dynamic` type (`004-dynamic.md`). Assigning
`dynamic` to a concrete type without narrowing emits `SJS-W002` (error in
`--strict`).

## Markers

| Marker | Effect |
|--------|--------|
| `// @sjs:dynamic` | Next line/binding treated as intentionally `dynamic` |
| `// @sjs:dynamic-ok` | Suppresses `SJS-L013` (no-explicit-dynamic) for annotated positions |

## `.d.ts` translation

`translateDts(path)` parses TypeScript declaration files with the TypeScript
compiler API and emits SuperJS type declarations via `emitTypeDecl`. Banned TS
constructs (`enum`, mapped types, `any`) are rejected or mapped to SJS equivalents
(`any` → `dynamic`, `enum` → sum type sketch).

## Wrapper resolution order

When importing an npm package:

1. If `@superjs/types-<pkg>` exists, use its `.sjs` declarations.
2. Else if a project-local `.d.sjs` exists, use it.
3. Else fall back to `dynamic` for the module namespace (`SJS-W001` in strict mode).

## `fromJS` / `toJS` (runtime)

Runtime boundary helpers live in `@superjs/runtime` (Tier 4). They perform
shallow structural checks before crossing the `dynamic` ↔ typed boundary.
Incorrect shapes throw at runtime — prefer `std-schema` validators for untrusted input.

## Migration tooling

`superjs migrate from-prototype` rewrites prototype syntax to v1.0 SJS (see
`docs/migration/`). Interop wrappers are not modified by the migrator.
