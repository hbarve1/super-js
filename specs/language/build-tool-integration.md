# Build Tool Integration

**Status:** v1.0  
**Implementation:** `@superjs/build-plugins` → `@superjs/vite-plugin`, `@superjs/esbuild-plugin`, `@superjs/jest-transform`, `@superjs/vitest-transform`  
**Grammar:** N/A (build pipeline)  
**Errors:** compile diagnostics from `@superjs/compiler` surface in the host tool's error overlay

---

## Overview

All build integrations are thin adapters over `transform(source, filename, opts)`
from `@superjs/compiler`. Host tools are not hard dependencies — each plugin
returns a structurally typed object matching the host's plugin interface.

## Shared transform

```typescript
transformSjs(code, id) → { code: string, map: SourceMap | undefined }
```

Default options: `{ sourceMap: 'external' }`. Emitted JavaScript is valid ES
module or script per the input file's module goal.

## Vite / Vitest

`vitePlugin()` registers as `enforce: 'pre'`, matching `/\.sjs$/` and returning
transform output. Vitest reuses the same plugin (`vitestPlugin === vitePlugin`).

**HMR:** file change triggers Vite's module graph invalidation; the plugin
re-compiles the `.sjs` module. Source maps chain to original `.sjs` spans.

## esbuild

`esbuildPlugin()` uses `onLoad` for `/\.sjs$/`, reads the file, compiles, and
returns `{ contents, loader: 'js' }`.

## Jest

`jestTransform` implements `processAsync(source, filename)` for `.sjs` test
files. Returns `{ code, map }` for Jest's coverage and stack-trace mapping.

## Source maps

See `054-source-maps.md`. External source maps are emitted by default so hosts
can compose map chains (`inputSourceMap` in Vite, `sourcemap: true` in esbuild).

## Configuration

Project-level options come from `superjs.config.json` (see `009-tooling-surface.md`
CLI section). Plugins read merged config via `@superjs/config` when invoked from
the CLI; programmatic API callers pass `TransformOpts` directly.

## Unsupported hosts

Webpack, Rollup (without esbuild), and Bun have no first-party v1.0 plugin.
Use `transform()` in a custom loader or the esbuild plugin inside `@rollup/plugin-esbuild`.
