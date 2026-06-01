/**
 * Type checker tests — RED phase.
 *
 * Each describe block maps to a rule in specs/001-superjs-core-language/type-system.md.
 * The corresponding ECMAScript spec anchor is noted in the describe name.
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { Diagnostic } from '../../src/typeChecker/types'

// ── Test helper ──────────────────────────────────────────────────────────────

function typeCheck(source: string): Diagnostic[] {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })
  const checker = new TypeChecker()
  traverse(ast, {
    enter(path) { checker.check(path) },
  })
  return checker.getDiagnostics()
}

function errors(source: string): Diagnostic[] {
  return typeCheck(source).filter(d => d.severity === 'error')
}

// ── Rule TC-001: Primitive type literals (ECMA-262 §6.1) ────────────────────

describe('TC-001: Primitive type literals — ECMA-262 §6.1', () => {
  it('infers string from string literal', () => {
    expect(errors('const x: number = "hello"').length).toBeGreaterThan(0)
  })

  it('accepts string literal assigned to string annotation', () => {
    expect(errors('const x: string = "hello"')).toHaveLength(0)
  })

  it('accepts number literal assigned to number annotation', () => {
    expect(errors('const x: number = 42')).toHaveLength(0)
  })

  it('accepts boolean literal assigned to boolean annotation', () => {
    expect(errors('const x: boolean = true')).toHaveLength(0)
  })

  it('rejects number literal assigned to string annotation', () => {
    expect(errors('const x: string = 42').length).toBeGreaterThan(0)
  })

  it('rejects boolean literal assigned to number annotation', () => {
    expect(errors('const x: number = false').length).toBeGreaterThan(0)
  })

  it('rejects string literal assigned to boolean annotation', () => {
    expect(errors('const x: boolean = "yes"').length).toBeGreaterThan(0)
  })
})

// ── Rule TC-002: null and undefined (ECMA-262 §6.1.1, §6.1.2) ───────────────

describe('TC-002: null and undefined — ECMA-262 §6.1.1–6.1.2', () => {
  it('accepts null assigned to nullable type', () => {
    expect(errors('const x: string | null = null')).toHaveLength(0)
  })

  it('rejects null assigned to non-nullable type', () => {
    expect(errors('const x: string = null').length).toBeGreaterThan(0)
  })

  it('accepts undefined assigned to optional type', () => {
    expect(errors('const x: number | undefined = undefined')).toHaveLength(0)
  })
})

// ── Rule TC-003: Gradual typing — any consistency (Siek & Taha 2006) ─────────

describe('TC-003: Gradual typing — any is consistent with all types', () => {
  it('accepts unannotated variable (inferred as any)', () => {
    expect(errors('let x = "hello"; x = 42')).toHaveLength(0)
  })

  it('accepts any assigned to number', () => {
    // explicit cast via intermediate any
    expect(errors('const x: any = "hello"; const y: number = x')).toHaveLength(0)
  })

  it('accepts value from unannotated function as any type', () => {
    expect(errors('function f() { return 42 } const x: string = f()')).toHaveLength(0)
  })

  it('does not suppress errors on annotated code even when any is present', () => {
    // The annotated assignment is wrong; any in unrelated context should not suppress it
    expect(errors('const a: any = 1; const x: number = "wrong"').length).toBeGreaterThan(0)
  })
})

// ── Rule TC-004: Variable re-assignment (ECMA-262 §14.3.1) ───────────────────

describe('TC-004: Variable re-assignment — ECMA-262 §14.3.1', () => {
  it('accepts re-assigning compatible type to let variable', () => {
    expect(errors('let x: number = 1; x = 2')).toHaveLength(0)
  })

  it('rejects re-assigning incompatible type to let variable', () => {
    expect(errors('let x: number = 1; x = "hello"').length).toBeGreaterThan(0)
  })
})

// ── Rule TC-005: Function return types (ECMA-262 §15.2) ──────────────────────

describe('TC-005: Function return types — ECMA-262 §15.2', () => {
  it('accepts return value matching return type annotation', () => {
    expect(errors('function f(): number { return 42 }')).toHaveLength(0)
  })

  it('rejects return value mismatching return type annotation', () => {
    expect(errors('function f(): number { return "hello" }').length).toBeGreaterThan(0)
  })

  it('accepts void function with no return value', () => {
    expect(errors('function f(): void { console.log("hi") }')).toHaveLength(0)
  })

  it('rejects returning a value from void function', () => {
    expect(errors('function f(): void { return 42 }').length).toBeGreaterThan(0)
  })

  it('accepts arrow function return type check', () => {
    expect(errors('const f = (): number => 42')).toHaveLength(0)
  })

  it('rejects arrow function return type mismatch', () => {
    expect(errors('const f = (): number => "hello"').length).toBeGreaterThan(0)
  })
})

// ── Rule TC-006: Function parameter types (ECMA-262 §15.2.2) ─────────────────

describe('TC-006: Function parameter types — ECMA-262 §15.2', () => {
  it('accepts call with correct argument type', () => {
    expect(errors(`
      function greet(name: string): string { return "hi " + name }
      greet("Alice")
    `)).toHaveLength(0)
  })

  it('rejects call with wrong argument type', () => {
    expect(errors(`
      function greet(name: string): string { return "hi " + name }
      greet(42)
    `).length).toBeGreaterThan(0)
  })

  it('accepts optional parameter omitted at call site', () => {
    expect(errors(`
      function f(x: number, y?: number): number { return x }
      f(1)
    `)).toHaveLength(0)
  })
})

// ── Rule TC-007: Union type compatibility (TypeScript extensions) ─────────────

describe('TC-007: Union types', () => {
  it('accepts value matching either branch of a union', () => {
    expect(errors('const x: string | number = "hello"')).toHaveLength(0)
    expect(errors('const x: string | number = 42')).toHaveLength(0)
  })

  it('rejects value matching neither branch of a union', () => {
    expect(errors('const x: string | number = true').length).toBeGreaterThan(0)
  })
})

// ── Rule TC-008: Diagnostic structure ────────────────────────────────────────

describe('TC-008: Diagnostic structure', () => {
  it('diagnostic includes SJS error code', () => {
    const diags = errors('const x: number = "hello"')
    expect(diags.length).toBeGreaterThan(0)
    expect(diags[0].code).toMatch(/^SJS-E/)
  })

  it('diagnostic includes location (line + column)', () => {
    const diags = errors('const x: number = "hello"')
    expect(diags[0].line).toBeGreaterThan(0)
    expect(diags[0].column).toBeGreaterThanOrEqual(0)
  })

  it('diagnostic includes ECMAScript spec reference URL', () => {
    const diags = errors('const x: number = "hello"')
    expect(diags[0].specUrl).toMatch(/tc39\.es\/ecma262/)
  })

  it('diagnostic message names both the expected and actual type', () => {
    const diags = errors('const x: number = "hello"')
    expect(diags[0].message).toMatch(/number/)
    expect(diags[0].message).toMatch(/string/)
  })
})
