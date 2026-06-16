/**
 * Build the self-contained, publishable bundle of @superjsorg/cli.
 *
 * Produces apps/cli/publish/{main.js,LICENSE} alongside the committed
 * package.json + README.md. The bundle inlines the compiler + every internal
 * @superjs/* dependency, so the published CLI has zero runtime dependencies.
 *
 * Usage (from superjs/):
 *   node scripts/build-cli-publish.mjs
 *   cd apps/cli/publish && npm publish --access public
 */
import { execSync } from 'node:child_process'
import { chmodSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' })

// 1. Build the CLI + its dependency graph.
run('pnpm nx build @superjs/cli')

// 2. Bundle the binary to a single self-contained ESM file (shebang preserved).
//    The `translate` command pulls in the TypeScript compiler — a CommonJS module
//    that at init calls `require('fs')` and reads `__filename`/`__dirname`, none
//    of which exist in an ESM bundle. Inject the standard CJS shims: esbuild's
//    `__require` shim picks up a real `require` when one is in scope, and TS's
//    filesystem probing needs the dirname globals. Without these, TS init throws
//    "Dynamic require of 'fs'…" / "__filename is not defined".
const requireBanner = [
  "import{createRequire as __cr}from'node:module';",
  "import{fileURLToPath as __furl}from'node:url';",
  "import{dirname as __dir}from'node:path';",
  'const require=__cr(import.meta.url);',
  'const __filename=__furl(import.meta.url);',
  'const __dirname=__dir(__filename);',
].join('')
run(
  'node_modules/.bin/esbuild apps/cli/src/main.ts' +
    ' --bundle --platform=node --format=esm --target=node18' +
    ` --banner:js=${JSON.stringify(requireBanner)}` +
    ' --outfile=apps/cli/publish/main.js',
)

// 3. Make the bin executable + ship the license.
chmodSync(resolve(root, 'apps/cli/publish/main.js'), 0o755)
copyFileSync(resolve(root, '../LICENSE'), resolve(root, 'apps/cli/publish/LICENSE'))

console.log('\n✓ CLI bundle ready in apps/cli/publish/. Publish with:')
console.log('  cd apps/cli/publish && npm publish --access public')
