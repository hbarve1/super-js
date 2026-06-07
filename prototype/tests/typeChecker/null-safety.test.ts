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

describe('Null Safety — T? annotation (type-system-v2.md §3)', () => {
  it('accepts assigning null to T? variable', () => {
    expect(errors('const x: string | null = null')).toHaveLength(0)
  })

  it('accepts assigning a string to string? variable', () => {
    expect(errors('const x: string | null = "hello"')).toHaveLength(0)
  })

  it('rejects assigning null to non-nullable string variable', () => {
    const diags = errors('const x: string = null')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('rejects assigning undefined to non-nullable number', () => {
    const diags = errors('const x: number = undefined')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })
})

describe('SJS-E005 — access T? without null check', () => {
  it('emits SJS-E005 when accessing property of nullable type', () => {
    const diags = errors('const x: string | null = "hi"; x.length')
    expect(diags.some(d => d.code === 'SJS-E005')).toBe(true)
  })

  it('emits SJS-E005 for string | undefined', () => {
    const diags = errors('const x: string | undefined = "hi"; x.length')
    expect(diags.some(d => d.code === 'SJS-E005')).toBe(true)
  })

  it('no SJS-E005 when using optional chaining ?.', () => {
    const diags = errors('const x: string | null = "hi"; x?.length')
    expect(diags.filter(d => d.code === 'SJS-E005')).toHaveLength(0)
  })

  it('no SJS-E005 after null !== narrowing', () => {
    const diags = errors(`
      const x: string | null = "hi"
      if (x !== null) {
        const n: number = x.length
      }
    `)
    expect(diags.filter(d => d.code === 'SJS-E005')).toHaveLength(0)
  })

  it('no SJS-E005 after truthy narrowing', () => {
    const diags = errors(`
      const x: string | null = "hi"
      if (x) {
        const n: number = x.length
      }
    `)
    expect(diags.filter(d => d.code === 'SJS-E005')).toHaveLength(0)
  })

  it('no SJS-E005 after early-return guard if (!x) return', () => {
    const diags = errors(`
      function foo(x: string | null): number {
        if (!x) return 0
        return x.length
      }
    `)
    expect(diags.filter(d => d.code === 'SJS-E005')).toHaveLength(0)
  })

  it('no SJS-E005 for non-nullable string type', () => {
    const diags = errors('const x: string = "hi"; x.length')
    expect(diags.filter(d => d.code === 'SJS-E005')).toHaveLength(0)
  })

  it('no SJS-E005 for any type (gradual)', () => {
    const diags = errors('const x: any = "hi"; x.length')
    expect(diags.filter(d => d.code === 'SJS-E005')).toHaveLength(0)
  })
})
