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

function errors(source: string) {
  return typeCheck(source).filter(d => d.severity === 'error')
}

// ── SJS-E004: BigInt / Number mixing — ECMA-262 §6.1.6.2 ─────────────────────

describe('SJS-E004: BigInt/Number mixing', () => {
  it('emits SJS-E004 when adding bigint and number literals', () => {
    const diags = errors('const x = 1n + 2')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('emits SJS-E004 when adding number and bigint literals', () => {
    const diags = errors('const x = 1 + 2n')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('emits SJS-E004 for subtraction of bigint and number', () => {
    const diags = errors('const x = 1n - 2')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('emits SJS-E004 for multiplication of bigint and number', () => {
    const diags = errors('const x = 10n * 2')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('emits SJS-E004 for exponentiation of bigint and number', () => {
    const diags = errors('const x = 2n ** 3')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(true)
  })

  it('does not emit SJS-E004 for bigint + bigint', () => {
    const diags = errors('const x = 1n + 2n')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(false)
  })

  it('does not emit SJS-E004 for number + number', () => {
    const diags = errors('const x = 1 + 2')
    expect(diags.some(d => d.code === 'SJS-E004')).toBe(false)
  })
})

// ── Binary expression type inference ─────────────────────────────────────────

describe('Binary expression type inference', () => {
  it('infers number for number arithmetic', () => {
    // const x: number = 1 + 2 — should not error
    expect(errors('const x: number = 1 + 2')).toHaveLength(0)
  })

  it('infers number for number subtraction', () => {
    expect(errors('const x: number = 10 - 3')).toHaveLength(0)
  })

  it('infers number for number multiplication', () => {
    expect(errors('const x: number = 4 * 5')).toHaveLength(0)
  })

  it('infers number for exponentiation', () => {
    expect(errors('const x: number = 2 ** 8')).toHaveLength(0)
  })

  it('infers string for string + string', () => {
    expect(errors('const x: string = "hello" + " world"')).toHaveLength(0)
  })

  it('infers string for string + number (JS coercion)', () => {
    expect(errors('const x: string = "value: " + 42')).toHaveLength(0)
  })

  it('infers bigint for bigint + bigint', () => {
    expect(errors('const x: bigint = 1n + 2n')).toHaveLength(0)
  })

  it('infers boolean for comparison operators', () => {
    expect(errors('const x: boolean = 1 < 2')).toHaveLength(0)
  })

  it('infers boolean for equality operators', () => {
    expect(errors('const x: boolean = "a" === "b"')).toHaveLength(0)
  })

  it('infers boolean for !== operator', () => {
    expect(errors('const x: boolean = 1 !== 2')).toHaveLength(0)
  })

  it('rejects assigning number arithmetic result to string variable', () => {
    const diags = errors('const x: string = 1 + 2')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('rejects assigning string concatenation result to number variable', () => {
    const diags = errors('const x: number = "a" + "b"')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('rejects assigning boolean comparison to number variable', () => {
    const diags = errors('const x: number = 1 < 2')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })
})
