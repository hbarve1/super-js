/**
 * SJS-W001 strict-mode tests
 *
 * When strict: true, unannotated variables and function parameters
 * implicitly receive type `any` — a warning is emitted so the developer
 * can opt-in to full type safety incrementally.
 *
 * TypeScript spec reference (TypeScript is a superset of ECMAScript):
 * TypeScript Handbook — noImplicitAny
 * https://www.typescriptlang.org/tsconfig/#noImplicitAny
 *
 * The SJS-W001 rule fires only when strict mode is explicitly enabled;
 * unannotated code in non-strict mode compiles silently (gradual typing).
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic as Diagnostic } from '../../src/typeChecker/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function check(source: string, strict = false): Diagnostic[] {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })
  const checker = new TypeChecker({ strict })
  traverse(ast, {
    enter(path) { checker.check(path) },
  })
  return checker.getDiagnostics()
}

function warnings(source: string, strict = false): Diagnostic[] {
  return check(source, strict).filter(d => d.severity === 'warning')
}

// ── Non-strict mode (default) — no SJS-W001 ───────────────────────────────────

describe('SJS-W001 — non-strict mode', () => {
  it('unannotated variable produces no warning in non-strict mode', () => {
    expect(warnings('let x = 42')).toHaveLength(0)
  })

  it('unannotated function parameter produces no warning in non-strict mode', () => {
    expect(warnings('function greet(name) { return name }')).toHaveLength(0)
  })

  it('annotated variable produces no warning', () => {
    expect(warnings('let x: number = 42', true)).toHaveLength(0)
  })
})

// ── Strict mode — SJS-W001 fires for unannotated positions ───────────────────

describe('SJS-W001 — strict mode: variable declarations', () => {
  it('emits SJS-W001 for unannotated let declaration', () => {
    const diags = warnings('let x = 42', true)
    expect(diags).toHaveLength(1)
    expect(diags[0].code).toBe('SJS-W001')
  })

  it('emits SJS-W001 for unannotated const declaration', () => {
    const diags = warnings('const msg = "hello"', true)
    expect(diags[0].code).toBe('SJS-W001')
  })

  it('does NOT emit SJS-W001 when variable has explicit annotation', () => {
    expect(warnings('let x: number = 42', true)).toHaveLength(0)
  })

  it('diagnostic severity is warning (not error)', () => {
    const diags = warnings('let x = 42', true)
    expect(diags[0].severity).toBe('warning')
  })

  it('diagnostic message mentions the binding name', () => {
    const diags = warnings('let x = 42', true)
    expect(diags[0].message).toContain('x')
  })

  it('diagnostic has a specUrl', () => {
    const diags = warnings('let x = 42', true)
    expect(typeof diags[0].specUrl).toBe('string')
    expect(diags[0].specUrl.length).toBeGreaterThan(0)
  })
})

describe('SJS-W001 — strict mode: function parameters', () => {
  it('emits SJS-W001 for each unannotated parameter', () => {
    const diags = warnings('function add(a, b) { return a + b }', true)
    // a and b are both unannotated
    expect(diags.length).toBeGreaterThanOrEqual(2)
    expect(diags.every(d => d.code === 'SJS-W001')).toBe(true)
  })

  it('does NOT emit SJS-W001 for annotated parameters', () => {
    expect(warnings('function add(a: number, b: number): number { return a + b }', true)).toHaveLength(0)
  })

  it('emits for only the unannotated parameter in a mixed signature', () => {
    const diags = warnings('function f(x: number, y) { return y }', true)
    const names = diags.map(d => d.message)
    expect(diags).toHaveLength(1)
    expect(names.some(m => m.includes('y'))).toBe(true)
  })
})

describe('SJS-W001 — strict mode: arrow functions', () => {
  it('emits SJS-W001 for unannotated arrow function parameter', () => {
    const diags = warnings('const f = (x) => x', true)
    expect(diags.some(d => d.code === 'SJS-W001')).toBe(true)
  })

  it('does NOT emit SJS-W001 for the annotated parameter itself', () => {
    // `f` is unannotated so SJS-W001 fires for it, but NOT for `x` which has `: number`
    const diags = warnings('const f = (x: number) => x', true)
    const paramWarnings = diags.filter(d => d.code === 'SJS-W001' && d.message.includes("'x'"))
    expect(paramWarnings).toHaveLength(0)
  })
})
