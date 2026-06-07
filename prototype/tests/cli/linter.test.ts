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

// ── P3: SJS-L002 prefer-optional-chain ───────────────────────────────────────

describe('P3 SJS-L002: prefer-optional-chain', () => {
  it('flags x !== null && x.prop pattern', async () => {
    expect(await codes('const x = { a: 1 }\nconst r = x !== null && x.a')).toContain('SJS-L002')
  })

  it('flags x !== undefined && x.prop pattern', async () => {
    expect(await codes('const x = { a: 1 }\nconst r = x !== undefined && x.a')).toContain('SJS-L002')
  })

  it('does not flag x && y.prop (different objects)', async () => {
    expect(await codes('const x = 1\nconst y = { a: 2 }\nconst r = x && y.a')).not.toContain('SJS-L002')
  })

  it('does not flag x !== null && doSomethingElse()', async () => {
    expect(await codes('const x = 1\nconst y = 2\nconst r = x !== null && y')).not.toContain('SJS-L002')
  })

  it('message contains the variable name', async () => {
    const diags = await lintSource('const obj = { n: 1 }\nconst r = obj !== null && obj.n')
    const d = byCodes(diags, 'SJS-L002')
    expect(d.length).toBeGreaterThan(0)
    expect(d[0].message).toContain('obj')
  })
})

// ── P3: SJS-L003 prefer-nullish-coalescing ────────────────────────────────────

describe('P3 SJS-L003: prefer-nullish-coalescing', () => {
  it('flags x || undefined pattern', async () => {
    expect(await codes('const x = 1\nconst r = x || undefined')).toContain('SJS-L003')
  })

  it('flags x || null pattern', async () => {
    expect(await codes('const x = 1\nconst r = x || null')).toContain('SJS-L003')
  })

  it('does not flag x || y where y is not null/undefined', async () => {
    expect(await codes('const x = 1\nconst y = 2\nconst r = x || y')).not.toContain('SJS-L003')
  })

  it('does not flag x || "default"', async () => {
    expect(await codes('const x = ""\nconst r = x || "default"')).not.toContain('SJS-L003')
  })

  it('message mentions ?? and ||', async () => {
    const diags = await lintSource('const x = 1\nconst r = x || undefined')
    const d = byCodes(diags, 'SJS-L003')
    expect(d.length).toBeGreaterThan(0)
    expect(d[0].message).toContain('??')
  })
})

// ── P3: SJS-L004 no-any ───────────────────────────────────────────────────────

describe('P3 SJS-L004: no-any', () => {
  it('flags explicit any type annotation', async () => {
    expect(await codes('const x: any = 42')).toContain('SJS-L004')
  })

  it('flags any in function parameter', async () => {
    expect(await codes('function f(x: any): void {}')).toContain('SJS-L004')
  })

  it('flags any in return type', async () => {
    expect(await codes('function f(): any { return 1 }')).toContain('SJS-L004')
  })

  it('does not flag dynamic type annotation', async () => {
    expect(await codes('const x: dynamic = 42')).not.toContain('SJS-L004')
  })

  it('message mentions dynamic as alternative', async () => {
    const diags = await lintSource('const x: any = 42')
    const d = byCodes(diags, 'SJS-L004')
    expect(d.length).toBeGreaterThan(0)
    expect(d[0].message).toContain('dynamic')
  })
})

// ── P3: SJS-L005 no-non-null-assertion ───────────────────────────────────────

describe('P3 SJS-L005: no-non-null-assertion', () => {
  it('flags non-null assertion operator !', async () => {
    expect(await codes('const x: string | null = null\nconst s = x!')).toContain('SJS-L005')
  })

  it('flags chained non-null assertion', async () => {
    expect(await codes('const obj: { x: string } | null = null\nconst s = obj!.x')).toContain('SJS-L005')
  })

  it('does not flag regular ! (logical NOT)', async () => {
    expect(await codes('const b = true\nconst nb = !b')).not.toContain('SJS-L005')
  })

  it('message mentions optional chaining as alternative', async () => {
    const diags = await lintSource('const x: string | null = null\nconst s = x!')
    const d = byCodes(diags, 'SJS-L005')
    expect(d.length).toBeGreaterThan(0)
    expect(d[0].message).toContain('?.')
  })
})
