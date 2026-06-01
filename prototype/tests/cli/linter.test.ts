/**
 * Linter tests — T040/T041
 *
 * Three rules:
 *   SJS-L001  prefer-const  — let declared but never reassigned
 *   SJS-W002  no-unused-var — variable declared but never read
 *   SJS-W003  no-unused-import — import specifier never referenced
 */

import { lintSource } from '../../src/linter'
import type { LintDiagnostic } from '../../src/linter/types'

function codes(src: string): Promise<string[]> {
  return lintSource(src).then(ds => ds.map(d => d.code))
}

function byCodes(ds: LintDiagnostic[], code: string): LintDiagnostic[] {
  return ds.filter(d => d.code === code)
}

// ── SJS-L001: prefer-const ────────────────────────────────────────────────────

describe('SJS-L001: prefer-const', () => {
  it('flags let that is never reassigned', async () => {
    expect(await codes('let x = 1\nconsole.log(x)')).toContain('SJS-L001')
  })

  it('does not flag let that is reassigned', async () => {
    expect(await codes('let x = 1\nx = 2\nconsole.log(x)')).not.toContain('SJS-L001')
  })

  it('does not flag const', async () => {
    expect(await codes('const x = 1\nconsole.log(x)')).not.toContain('SJS-L001')
  })

  it('includes the variable name in the message', async () => {
    const diags = await lintSource('let counter = 0\nconsole.log(counter)')
    const d = byCodes(diags, 'SJS-L001')
    expect(d.length).toBeGreaterThan(0)
    expect(d[0].message).toContain('counter')
  })

  it('flags correct line number', async () => {
    const diags = await lintSource('const a = 1\nlet b = 2\nconsole.log(a, b)')
    const d = byCodes(diags, 'SJS-L001')
    expect(d[0].line).toBe(2)
  })
})

// ── SJS-W002: no-unused-var ───────────────────────────────────────────────────

describe('SJS-W002: no-unused-var', () => {
  it('flags variable declared but never used', async () => {
    expect(await codes('const x = 1')).toContain('SJS-W002')
  })

  it('does not flag variable that is used', async () => {
    expect(await codes('const x = 1\nconsole.log(x)')).not.toContain('SJS-W002')
  })

  it('does not flag variables prefixed with _', async () => {
    expect(await codes('const _unused = 1')).not.toContain('SJS-W002')
  })

  it('flags unused let too', async () => {
    expect(await codes('let y = 2')).toContain('SJS-W002')
  })

  it('includes the variable name in the message', async () => {
    const diags = await lintSource('const orphan = 42')
    const d = byCodes(diags, 'SJS-W002')
    expect(d.length).toBeGreaterThan(0)
    expect(d[0].message).toContain('orphan')
  })
})

// ── SJS-W003: no-unused-import ────────────────────────────────────────────────

describe('SJS-W003: no-unused-import', () => {
  it('flags imported specifier never used', async () => {
    const src = `import { readFileSync } from 'fs'`
    expect(await codes(src)).toContain('SJS-W003')
  })

  it('does not flag import that is used', async () => {
    const src = `import { readFileSync } from 'fs'\nreadFileSync('file')`
    expect(await codes(src)).not.toContain('SJS-W003')
  })

  it('flags only the unused specifier in a multi-import', async () => {
    const src = `import { readFileSync, writeFileSync } from 'fs'\nreadFileSync('f')`
    const diags = await lintSource(src)
    const unused = byCodes(diags, 'SJS-W003')
    expect(unused.length).toBe(1)
    expect(unused[0].message).toContain('writeFileSync')
  })

  it('does not flag default imports that are used', async () => {
    const src = `import path from 'path'\nconsole.log(path.join('a','b'))`
    expect(await codes(src)).not.toContain('SJS-W003')
  })
})

// ── Diagnostic structure ──────────────────────────────────────────────────────

describe('LintDiagnostic structure', () => {
  it('has code, message, severity, line, column', async () => {
    const diags = await lintSource('let x = 1\nconsole.log(x)')
    expect(diags.length).toBeGreaterThan(0)
    const d = diags[0]
    expect(d.code).toMatch(/^SJS-/)
    expect(typeof d.message).toBe('string')
    expect(d.severity).toMatch(/warning|error/)
    expect(d.line).toBeGreaterThan(0)
    expect(d.column).toBeGreaterThanOrEqual(0)
  })
})
