import { compile } from '../../src/compiler'
import { join } from 'path'

const DEMOS_DIR = join(__dirname, '../../examples')

describe('Demo projects compile end-to-end', () => {
  const demos = [
    { name: 'algorithms', dir: join(DEMOS_DIR, 'algorithms'), outDir: '/tmp/sjs-demo-algorithms' },
    { name: 'web',        dir: join(DEMOS_DIR, 'web/src'),    outDir: '/tmp/sjs-demo-web' },
    { name: 'jsx',        dir: join(DEMOS_DIR, 'jsx/src'),    outDir: '/tmp/sjs-demo-jsx' },
    { name: 'node',       dir: join(DEMOS_DIR, 'node/src'),   outDir: '/tmp/sjs-demo-node' },
  ]

  for (const demo of demos) {
    it(`${demo.name} demo compiles without errors`, async () => {
      await expect(
        compile({ directory: demo.dir, outDir: demo.outDir, silent: true })
      ).resolves.not.toThrow()
    })
  }
})
