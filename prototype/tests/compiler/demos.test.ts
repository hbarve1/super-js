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
