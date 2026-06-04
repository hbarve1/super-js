import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic as Diagnostic } from '../../src/typeChecker/types'

function typeCheck(source: string): Diagnostic[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const checker = new TypeChecker()
  traverse(ast, { enter(path) { checker.check(path) } })
  return checker.getDiagnostics()
}

function errors(source: string) {
  return typeCheck(source).filter(d => d.severity === 'error')
}

// ── Task 2.1: Array literal type inference — ECMA-262 §13.2.4 ────────────────

describe('ArrayExpression type inference — ECMA-262 §13.2.4', () => {
  it('infers number[] from homogeneous number array', () => {
    expect(errors('const x: number[] = [1, 2, 3]')).toHaveLength(0)
  })

  it('infers string[] from homogeneous string array', () => {
    expect(errors('const x: string[] = ["a", "b", "c"]')).toHaveLength(0)
  })

  it('infers boolean[] from homogeneous boolean array', () => {
    expect(errors('const x: boolean[] = [true, false]')).toHaveLength(0)
  })

  it('reports SJS-E001 when assigning array to a non-array type', () => {
    const diags = errors('const x: number = [1, 2, 3]')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('infers any[] for empty array — assignable to any array type', () => {
    expect(errors('const x: number[] = []')).toHaveLength(0)
  })

  it('infers any[] for mixed-type array — consistent via gradual typing', () => {
    // any[] is consistent with number[] because array ~ array under current checker
    expect(errors('const x: number[] = [1, "two"]')).toHaveLength(0)
  })
})

// ── Task 2.1: Computed MemberExpression inference — ECMA-262 §13.3.2 ─────────

describe('Computed MemberExpression inference — ECMA-262 §13.3.2', () => {
  it('infers element type from annotated number[] variable', () => {
    expect(errors('const arr: number[] = [1, 2]; const x: number = arr[0]')).toHaveLength(0)
  })

  it('infers element type from annotated string[] variable', () => {
    expect(errors('const arr: string[] = ["a"]; const x: string = arr[0]')).toHaveLength(0)
  })

  it('reports SJS-E001 when element type mismatches declared variable type', () => {
    const diags = errors('const arr: string[] = ["a"]; const x: number = arr[0]')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('infers number from inline number[] literal access', () => {
    expect(errors('const x: number = [10, 20, 30][1]')).toHaveLength(0)
  })

  it('infers string from inline string[] literal access', () => {
    expect(errors('const x: string = ["hello", "world"][0]')).toHaveLength(0)
  })

  it('returns any for access on non-array (gradual)', () => {
    expect(errors('const x: number = (someUnknown as any)[0]')).toHaveLength(0)
  })
})
