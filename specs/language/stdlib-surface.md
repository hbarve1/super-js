# Standard Library Surface

**Status:** v1.0 stable surface  
**Source:** `superjs/libs/stdlib/src/modules/*.sjs` → `@superjs/std-*` packages  
**Errors:** stdlib uses `Result<T,E>`; callers should handle `Err` arms (`SJS-L016` warns on unhandled `Result`)

---

## Overview

The v1.0 standard library is authored in SuperJS and compiled to JavaScript.
Each module maps to a published `@superjs/std-*` package. Signatures below are
the stable v1.0 contract; breaking changes require an RFC and major version bump.

## Modules

### `std-core`

Sum-type helpers for `Option<T>` and `Result<T,E>`:

- `some`, `none`, `isSome`, `unwrapOr`, `mapOption`
- `ok`, `err`, `isOk`, `isErr`, `resultOr`, `mapResult`

### `std-math`

Constants `PI`, `E` and functions: `abs`, `sign`, `min`, `max`, `clamp`, `lerp`,
`floor`, `ceil`, `round`, `sqrt`, `pow`.

### `std-string`

`trim`, `lower`, `upper`, `split`, `join`, `includes`, `startsWith`, `endsWith`,
`replace` — pure string utilities (no I/O).

### `std-async`

`sleep(ms)`, `delayValue(ms, value)` — Promise-based delays.

### `std-path`

`basename`, `dirname`, `extname`, `join`, `isAbsolute` — POSIX-style paths.

### `std-collections`

Generic `List<T>` with `listOf`, `push`, `get`, `length`.

### `std-process`

`args`, `env`, `cwd`, `platform`, `exit` — thin `process` wrappers (Node hosts).

### `std-time`

`SECOND`, `MINUTE`, `HOUR`, `DAY`, `nowMs`, `toISO`, `seconds`, `minutes`.

### `std-json`

`parse(text): Result<dynamic, string>`, `stringify`, `stringifyPretty` — JSON
without thrown exceptions on parse failure.

### `std-schema`

Reified validators: `string`, `number`, `boolean`, `array`, `literal`, `optional`,
`nullable`, `object`, `refine` — composable `Schema<T>` values.

### `std-fs`

`readText`, `writeText`, `exists` — Result-returning filesystem helpers (Node).

## Error shape

I/O and parse functions return `Result<T, string>` rather than throwing. This
aligns with RFC-0004 (errors as values). Hosts without filesystem support should
not import `std-fs`.

## Performance guarantees

Stdlib functions are O(n) in input size unless documented otherwise. No function
performs unbounded allocation beyond its output.

## Extension policy

New modules may be added in minor releases. Existing exported signatures are
frozen for the lifetime of SuperJS 1.x.
