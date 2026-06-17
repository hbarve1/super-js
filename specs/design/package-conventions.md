# SJS Package Conventions

How a SuperJS package is laid out, declares itself, and is consumed — so the
compiler, `superjs add`, and downstream tools agree on one shape.

## `package.json` fields

A published SJS package ships **compiled JavaScript** plus its SuperJS source and
generated `.d.sjs` declarations.

| Field | Purpose |
|-------|---------|
| `main` / `module` | Compiled JS entry (CJS / ESM), as usual. |
| `types` | Generated `.d.ts` for TypeScript consumers (optional). |
| `sjs` | **SuperJS entry point** — path to the package's `.d.sjs` (or `.sjs`) surface. `superjs add` and the resolver read this first. |
| `exports` | Conditional map; **must** include `"import"` and `"require"` for dual ESM/CJS (R2), plus an `"@org/source"`-style condition pointing at SJS source when shipping source. |
| `sjsConfig` | Optional inline `superjs.config.json` fragment a dependency wants applied when its sources are compiled. |

```jsonc
{
  "name": "@acme/widget",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "sjs": "./dist/index.d.sjs",
  "exports": {
    ".": {
      "sjs": "./dist/index.d.sjs",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    }
  }
}
```

## `superjs.config.json`

The project config the compiler reads from the root. All fields optional.

- `"language": "1.0"` — reserved edition placeholder (C4). Does nothing at v1.0;
  reserving it now prevents a breaking change when editions arrive post-1.0.
- `"extends": "tsconfig.json"` — inherit `paths` from an existing tsconfig (M9),
  so a mixed TS/SJS repo keeps one source of path truth.
- `compilerOptions` — `strict`, `target`, `outDir`, `sourceMap`, `noEmitOnError`.
- `paths` — `tsconfig`-style import mapping; `superjs add` writes bare-specifier
  entries here pointing at translated `.d.sjs`.
- `jsx` — `runtime` (`automatic` | `classic`), `importSource`.
- `output` — `eol` (`lf` | `crlf` | `auto`).

```jsonc
{
  "language": "1.0",
  "extends": "tsconfig.json",
  "compilerOptions": { "strict": true, "target": "ES2022", "outDir": "dist" },
  "paths": {},
  "jsx": { "runtime": "automatic", "importSource": "react" }
}
```

## Type-declaration resolution order

When resolving a bare import (e.g. `import … from "fastify"`), the compiler looks,
in order:

1. A hand-curated `@superjs/types-<pkg>` wrapper (richest types), if installed.
2. `node_modules/@superjs/types/<pkg>/index.d.sjs` (what `superjs add` writes).
3. The package's own `sjs` entry / `exports` `sjs` condition.
4. A `paths` mapping in `superjs.config.json`.

Anything unresolved is reported, never silently treated as `dynamic`.

## Monorepo / workspaces

`workspace:*` protocol packages resolve to their in-repo source. Path mapping and
`extends` inheritance are foundational (compiler resolver); the ecosystem layer
documents edge cases (Yarn-Berry PnP, hoisted vs nested `node_modules`).
