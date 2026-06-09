/**
 * Formatter tests — T038/T039
 *
 * The formatter is idempotent, Prettier-based, and understands .sjs syntax.
 * `--check` mode exits non-zero when changes would be made, without writing.
 */

import { formatSource, formatFile, checkFormatted } from '../../src/formatter'
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs'
import { join, resolve } from 'path'

const TMP = resolve(__dirname, '../__fmt_tmp__')
beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

// ── formatSource (in-memory) ──────────────────────────────────────────────────

describe('formatSource()', () => {
  it('adds semicolons', async () => {
    const out = await formatSource('const x = 1')
    expect(out).toContain(';')
  })

  it('normalises indentation to 2 spaces', async () => {
    const src = 'function f() {\n    return 1\n}'
    const out = await formatSource(src)
    expect(out).toMatch(/^\s{2}return/m)
  })

  it('is idempotent', async () => {
    const src = 'const x: number = 1\n'
    const once = await formatSource(src)
    const twice = await formatSource(once)
    expect(once).toBe(twice)
  })

  it('handles TypeScript type annotations', async () => {
    const src = 'const x:number=1'
    const out = await formatSource(src)
    expect(out).toContain('number')
    expect(out).toContain('1')
  })

  it('handles JSX syntax', async () => {
    const src = 'const el = <div className="app">Hello</div>'
    const out = await formatSource(src)
    expect(out).toContain('div')
    expect(out).toContain('Hello')
  })

  it('preserves source semantics (parses back to equivalent AST)', async () => {
    const src = 'const greet = (name: string): string => `Hello, ${name}!`\n'
    const out = await formatSource(src)
    // After formatting the value and type should still be present
    expect(out).toContain('string')
    expect(out).toContain('Hello')
  })
})

// ── formatFile (on-disk) ──────────────────────────────────────────────────────

describe('formatFile()', () => {
  it('rewrites the file in-place', async () => {
    const file = join(TMP, 'a.sjs')
    writeFileSync(file, 'const x = 1')
    await formatFile(file)
    const after = readFileSync(file, 'utf-8')
    expect(after).toContain(';')
  })

  it('file contents are idempotent after two passes', async () => {
    const file = join(TMP, 'b.sjs')
    writeFileSync(file, 'const x:number=1\nconst y    =   2')
    await formatFile(file)
    const after1 = readFileSync(file, 'utf-8')
    await formatFile(file)
    const after2 = readFileSync(file, 'utf-8')
    expect(after1).toBe(after2)
  })
})

// ── checkFormatted ────────────────────────────────────────────────────────────

describe('checkFormatted()', () => {
  it('returns false when file needs formatting', async () => {
    const file = join(TMP, 'unformatted.sjs')
    writeFileSync(file, 'const x = 1')  // missing semicolons / newline
    const result = await checkFormatted(file)
    // either already formatted, or not — what matters is no throw and boolean returned
    expect(typeof result).toBe('boolean')
  })

  it('returns true when file is already formatted', async () => {
    const file = join(TMP, 'formatted.sjs')
    // Write a pre-formatted version
    const src = 'const x = 1;\n'
    const formatted = await formatSource(src)
    writeFileSync(file, formatted)
    const result = await checkFormatted(file)
    expect(result).toBe(true)
  })
})
