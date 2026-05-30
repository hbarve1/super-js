import { transformSumTypes } from '../../src/preprocessor/sumTypes'

describe('Sum type preprocessor', () => {
  it('transforms a unit variant with no fields', () => {
    const input = `type Color = Red | Green | Blue`
    const out = transformSumTypes(input)
    expect(out).toContain('_tag: "Red"')
    expect(out).toContain('_tag: "Green"')
    expect(out).toContain('const Red = (): Red => ({ _tag: "Red" as const })')
  })

  it('transforms a single-field variant', () => {
    const out = transformSumTypes(`type Result<T, E> = Ok(T) | Err(E)`)
    expect(out).toContain('_tag: "Ok"; _0: T')
    expect(out).toContain('const Ok = <T>(_0: T): Ok<T> => ({ _tag: "Ok" as const, _0 })')
  })

  it('passes through non-sum-type lines unchanged', () => {
    const input = `const x: number = 42\ntype Alias = string | number`
    expect(transformSumTypes(input)).toBe(input)
  })

  it('handles multi-field tuple variant', () => {
    const out = transformSumTypes(`type Point = XY(number, number)`)
    expect(out).toContain('_0: number; _1: number')
    expect(out).toContain('const XY = (_0: number, _1: number): XY => ({ _tag: "XY" as const, _0, _1 })')
  })
})
