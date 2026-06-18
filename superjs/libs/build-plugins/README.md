# @superjs/build-plugins

Build-tool integrations for `.sjs`, all thin adapters over the compiler's
`transform()`. This single lib maps to the separately-published packages:

| Export | Published package | Host |
|--------|-------------------|------|
| `vitePlugin()` | `@superjs/vite-plugin` | Vite |
| `vitestPlugin()` | `@superjs/vitest-transform` | Vitest (Vite-based) |
| `esbuildPlugin()` | `@superjs/esbuild-plugin` | esbuild |
| `jestTransform` | `@superjs/jest-transform` | Jest (`processAsync`) |

The host tools are not imported — each factory returns an object structurally
typed to the host's plugin interface, so the only dependency is
`@superjs/compiler`.
