import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic as Diagnostic, SumType, SumVariantType } from '../../src/typeChecker/types'

// ── Test helpers ──────────────────────────────────────────────────────────────

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

// ── Structural tests ──────────────────────────────────────────────────────────

describe('SumType structure', () => {
  it('can construct a SumType with variants', () => {
    const okVariant: SumVariantType = {
      kind: 'sumVariant',
      tag: 'Ok',
      fields: [{ name: '_0', type: { kind: 'number' } }],
    }
    const errVariant: SumVariantType = {
      kind: 'sumVariant',
      tag: 'Err',
      fields: [{ name: '_0', type: { kind: 'string' } }],
    }
    const result: SumType = {
      kind: 'sum',
      name: 'Result',
      variants: [okVariant, errVariant],
    }
    expect(result.variants).toHaveLength(2)
    expect(result.variants[0].tag).toBe('Ok')
  })
})

// ── Exhaustiveness checks — SJS-E007 ─────────────────────────────────────────

describe('Sum type exhaustiveness — SJS-E007', () => {
  it('does not error on exhaustive switch covering all variants', () => {
    const src = `
type Ok = { _tag: "Ok"; _0: number }
const Ok = (_0: number): Ok => ({ _tag: "Ok" as const, _0 })
type Err = { _tag: "Err"; _0: string }
const Err = (_0: string): Err => ({ _tag: "Err" as const, _0 })
type Result = Ok | Err
const r: Result = Ok(1)
switch (r._tag) {
  case "Ok": break
  case "Err": break
}
`
    expect(errors(src).filter(d => d.code === 'SJS-E007')).toHaveLength(0)
  })

  it('emits SJS-E007 when a variant is missing from switch', () => {
    const src = `
type Ok = { _tag: "Ok"; _0: number }
const Ok = (_0: number): Ok => ({ _tag: "Ok" as const, _0 })
type Err = { _tag: "Err"; _0: string }
const Err = (_0: string): Err => ({ _tag: "Err" as const, _0 })
type Result = Ok | Err
const r: Result = Ok(1)
switch (r._tag) {
  case "Ok": break
}
`
    expect(errors(src).some(d => d.code === 'SJS-E007')).toBe(true)
  })

  it('does not error when switch has a default case', () => {
    const src = `
type Ok = { _tag: "Ok"; _0: number }
const Ok = (_0: number): Ok => ({ _tag: "Ok" as const, _0 })
type Err = { _tag: "Err"; _0: string }
const Err = (_0: string): Err => ({ _tag: "Err" as const, _0 })
type Result = Ok | Err
const r: Result = Ok(1)
switch (r._tag) {
  case "Ok": break
  default: break
}
`
    expect(errors(src).filter(d => d.code === 'SJS-E007')).toHaveLength(0)
  })
})
