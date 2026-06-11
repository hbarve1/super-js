import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic } from '../../src/typeChecker/types'

function typeCheck(source: string): PrototypeDiagnostic[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const checker = new TypeChecker()
  traverse(ast, { enter(path) { checker.check(path) } })
  return checker.getDiagnostics()
}

function errors(source: string): PrototypeDiagnostic[] {
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

// ── TC-logical: LogicalExpression and ConditionalExpression type inference ─────

describe('TC-logical: LogicalExpression type inference (ECMA-262 §13.13)', () => {
  it('|| of two strings infers string — no error on string assignment', () => {
    expect(errors('const x: string = "hello" || "world"')).toHaveLength(0)
  })

  it('|| of string and number infers union — errors on single-type assignment', () => {
    const diags = errors('const x: string = "hello" || 42')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('|| of two numbers infers number — no error on number assignment', () => {
    expect(errors('const x: number = 1 || 2')).toHaveLength(0)
  })

  it('&& of two strings infers string — no error on string assignment', () => {
    expect(errors('const x: string = "hello" && "world"')).toHaveLength(0)
  })

  it('&& of string and number infers union — errors on string assignment', () => {
    const diags = errors('const x: string = "foo" && 42')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('?? with null left — infers right type (string)', () => {
    expect(errors('const x: string = null ?? "default"')).toHaveLength(0)
  })

  it('?? with undefined left — infers right type (number)', () => {
    expect(errors('const x: number = undefined ?? 42')).toHaveLength(0)
  })

  it('?? with non-nullable left — infers left type, ignores right', () => {
    // left is string (not null/undefined), result is string
    expect(errors('const x: string = "hello" ?? 42')).toHaveLength(0)
  })

  it('?? with non-nullable left — right type does not widen the result', () => {
    // "hello" ?? 42 → string; assigning to number should error
    const diags = errors('const x: number = "hello" ?? 42')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })
})

describe('TC-conditional: ConditionalExpression type inference (ECMA-262 §13.14)', () => {
  it('ternary with same type on both branches infers that type', () => {
    expect(errors('const x: string = true ? "yes" : "no"')).toHaveLength(0)
  })

  it('ternary with number on both branches infers number', () => {
    expect(errors('const x: number = true ? 1 : 2')).toHaveLength(0)
  })

  it('ternary with different branch types infers union — errors on single-type assignment', () => {
    const diags = errors('const x: string = true ? "yes" : 42')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('ternary with string and boolean branches errors on number assignment', () => {
    const diags = errors('const x: number = true ? "yes" : false')
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

  it('reports error when assigning array to a non-array type', () => {
    const diags = errors('const x: number = [1, 2, 3]')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('infers any[] for empty array — assignable to any array type', () => {
    expect(errors('const x: number[] = []')).toHaveLength(0)
  })

  it('infers any[] for mixed-type array — assignable via gradual typing', () => {
    // any[] is consistent with any[] annotation (gradual)
    expect(errors('const x: number[] = [1, "two"]')).toHaveLength(0)
  })
})

describe('Computed MemberExpression inference — ECMA-262 §13.3.2', () => {
  it('infers element type from annotated number[] array variable', () => {
    expect(errors('const arr: number[] = [1, 2]; const x: number = arr[0]')).toHaveLength(0)
  })

  it('infers element type from annotated string[] array variable', () => {
    expect(errors('const arr: string[] = ["a"]; const x: string = arr[0]')).toHaveLength(0)
  })

  it('reports SJS-E001 when element type mismatches declared type', () => {
    const diags = errors('const arr: string[] = ["a"]; const x: number = arr[0]')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('infers number from inline number[] literal access', () => {
    expect(errors('const x: number = [10, 20, 30][1]')).toHaveLength(0)
  })

  it('returns any for access on non-array (gradual)', () => {
    // unknown variable → any → no error
    expect(errors('const x: number = (someUnknown as any)[0]')).toHaveLength(0)
  })
})

// ── Task 2.2: Object literal type inference + static property access ──────────

describe('ObjectExpression type inference — ECMA-262 §13.2.5', () => {
  it('infers property type from object literal — string property', () => {
    expect(errors('const obj = { name: "Alice" }; const x: string = obj.name')).toHaveLength(0)
  })

  it('infers property type from object literal — number property', () => {
    expect(errors('const obj = { age: 30 }; const x: number = obj.age')).toHaveLength(0)
  })

  it('infers property type from object literal — boolean property', () => {
    expect(errors('const obj = { active: true }; const x: boolean = obj.active')).toHaveLength(0)
  })

  it('reports SJS-E001 when property type mismatches declared variable type', () => {
    const diags = errors('const obj = { count: 42 }; const x: string = obj.count')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('returns any for unknown property on object literal (gradual)', () => {
    expect(errors('const obj = { a: 1 }; const x: number = obj.missing')).toHaveLength(0)
  })

  it('infers nested property type', () => {
    expect(errors('const obj = { inner: { value: 99 } }; const x: number = obj.inner.value')).toHaveLength(0)
  })

  it('accepts assigning object literal result to any-typed variable (gradual)', () => {
    expect(errors('const obj = { x: 1, y: 2 }')).toHaveLength(0)
  })
})

describe('Static MemberExpression inference — ECMA-262 §13.3.2', () => {
  it('infers number for .length on array variable', () => {
    expect(errors('const arr: number[] = [1, 2, 3]; const n: number = arr.length')).toHaveLength(0)
  })

  it('infers number for .length on string variable', () => {
    expect(errors('const s: string = "hello"; const n: number = s.length')).toHaveLength(0)
  })

  it('returns any for unknown property on identifier with no obj type', () => {
    expect(errors('const x: number = someUnknown.prop')).toHaveLength(0)
  })

  it('infers property from computed-inferred object variable', () => {
    expect(errors('const p = { x: 1, y: 2 }; const n: number = p.x')).toHaveLength(0)
  })

  it('reports SJS-E001 when .length result (number) assigned to string', () => {
    const diags = errors('const arr: number[] = []; const s: string = arr.length')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })
})

// ── Task 3.1: Unary expression type inference ─────────────────────────────────

describe('UnaryExpression type inference — ECMA-262 §13.5', () => {
  it('typeof always returns string', () => {
    expect(errors('const x: string = typeof 42')).toHaveLength(0)
    expect(errors('const x: string = typeof "hello"')).toHaveLength(0)
    expect(errors('const x: string = typeof true')).toHaveLength(0)
  })

  it('! (logical not) returns boolean', () => {
    expect(errors('const x: boolean = !true')).toHaveLength(0)
    expect(errors('const x: boolean = !0')).toHaveLength(0)
  })

  it('void expr returns undefined', () => {
    expect(errors('const x: undefined = void 0')).toHaveLength(0)
  })

  it('-number returns number', () => {
    expect(errors('const x: number = -42')).toHaveLength(0)
  })

  it('+number returns number', () => {
    expect(errors('const x: number = +3.14')).toHaveLength(0)
  })

  it('-bigint returns bigint', () => {
    expect(errors('const x: bigint = -10n')).toHaveLength(0)
  })

  it('~ (bitwise not) on number returns number', () => {
    expect(errors('const x: number = ~5')).toHaveLength(0)
  })

  it('reports SJS-E001 when typeof result assigned to non-string', () => {
    const diags = errors('const x: number = typeof 42')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('reports SJS-E001 when ! result assigned to non-boolean', () => {
    const diags = errors('const x: string = !true')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('reports SJS-E001 when void result assigned to non-undefined', () => {
    const diags = errors('const x: string = void 0')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('reports SJS-E001 when negation result assigned to wrong type', () => {
    const diags = errors('const x: string = -5')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })
})

// ── Task 3.2: Optional chaining type inference ────────────────────────────────

describe('OptionalMemberExpression type inference — ECMA-262 §13.5.1', () => {
  it('returns property type | undefined for known object property', () => {
    // string | undefined is consistent with string | undefined
    expect(errors('const obj = { name: "Alice" }; const x: string | undefined = obj?.name')).toHaveLength(0)
  })

  it('reports error when optional chain result (T | undefined) assigned to T only', () => {
    // string | undefined is NOT consistent with string (undefined is not string)
    const diags = errors('const obj = { name: "Alice" }; const x: string = obj?.name')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('returns any for optional chain on any-typed object (gradual)', () => {
    expect(errors('const obj: any = {}; const x: string = obj?.name')).toHaveLength(0)
  })

  it('returns any | undefined (= any) for unknown property on inferred object', () => {
    // unknown property → T_ANY; makeUnion(any, undefined) = any
    expect(errors('const obj = { a: 1 }; const x: string = obj?.missing')).toHaveLength(0)
  })

  it('chains correctly: obj?.a returns number | undefined, consistent with number | undefined', () => {
    expect(errors('const obj = { a: 42 }; const x: number | undefined = obj?.a')).toHaveLength(0)
  })
})

describe('Nullish coalescing narrowing — ECMA-262 §13.13', () => {
  it('(string | null) ?? string → string (null stripped, string | string = string)', () => {
    expect(errors('const x: string = (null as string | null) ?? "default"')).toHaveLength(0)
  })

  it('(string | undefined) ?? string → string', () => {
    expect(errors('const x: string = (undefined as string | undefined) ?? "fallback"')).toHaveLength(0)
  })

  it('null ?? number → number', () => {
    expect(errors('const x: number = null ?? 42')).toHaveLength(0)
  })

  it('undefined ?? string → string', () => {
    expect(errors('const x: string = undefined ?? "hello"')).toHaveLength(0)
  })

  it('string ?? number → string | number when string is not nullable', () => {
    expect(errors('const x: string | number = "a" ?? 42')).toHaveLength(0)
  })
})

// ── Task 4.1: Array destructuring type inference ──────────────────────────────

describe('Array destructuring type inference — ECMA-262 §14.3.3', () => {
  it('binds element identifiers to array element type from annotation', () => {
    expect(errors('const [a, b]: number[] = [1, 2]; const x: number = a')).toHaveLength(0)
  })

  it('binds element identifiers to inferred element type when no annotation', () => {
    expect(errors('const [a, b] = [1, 2]; const x: number = a')).toHaveLength(0)
  })

  it('reports SJS-E001 when element type mismatches declared variable type', () => {
    const diags = errors('const [a]: number[] = [1]; const x: string = a')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('handles rest element — binds rest as array type', () => {
    expect(errors('const [first, ...rest]: number[] = [1,2,3]; const x: number = first')).toHaveLength(0)
  })

  it('skips holes (sparse array pattern)', () => {
    // [, b] — first element is hole (null in AST), second is b
    expect(errors('const [, b]: string[] = ["a", "b"]; const x: string = b')).toHaveLength(0)
  })

  it('elements are any when destructuring an untyped non-literal', () => {
    // unknown → any; element bindings should be any
    expect(errors('const [a, b] = (someUnknown as any); const x: string = a')).toHaveLength(0)
  })
})

// ── Task 4.2: Object destructuring type inference ─────────────────────────────

describe('Object destructuring type inference — ECMA-262 §14.3.3', () => {
  it('binds properties from TSTypeLiteral annotation', () => {
    const src = 'const { name, age }: { name: string; age: number } = { name: "Alice", age: 30 }; const s: string = name; const n: number = age'
    expect(errors(src)).toHaveLength(0)
  })

  it('reports SJS-E001 when destructured property type mismatches declared', () => {
    const src = 'const { name }: { name: string } = { name: "Alice" }; const n: number = name'
    const diags = errors(src)
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('binds properties from inferred object literal when no annotation', () => {
    const src = 'const { x, y } = { x: 10, y: 20 }; const n: number = x'
    expect(errors(src)).toHaveLength(0)
  })

  it('inferred property type mismatch reports SJS-E001', () => {
    const src = 'const { count } = { count: 42 }; const s: string = count'
    const diags = errors(src)
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('unknown property binds as any (gradual)', () => {
    const src = 'const { missing } = { a: 1 }; const n: number = missing'
    expect(errors(src)).toHaveLength(0)
  })

  it('handles rest element gracefully', () => {
    const src = 'const { a, ...rest } = { a: 1, b: 2 }'
    expect(errors(src)).toHaveLength(0)
  })
})
