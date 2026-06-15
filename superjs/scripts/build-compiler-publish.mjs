/**
 * Build the self-contained, publishable bundle of @hbarve1/compiler.
 *
 * Produces libs/compiler/publish/{index.js,index.d.ts,LICENSE} alongside the
 * committed package.json + README.md. The bundle inlines every internal
 * @superjs/* dependency + tslib, so the published package has zero runtime deps.
 *
 * Usage (from superjs/):
 *   node scripts/build-compiler-publish.mjs
 *   cd libs/compiler/publish && npm publish --access public
 */
import { execSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' })

// 1. Build the compiler + its dependency graph (emits dist/*.d.ts for each lib).
run('pnpm nx build @superjs/compiler')

// 2. Bundle the runtime to a single self-contained ESM file.
run(
  'node_modules/.bin/esbuild libs/compiler/src/index.ts' +
    ' --bundle --platform=node --format=esm --target=node18' +
    ' --outfile=libs/compiler/publish/index.js',
)

// 3. Roll the emitted .d.ts (with all @superjs type imports inlined) into one file.
run('node_modules/.bin/rollup -c rollup-dts.config.mjs')

// 4. Ship the repo license with the package.
copyFileSync(resolve(root, '../LICENSE'), resolve(root, 'libs/compiler/publish/LICENSE'))

console.log('\n✓ Bundle ready in libs/compiler/publish/. Publish with:')
console.log('  cd libs/compiler/publish && npm publish --access public')
