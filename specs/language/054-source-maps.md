# 054 — Source Map Fidelity

**Status:** Stage 1
**Grammar:** `specs/grammar.ebnf` (not applicable — output format specification)

---

## Overview

Every `.sjs` → `.js` compilation must produce a source map that maps each generated JS token back to its originating position in the `.sjs` source. Diagnostics, stack traces, and debugger step-through always display `.sjs` positions — generated `.js` positions are never surfaced to the user.

---

## Source Map Format

| Property | Value |
|---|---|
| Spec version | Source Map v3 (https://sourcemaps.info/spec.html) |
| File location | External file `<output>.js.map` (never inline `data:` URL) |
| Footer in output JS | `//# sourceMappingURL=<output>.js.map` (last line of file) |
| `version` field | `3` |
| `file` field | Output JS filename (basename only) |
| `sources` field | Array of `.sjs` source paths, relative to the project root |
| `sourcesContent` field | Omitted — avoids duplicating source in the map; IDE fetches source on demand |
| `names` field | Optional; included when identifier renaming occurs (e.g., scope-collision rename during `let`→`var` transform) |
| `mappings` field | VLQ-encoded segment map; every generated token must have a mapping segment |

The compiler must not embed absolute host paths in `sources`. Paths are relative to the project root (directory containing `superjs.config.json`).

---

## Position Mapping Rules

| SJS construct | Source map behavior |
|---|---|
| `: T` type annotation | Annotation erased — no mapping segment generated for the annotation site |
| `T?` nullable annotation | Annotation removed — no mapping segment |
| `Ok(42)` → `{ _tag: "Ok", _0: 42 }` | Generated object literal spans map back to the `Ok(42)` call-expression start in `.sjs` |
| `match` expression braces | Opening `{` of IIFE maps to the `match` keyword position in `.sjs` |
| `match` arm body | Each arm body expression / block maps to the corresponding arm expression start in `.sjs` |
| `import type { … }` | Erased — no mapping segment |
| `interface` / `type` declaration | Erased — no mapping segment |
| Inline JSX `<Foo />` | Maps to the JSX element opening tag position (`<`) in `.sjs` |
| Arrow function `=>` | Generated `=>` maps to SJS `=>` position |
| Constructor parameter property `constructor(public x: T)` | Generated `this.x = x` maps to the parameter position `x` in `.sjs` |
| `for (const x: T of arr)` → `for (const x of arr)` | Loop token maps to `for` keyword in `.sjs` |
| ES5 class → prototype chain | Each method definition maps to the corresponding SJS method position |

The rule for erased constructs is: if no JS token is emitted, no source map segment is emitted. Segments must never point to positions that have been erased.

---

## Determinism Requirement

Two compilations of identical `.sjs` source with identical config and flags must produce:

1. Byte-for-byte identical JS output.
2. Byte-for-byte identical source map.

Non-determinism sources that must be eliminated:

| Source | Fix |
|---|---|
| `.tsbuildinfo` files containing absolute host paths | Must be `.gitignore`d; never committed |
| Non-deterministic object property enumeration order | Use sorted key iteration throughout the compiler |
| Timestamps or process IDs embedded in output | Forbidden in any output file |
| File system directory enumeration order | Sort input file lists before processing |
| Hash-map iteration order for module graphs | Use sorted adjacency lists |

CI enforcement: `scripts/check-determinism.mjs` compiles each `.sjs` file twice in separate processes, then diffs the outputs. Any difference causes a CI failure. This script runs in the `verify` stage of the pipeline before the `test` stage.

---

## Error Position Format

All SJS diagnostics report positions in the `.sjs` source file, never the generated `.js` file:

```
src/app.sjs:12:5: SJS-E001: null is not assignable to type 'string'
```

Format: `<file>:<line>:<col>: <CODE>: <message>`

| Field | Description |
|---|---|
| `file` | Path to the `.sjs` source, relative to project root |
| `line` | 1-based line number in the `.sjs` file |
| `col` | 1-based column number (byte offset, 1-indexed) in the `.sjs` file |
| `CODE` | Diagnostic code: `SJS-E`, `SJS-W`, `SJS-L`, or `SJS-P` followed by a zero-padded number |
| `message` | Human-readable description of the issue |

When a diagnostic spans multiple lines (e.g., an unclosed block), the position refers to the start of the construct. The compiler may optionally include an end position as `file:line:col-endcol` for single-line spans.

Stack traces from runtime errors (in development builds with source-map support enabled) are remapped to `.sjs` positions via the `source-map` npm package or Node's built-in `--enable-source-maps` flag.

---

## Diagnostics

None. Source map generation is a post-compilation step. Failures during map generation are internal compiler errors (`[SJS internal]` prefix), not user-facing diagnostic codes.
