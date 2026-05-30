import { transformMatch } from '../../src/preprocessor/matchExpr'

describe('Match expression preprocessor', () => {
  it('transforms a basic match with two struct variants', () => {
    const input = `const x = match val { Ok({ v }) => v, Err({ e }) => 0 }`
    const out = transformMatch(input)
    expect(out).toContain('switch (__m._tag)')
    expect(out).toContain('case "Ok"')
    expect(out).toContain('case "Err"')
    expect(out).toContain('const { v } = __m')
    expect(out).toContain('const { e } = __m')
  })

  it('transforms a match with wildcard arm', () => {
    const out = transformMatch(`match x { Some({ v }) => v, _ => null }`)
    expect(out).toContain('default:')
    expect(out).not.toContain('throw new Error')
  })

  it('does not touch non-match expressions', () => {
    const input = `const x = 42`
    expect(transformMatch(input)).toBe(input)
  })

  it('handles unit variants (no destructuring)', () => {
    const out = transformMatch(`match c { Red => 1, Green => 2, Blue => 3 }`)
    expect(out).toContain('case "Red"')
    expect(out).toContain('case "Green"')
    expect(out).toContain('case "Blue"')
  })
})
