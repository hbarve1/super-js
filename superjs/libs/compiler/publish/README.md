# @superjsorg/compiler

The [Super.js](https://superjs.org) compiler — a null-safe, sum-typed superset
of JavaScript that compiles to plain JS with zero runtime overhead.

This package is a self-contained bundle of the compiler's public API. It has no
runtime dependencies.

## Install

```bash
npm install @superjsorg/compiler
```

## Usage

```js
import { transform } from '@superjsorg/compiler'

const result = await transform(
  `const name: string? = null
   console.log(name ?? "world")`,
  'app.sjs',
  {},
)

console.log(result.code)        // compiled JavaScript
console.log(result.diagnostics) // type errors / warnings, if any
```

### API

- `transform(source, filename, opts)` → `{ code, map, diagnostics }` — compile one file.
- `compile(files, opts)` — compile a set of files.
- `parseTypeDecl` / `emitTypeDecl` — `.d.ts`-style type declaration round-trip.
- `typeAt` / `symbolAt` / `diagnosticsFor` + `openFile` / `configureSession` — editor/LSP queries.
- `COMPILER_VERSION`, `cacheKey`, and hashing helpers.

Full type definitions ship with the package.

## Links

- Website & playground: <https://superjs.org>
- Documentation: <https://superjs.org/docs/intro>
- Error code reference: <https://superjs.org/errors>
- Source: <https://github.com/hbarve1/super-js>

## License

GPL-3.0-or-later
