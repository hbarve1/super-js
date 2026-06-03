import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { Diagnostic } from '../../src/typeChecker/types'

function typeCheck(source: string): Diagnostic[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const checker = new TypeChecker()
  traverse(ast, { enter(path) { checker.check(path) } })
  return checker.getDiagnostics()
}

function errors(source: string): Diagnostic[] {
  return typeCheck(source).filter(d => d.severity === 'error')
}

// ── Binary expression type inference ─────────────────────────────────────────

describe('Binary expression type inference (ECMA-262 §13.15)', () => {
  it('infers number from number + number', () => {
    expect(errors('const x: number = 1 + 2')).toHaveLength(0)
  })

  it('infers number from number * number', () => {
    expect(errors('const x: number = 3 * 4')).toHaveLength(0)
  })

  it('infers string from string + string concatenation', () => {
    expect(errors('const x: string = "hello" + " world"')).toHaveLength(0)
  })

  it('infers string from number + string (string wins with +)', () => {
    expect(errors('const x: string = 42 + " items"')).toHaveLength(0)
  })

  it('infers boolean from comparison operators', () => {
    expect(errors('const x: boolean = 1 < 2')).toHaveLength(0)
    expect(errors('const y: boolean = "a" === "b"')).toHaveLength(0)
    expect(errors('const z: boolean = 1 !== 2')).toHaveLength(0)
  })

  it('infers bigint from bigint + bigint', () => {
    expect(errors('const x: bigint = 1n + 2n')).toHaveLength(0)
  })

  it('reports mismatch when arithmetic result is assigned to wrong type', () => {
    const diags = errors('const x: string = 1 + 2')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })
})

// ── SJS-E004: BigInt + Number mixing — ECMA-262 §6.1.6.2 ─────────────────────

describe('SJS-E004 — BigInt + Number mixing (ECMA-262 §6.1.6.2)', () => {
  it('emits SJS-E004 for bigint + number', () => {
    const diags = errors('const x = 1n + 2')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('emits SJS-E004 for number + bigint', () => {
    const diags = errors('const x = 1 + 2n')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('emits SJS-E004 for bigint - number', () => {
    const diags = errors('const x = 5n - 1')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('emits SJS-E004 for bigint * number', () => {
    const diags = errors('const x = 2n * 3')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('does NOT emit SJS-E004 for bigint + bigint', () => {
    expect(errors('const x = 1n + 2n').filter(d => d.code === 'SJS-E004')).toHaveLength(0)
  })

  it('does NOT emit SJS-E004 for number + number', () => {
    expect(errors('const x = 1 + 2').filter(d => d.code === 'SJS-E004')).toHaveLength(0)
  })

  it('does NOT emit SJS-E004 for comparisons (bigint < number allowed at spec level)', () => {
    expect(errors('const x = 1n < 2').filter(d => d.code === 'SJS-E004')).toHaveLength(0)
  })

  it('SJS-E004 message references ECMA-262 §6.1.6.2', () => {
    const diags = errors('const x = 1n + 1')
    const e004 = diags.find(d => d.code === 'SJS-E004')
    expect(e004).toBeDefined()
    expect(e004!.specUrl).toContain('bigint')
  })
})

// ── Task 1.2: Logical and conditional expression type inference ────────────────

describe('LogicalExpression type inference — ECMA-262 §13.13', () => {
  describe('&& operator', () => {
    it('accepts assignment to union type of both branches', () => {
      expect(errors('const x: number | string = (1 as any) && "hello"')).toHaveLength(0)
    })

    it('infers number when both sides are number', () => {
      expect(errors('const x: number = 1 && 2')).toHaveLength(0)
    })

    it('accepts number || number as number', () => {
      expect(errors('const x: number = 1 || 2')).toHaveLength(0)
    })

    it('rejects mixed && branches assigned to single type when inconsistent', () => {
      const diags = errors('const x: number = true && "hello"')
      expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
    })
  })

  describe('|| operator', () => {
    it('infers string when both sides are string', () => {
      expect(errors('const x: string = "a" || "b"')).toHaveLength(0)
    })

    it('infers union of string | number for mixed ||', () => {
      // string | number union is assignable to string | number
      expect(errors('const x: string | number = "a" || 42')).toHaveLength(0)
    })

    it('rejects mixed || result assigned to non-union type', () => {
      const diags = errors('const x: string = "a" || 42')
      expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
    })
  })

  describe('?? (nullish coalescing) operator — ECMA-262 §13.13', () => {
    it('strips null from left side — result is non-nullable', () => {
      // (string | null) ?? string → string (null stripped, unioned with string = string)
      expect(errors('const x: string = (null as string | null) ?? "default"')).toHaveLength(0)
    })

    it('strips undefined from left side — result is non-nullable', () => {
      expect(errors('const x: string = (undefined as string | undefined) ?? "default"')).toHaveLength(0)
    })

    it('propagates right-side type when left is pure null', () => {
      // null ?? number → number (null stripped → any, unioned with number → number)
      expect(errors('const x: number = null ?? 42')).toHaveLength(0)
    })

    it('propagates right-side type when left is pure undefined', () => {
      expect(errors('const x: string = undefined ?? "hello"')).toHaveLength(0)
    })

    it('produces union when right type differs from non-nullable left', () => {
      // string ?? number → string | number
      expect(errors('const x: string | number = "a" ?? 42')).toHaveLength(0)
    })
  })
})

describe('ConditionalExpression (ternary) type inference — ECMA-262 §13.14', () => {
  it('infers number when both branches are number', () => {
    expect(errors('const x: number = true ? 1 : 2')).toHaveLength(0)
  })

  it('infers string when both branches are string', () => {
    expect(errors('const x: string = true ? "a" : "b"')).toHaveLength(0)
  })

  it('infers union type from mixed branches', () => {
    expect(errors('const x: number | string = true ? 1 : "hello"')).toHaveLength(0)
  })

  it('rejects mixed-branch ternary assigned to single non-union type', () => {
    const diags = errors('const x: number = true ? 1 : "hello"')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('infers boolean from comparison in consequent and alternate', () => {
    expect(errors('const x: boolean = true ? true : false')).toHaveLength(0)
  })

  it('accepts any-typed result for ternary with unknown branches', () => {
    // Both arms unknown → any → no error
    expect(errors('const x: number = (foo as any) ? (bar as any) : (baz as any)')).toHaveLength(0)
  })
})
