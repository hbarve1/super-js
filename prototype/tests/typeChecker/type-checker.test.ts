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
