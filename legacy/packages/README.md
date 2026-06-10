# packages/

npm packages published under the `@superjs/` scope.

| Package | Stage | Purpose |
|---------|-------|---------|
| `stdlib/` | Stage 4 | `@superjs/stdlib` — typed Result, Option, Iterator, collections written in SJS |

All packages are built with `npm run build` from the repo root. Each package has its own `package.json` and `tsconfig.json`.

Packages are not published to npm until Stage 4. During development, use `npm link` or workspace references.
