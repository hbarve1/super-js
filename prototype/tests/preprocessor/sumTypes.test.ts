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

// ── B2: Struct variant syntax ─────────────────────────────────────────────────

describe('B2: Struct variant syntax', () => {
  it('transforms a struct variant with named fields', () => {
    const out = transformSumTypes(`type Shape = Circle { radius: number } | Rectangle { width: number, height: number }`)
    expect(out).toContain('_tag: "Circle"; radius: number')
    expect(out).toContain('const Circle = (radius: number): Circle => ({ _tag: "Circle" as const, radius })')
    expect(out).toContain('_tag: "Rectangle"; width: number; height: number')
    expect(out).toContain('const Rectangle = (width: number, height: number): Rectangle => ({ _tag: "Rectangle" as const, width, height })')
  })

  it('generates correct type alias for struct variant sum type', () => {
    const out = transformSumTypes(`type Shape = Circle { radius: number } | Rectangle { width: number, height: number }`)
    expect(out).toContain('type Shape = Circle | Rectangle')
  })

  it('handles mixed struct and unit variants', () => {
    const out = transformSumTypes(`type Option<T> = Some { value: T } | None`)
    expect(out).toContain('_tag: "Some"; value: T')
    expect(out).toContain('const Some = <T>(value: T): Some<T>')
    expect(out).toContain('const None = (): None')
  })

  it('mixed tuple and struct variants', () => {
    const out = transformSumTypes(`type Either = Left(string) | Right { value: number }`)
    expect(out).toContain('_0: string')
    expect(out).toContain('const Left = (_0: string): Left')
    expect(out).toContain('value: number')
    expect(out).toContain('const Right = (value: number): Right')
  })

  it('struct variant with no fields is a unit variant', () => {
    const out = transformSumTypes(`type Status = Active { } | Inactive`)
    // Empty struct acts like unit variant
    expect(out).toContain('const Active = (): Active')
  })
})
