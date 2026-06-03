/**
 * Type checker tests — RED phase.
 *
 * Each describe block maps to a rule in specs/001-superjs-core-language/type-system.md.
 * The corresponding ECMAScript spec anchor is noted in the describe name.
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic } from '../../src/typeChecker/types'

// ── Test helper ──────────────────────────────────────────────────────────────

function typeCheck(source: string): PrototypeDiagnostic[] {
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

function errors(source: string): PrototypeDiagnostic[] {
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

// ── Task 1.2: Async/Await Type Inference — ECMA-262 §15.8 ────────────────────

describe('TC-async: Async/Await type inference — ECMA-262 §15.8', () => {
  it('accepts async function returning matching type inside Promise<T>', () => {
    expect(errors(`
      async function fetchData(): Promise<number> { return 42 }
    `)).toHaveLength(0)
  })

  it('rejects async function returning wrong type inside Promise<T>', () => {
    expect(errors(`
      async function fetchData(): Promise<number> { return "hello" }
    `).length).toBeGreaterThan(0)
  })

  it('accepts async function with no return annotation (gradual)', () => {
    expect(errors(`
      async function fetchData() { return 42 }
    `)).toHaveLength(0)
  })

  it('await unwraps Promise<number> to number', () => {
    expect(errors(`
      async function fetchNumber(): Promise<number> { return 42 }
      async function main() {
        const x: number = await fetchNumber()
      }
    `)).toHaveLength(0)
  })

  it('rejects assigning awaited Promise<string> to number', () => {
    expect(errors(`
      async function fetchString(): Promise<string> { return "hi" }
      async function main() {
        const x: number = await fetchString()
      }
    `).length).toBeGreaterThan(0)
  })

  it('accepts async arrow with Promise<T> annotation', () => {
    expect(errors(`
      const f = async (): Promise<string> => "hello"
    `)).toHaveLength(0)
  })

  it('rejects async arrow returning wrong type', () => {
    expect(errors(`
      const f = async (): Promise<string> => 42
    `).length).toBeGreaterThan(0)
  })

  it('emits SJS-E009 when await used inside non-async function', () => {
    // Babel rejects `await` inside non-async functions at parse time, so we
    // construct the AST manually to verify the checker's static analysis rule.
    const awaitExpr = t.awaitExpression(
      t.callExpression(t.identifier('somePromise'), [])
    )
    const fn = t.functionDeclaration(
      t.identifier('f'),
      [],
      t.blockStatement([t.returnStatement(awaitExpr)]),
      false,  // not generator
      false   // not async
    )
    const file = t.file(t.program([fn], [], 'module'))
    const checker = new TypeChecker()
    traverse(file, { enter(path: any) { checker.check(path) } })
    const diags = checker.getDiagnostics().filter((d: PrototypeDiagnostic) => d.severity === 'error')
    expect(diags.some((d: PrototypeDiagnostic) => d.code === 'SJS-E009')).toBe(true)
  })

  it('does not flag await inside async function', () => {
    expect(errors(`
      async function f(): Promise<number> {
        const x = await Promise.resolve(42)
        return 1
      }
    `)).toHaveLength(0)
  })

  it('Promise<T> — registered return type is accessible to callers', () => {
    // calling an async function should give Promise<T>, await should give T
    expect(errors(`
      async function getNum(): Promise<number> { return 1 }
      async function main() {
        const p: Promise<number> = getNum()
      }
    `)).toHaveLength(0)
  })
})

// ── Task 1.1: Generic Type Parameter Resolution ───────────────────────────────

describe('TC-generics: Generic type parameter resolution', () => {
  it('identity<T> — no error when argument matches return type annotation', () => {
    expect(errors(`
      function identity<T>(x: T): T { return x }
      const s: string = identity("hello")
    `)).toHaveLength(0)
  })

  it('identity<T> — error when return type annotation mismatches instantiated type', () => {
    expect(errors(`
      function identity<T>(x: T): T { return x }
      const n: number = identity("hello")
    `).length).toBeGreaterThan(0)
  })

  it('identity<T> — explicit type arg accepted', () => {
    expect(errors(`
      function identity<T>(x: T): T { return x }
      const s: string = identity<string>("hello")
    `)).toHaveLength(0)
  })

  it('identity<T> — explicit type arg mismatch emits error', () => {
    expect(errors(`
      function identity<T>(x: T): T { return x }
      const n: number = identity<string>("hello")
    `).length).toBeGreaterThan(0)
  })

  it('Array<T> — array type reference resolves element type', () => {
    expect(errors(`
      function first<T>(arr: Array<T>): T { return arr[0] }
    `)).toHaveLength(0)
  })

  it('Array<T> — no error for consistent element type argument', () => {
    expect(errors(`
      function wrap<T>(x: T): Array<T> { return [x] }
      const a: Array<number> = wrap(42)
    `)).toHaveLength(0)
  })

  it('Promise<T> — Promise return type annotation accepted without crash', () => {
    expect(() => errors(`
      function fetch<T>(): Promise<T> { return Promise.resolve() }
    `)).not.toThrow()
  })

  it('multi-param generics — both params inferred independently', () => {
    expect(errors(`
      function pair<A, B>(a: A, b: B): A { return a }
      const s: string = pair("hello", 42)
    `)).toHaveLength(0)
  })
})
