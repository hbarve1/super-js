/**
 * End-to-end tests: the compiler must surface type errors and halt emit.
 *
 * These tests verify that type diagnostics from the TypeChecker are collected,
 * formatted, and propagated out of compile() as a thrown CompilationError.
 *
 * Corresponds to tasks T029 (wire type checker) + T053 (diagnostic renderer).
 * ECMAScript spec links are in specs/001-superjs-core-language/type-system.md.
 */

import { compile, CompilationError } from '../../src/compiler'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'

const TMP_SRC = resolve(__dirname, '../__type_err_src__')
const TMP_OUT = resolve(__dirname, '../__type_err_out__')

beforeEach(() => {
  mkdirSync(TMP_SRC, { recursive: true })
  mkdirSync(TMP_OUT, { recursive: true })
})

afterEach(() => {
  rmSync(TMP_SRC, { recursive: true, force: true })
  rmSync(TMP_OUT, { recursive: true, force: true })
})

function writeSjs(name: string, src: string): string {
  const p = join(TMP_SRC, name)
  writeFileSync(p, src)
  return p
}

async function compileFile(src: string): Promise<void> {
  return compile({
    sourceFile: src,
    outDir: TMP_OUT,
    sourceRoot: TMP_SRC,
    silent: true,
  })
}

// ── CompilationError is thrown when type errors exist ────────────────────────

describe('compile() — type error halts emit', () => {
  it('throws CompilationError for a type mismatch', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    await expect(compileFile(src)).rejects.toBeInstanceOf(CompilationError)
  })

  it('does not write output file when type error exists', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    try { await compileFile(src) } catch { /* expected */ }
    expect(existsSync(join(TMP_OUT, 'bad.js'))).toBe(false)
  })

  it('does not throw for clean code', async () => {
    const src = writeSjs('ok.sjs', 'const x: number = 42\nconsole.log(x)')
    await expect(compileFile(src)).resolves.toBeUndefined()
    expect(existsSync(join(TMP_OUT, 'ok.js'))).toBe(true)
  })
})

// ── CompilationError exposes structured diagnostics ──────────────────────────

describe('CompilationError — diagnostic structure', () => {
  it('exposes diagnostics array', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err = await compileFile(src).catch(e => e)
    expect(err).toBeInstanceOf(CompilationError)
    expect((err as CompilationError).diagnostics).toHaveLength(1)
  })

  it('diagnostic has correct error code', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.diagnostics[0].code).toBe('SJS-E001')
  })

  it('diagnostic names both conflicting types', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.diagnostics[0].message).toMatch(/number/)
    expect(err.diagnostics[0].message).toMatch(/string/)
  })

  it('diagnostic has correct line number', async () => {
    const src = writeSjs('bad.sjs', '// comment\nconst x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.diagnostics[0].line).toBe(2)
  })

  it('diagnostic includes ECMAScript spec URL', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.diagnostics[0].specUrl).toMatch(/tc39\.es\/ecma262/)
  })

  it('accumulates multiple diagnostics in one compile', async () => {
    const src = writeSjs('bad.sjs', [
      'const a: number = "wrong"',
      'const b: string = 42',
    ].join('\n'))
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.diagnostics.length).toBeGreaterThanOrEqual(2)
  })
})

// ── Diagnostic renderer ───────────────────────────────────────────────────────

describe('CompilationError — formatted message', () => {
  it('message contains SJS error code', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.message).toContain('SJS-E001')
  })

  it('message contains file name', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.message).toContain('bad.sjs')
  })

  it('message contains line:column location', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    // Should show something like "1:19" or "line 1"
    expect(err.message).toMatch(/\b1\b/)
  })

  it('message contains the spec URL', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    const err: CompilationError = await compileFile(src).catch(e => e)
    expect(err.message).toContain('tc39.es')
  })
})

// ── --noEmit flag ─────────────────────────────────────────────────────────────

describe('compile() — noEmit mode', () => {
  it('throws CompilationError on type error even in noEmit mode', async () => {
    const src = writeSjs('bad.sjs', 'const x: number = "hello"')
    await expect(compile({
      sourceFile: src,
      outDir: TMP_OUT,
      sourceRoot: TMP_SRC,
      noEmit: true,
      silent: true,
    })).rejects.toBeInstanceOf(CompilationError)
  })

  it('does not produce output file in noEmit mode even for valid code', async () => {
    const src = writeSjs('ok.sjs', 'const x: number = 42')
    await compile({
      sourceFile: src,
      outDir: TMP_OUT,
      sourceRoot: TMP_SRC,
      noEmit: true,
      silent: true,
    })
    expect(existsSync(join(TMP_OUT, 'ok.js'))).toBe(false)
  })
})
