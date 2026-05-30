import { compile } from '../../src/compiler'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

const DEMOS_DIR = join(__dirname, '../../examples')

describe('Demo projects compile end-to-end', () => {
  const demos = [
    { name: 'algorithms', dir: join(DEMOS_DIR, 'algorithms'), outDir: '/tmp/sjs-demo-algorithms', knownFile: 'linked-list.js' },
    { name: 'web',        dir: join(DEMOS_DIR, 'web/src'),    outDir: '/tmp/sjs-demo-web',        knownFile: 'app.js' },
    { name: 'jsx',        dir: join(DEMOS_DIR, 'jsx/src'),    outDir: '/tmp/sjs-demo-jsx',        knownFile: 'App.js' },
    { name: 'node',       dir: join(DEMOS_DIR, 'node/src'),   outDir: '/tmp/sjs-demo-node',       knownFile: 'main.js' },
  ]

  afterAll(() => {
    for (const demo of demos) {
      rmSync(demo.outDir, { recursive: true, force: true })
    }
  })

  for (const demo of demos) {
    it(`${demo.name} demo compiles without errors`, async () => {
      await expect(
        compile({ directory: demo.dir, outDir: demo.outDir, silent: true })
      ).resolves.not.toThrow()
      expect(existsSync(join(demo.outDir, demo.knownFile))).toBe(true)
    })
  }
})

describe('Preprocessor integration', () => {
  const tmpDir = '/tmp/sjs-preproc-test'
  const outDir = '/tmp/sjs-preproc-out'

  afterAll(() => {
    const { rmSync } = require('fs')
    rmSync(tmpDir, { recursive: true, force: true })
    rmSync(outDir, { recursive: true, force: true })
  })

  it('compiles SJS sum type syntax without errors', async () => {
    const { writeFileSync, mkdirSync } = require('fs')
    const { join } = require('path')
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(join(tmpDir, 'test.sjs'), `
type Result<T, E> = Ok(T) | Err(E)
const r = Ok(42)
`)
    await expect(
      compile({ sourceFile: join(tmpDir, 'test.sjs'), outDir, silent: true })
    ).resolves.not.toThrow()
  })
})
