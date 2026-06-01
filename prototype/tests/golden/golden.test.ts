/**
 * Golden-file tests: compile a .sjs fixture, compare to expected .js snapshot.
 *
 * To update snapshots: DELETE the corresponding .expected.js file and re-run.
 * The test will write the new expected file and pass.
 */

import { compile } from '../../src/compiler'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { resolve, join } from 'path'

const FIXTURES_DIR = resolve(__dirname, 'fixtures')
const TMP_OUT = resolve(__dirname, '../__golden_tmp__')

beforeEach(() => mkdirSync(TMP_OUT, { recursive: true }))
afterEach(() => rmSync(TMP_OUT, { recursive: true, force: true }))

function normalizeJs(code: string): string {
  return code
    .replace(/\/\/# sourceMappingURL=.*$/m, '') // strip source map comment
    .replace(/\r\n/g, '\n')
    .trim()
}

async function compileToString(fixtureName: string): Promise<string> {
  const srcFile = join(FIXTURES_DIR, `${fixtureName}.sjs`)
  await compile({
    sourceFile: srcFile,
    outDir: TMP_OUT,
    sourceRoot: FIXTURES_DIR,
    target: 'es2022',
    silent: true,
  })
  return readFileSync(join(TMP_OUT, `${fixtureName}.js`), 'utf-8')
}

function golden(name: string, actual: string): void {
  const expectedFile = join(FIXTURES_DIR, `${name}.expected.js`)
  if (!existsSync(expectedFile)) {
    writeFileSync(expectedFile, normalizeJs(actual))
    return // first run: write snapshot
  }
  const expected = readFileSync(expectedFile, 'utf-8')
  expect(normalizeJs(actual)).toBe(normalizeJs(expected))
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

describe('golden: type stripping', () => {
  it('strips type annotations from typed-vars fixture', async () => {
    const js = await compileToString('typed-vars')
    golden('typed-vars', js)
    expect(js).not.toMatch(/: string/)
    expect(js).not.toMatch(/: number/)
  })

  it('strips interface from typed-interface fixture', async () => {
    const js = await compileToString('typed-interface')
    golden('typed-interface', js)
    // Match TypeScript interface declaration syntax (not filename occurrences)
    expect(js).not.toMatch(/\binterface\s+\w/)
  })

  it('strips type alias from type-alias fixture', async () => {
    const js = await compileToString('type-alias')
    golden('type-alias', js)
    expect(js).not.toMatch(/^type /m)
  })
})

describe('golden: JSX transform', () => {
  it('transforms JSX to sjs.createElement calls', async () => {
    const js = await compileToString('simple-jsx')
    golden('simple-jsx', js)
    expect(js).toMatch(/sjs\.createElement/)
    expect(js).not.toMatch(/<[A-Z]/)  // no JSX tags remain
  })
})

describe('golden: class features', () => {
  it('compiles typed class', async () => {
    const js = await compileToString('typed-class')
    golden('typed-class', js)
    expect(js).toMatch(/class /)
    expect(js).not.toMatch(/: string/)
  })
})
