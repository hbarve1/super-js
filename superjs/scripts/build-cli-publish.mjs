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
run(
  'node_modules/.bin/esbuild apps/cli/src/main.ts' +
    ' --bundle --platform=node --format=esm --target=node18' +
    ' --outfile=apps/cli/publish/main.js',
)

// 3. Make the bin executable + ship the license.
chmodSync(resolve(root, 'apps/cli/publish/main.js'), 0o755)
copyFileSync(resolve(root, '../LICENSE'), resolve(root, 'apps/cli/publish/LICENSE'))

console.log('\n✓ CLI bundle ready in apps/cli/publish/. Publish with:')
console.log('  cd apps/cli/publish && npm publish --access public')
