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
