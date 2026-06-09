# 023 — Modules
**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §Import / Export Declarations

## Syntax

(EBNF from grammar — ImportDecl, ExportDecl, ImportClause, NamedImports, etc.)

## Semantics

ES modules only — `namespace` banned (SJS-E012). Static import/export. Type-only imports/exports erased at compile. Dynamic `import()` returns `Promise<ModuleType>`. `import.meta` contextual object. Circular imports detected at compile → SJS-E017. Module resolution: relative paths (`./`, `../`) from current file; bare specifiers via node_modules or `paths` in superjs.config.json; `.sjs` extension optional (compiler adds if absent). `declare module` for ambient untyped libs.

Import forms:
- Named: `import { a, b as c } from "./mod"`
- Default: `import Foo from "./foo"`
- Namespace: `import * as Mod from "./mod"` — Mod is module namespace object
- Side-effect: `import "./setup"` — no bindings
- Type-only: `import type { T } from "./types"` — erased entirely

Export forms:
- Named: `export { x, y as z }`
- Default: `export default expr` / `export default function f()` / `export default class C`
- Re-export: `export { x } from "./mod"` — re-exports without binding in current scope
- Wildcard re-export: `export * from "./mod"`
- Type-only: `export type { T }`
- Inline: `export const x = ...` / `export function f()` / `export class C`

Dynamic import: `import("./mod")` → `Promise<{ default: T, namedExport: U, ... }>`. Lazy loading for code splitting.

`import.meta`: available in ES modules. Browser: `{ url: string }`. Node.js: `{ url: string, dirname: string, filename: string }`. SJS type: `ImportMeta` (defined in platform-specific .d.sjs).

`declare module` for ambient declarations:
```sjs
declare module "untyped-lib" {
  export function doThing(x: string): number
}
```

## Type rules

Module namespace object type: `import * as Mod from "./mod"` — Mod has type `{ [exportName]: exportType }` — each named export becomes a property. Type of `import()` = `Promise<ModuleNamespace>`.

## JS Lowering (Prototype)

ES module syntax passes through as-is (for ES2015+ targets). `import type` / `export type` → erased (zero output). `declare module` → erased. For CommonJS target (`--module=cjs`): `import x from "m"` → `const x = require("m")`, `export default x` → `module.exports = x`, named exports → `exports.name = value`.

## LLVM Lowering (Future)

Each `.sjs` file = one LLVM module. `export` = external linkage symbol (`define` with default visibility). `import` = `declare` (extern linkage). Link time: LLVM linker resolves cross-module references. Dynamic import = runtime `dlopen`/`dlsym` or bundler-provided chunk loading (TBD).

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| SJS-E012 | `namespace` keyword used |
| SJS-E017 | Circular import cycle detected |
| SJS-W003 | Imported binding never used |

## Examples

### Valid

```sjs
// Named imports and exports
import { add, multiply } from "./math"
import type { Vector2 } from "./types"

export function double(n: number): number { return n * 2 }
export type { Vector2 }

// Default export/import
import React from "react"
export default class App { }

// Namespace import
import * as Utils from "./utils"
const result: string = Utils.format("hello")

// Re-export
export { add } from "./math"
export * from "./helpers"

// Dynamic import
async function loadModule(): Promise<void> {
  const { default: Chart } = await import("./chart")
  Chart.render()
}

// import.meta
console.log(import.meta.url)
```

### Invalid

```sjs
// ✗ SJS-E012: namespace not allowed
namespace Utils {
  export function format(s: string): string { return s.trim() }
}

// ✗ SJS-E017: circular import (if mod-a imports mod-b and mod-b imports mod-a)
import { x } from "./mod-b"   // when mod-b also imports from this file
```
