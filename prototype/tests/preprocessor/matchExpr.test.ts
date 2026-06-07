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

// ── SJS2: Match guard syntax ───────────────────────────────────────────────────

describe('SJS2: Match guard syntax', () => {
  it('parses arm with guard condition', () => {
    const input = `
      const result = match x {
        Ok({ value }) if value > 0 => "positive",
        Ok({ value }) => "non-positive",
        Err => "error",
      }
    `
    const output = transformMatch(input)
    expect(output).toContain('if (value > 0)')
    expect(output).toContain('"positive"')
    expect(output).toContain('"non-positive"')
  })

  it('guard arms are checked before unguarded arms', () => {
    const input = `match x {
      Some({ v }) if v > 10 => "big",
      Some({ v }) => "small",
      None => "empty",
    }`
    const output = transformMatch(input)
    const bigIdx = output.indexOf('"big"')
    const smallIdx = output.indexOf('"small"')
    expect(bigIdx).toBeLessThan(smallIdx)
  })

  it('parses Pattern if condition => body (tuple binding)', () => {
    const out = transformMatch(`match val { Some(x) if x > 0 => x, Some(x) => 0, None => -1 }`)
    expect(out).toContain('case "Some"')
    expect(out).toContain('if (x > 0)')
  })

  it('guard condition is emitted as if check inside case', () => {
    const out = transformMatch(`match n { Value(x) if x > 10 => "big", Value(x) => "small" }`)
    expect(out).toContain('if (x > 10)')
    expect(out).toContain('"big"')
    expect(out).toContain('"small"')
  })

  it('unit variant with guard', () => {
    const out = transformMatch(`match s { Ok if true => 1, Ok => 0 }`)
    expect(out).toContain('case "Ok"')
    expect(out).toContain('if (true)')
  })

  it('guard does not affect arms without a guard (no if in output for them)', () => {
    const out = transformMatch(`match x { A => 1, B => 2 }`)
    expect(out).not.toContain(' if (')
    expect(out).toContain('case "A"')
    expect(out).toContain('case "B"')
  })

  it('wildcard arm still works with guards present', () => {
    const out = transformMatch(`match v { A if cond => 1, _ => 0 }`)
    expect(out).toContain('default:')
    expect(out).toContain('if (cond)')
  })
})

// ── SJS3: Nested pattern matching ─────────────────────────────────────────────

describe('SJS3: Nested pattern matching', () => {
  it('transforms nested match expression', () => {
    const input = `match r { Ok(v) => match v { Some(x) => x, None => 0 }, Err(e) => -1 }`
    const out = transformMatch(input)
    expect(out).toContain('case "Ok"')
    expect(out).toContain('case "Some"')
    expect(out).toContain('case "None"')
    expect(out).toContain('case "Err"')
  })

  it('inner match is fully expanded (no match keyword left)', () => {
    const input = `match outer { A => match inner { X => 1, Y => 2 }, B => 0 }`
    const out = transformMatch(input)
    expect(out).not.toContain('match ')
  })

  it('generates nested switch IIFEs', () => {
    const input = `match r { Ok(v) => match v { Just(x) => x, Nothing => 0 }, Err(e) => -1 }`
    const out = transformMatch(input)
    const switchCount = (out.match(/switch\s*\(/g) || []).length
    expect(switchCount).toBe(2)
  })

  it('deeply nested match (three levels)', () => {
    const input = `match a { A(x) => match x { B(y) => match y { C => 1, D => 2 }, E => 3 }, F => 0 }`
    const out = transformMatch(input)
    expect(out).not.toContain('match ')
    expect(out).toContain('case "A"')
    expect(out).toContain('case "B"')
    expect(out).toContain('case "C"')
  })
})

// ── SJS3: Nested pattern matching ─────────────────────────────────────────────

describe('SJS3: Nested pattern matching', () => {
  it('handles nested tuple variant: Ok({ inner: Err(msg) })', () => {
    const input = `const x = match result {
      Ok({ inner: Err(msg) }) => msg,
      _ => "fallback",
    }`
    const output = transformMatch(input)
    // Should match outer tag
    expect(output).toContain('case "Ok"')
    // Should destructure inner from outer
    expect(output).toContain('inner')
    // Should check inner tag
    expect(output).toContain('inner._tag === "Err"')
    // Should bind inner positional field
    expect(output).toContain('inner._0')
    expect(output).toContain('msg')
  })

  it('handles multiple fields with one nested: { value, inner: Err(msg) }', () => {
    const input = `match result { Ok({ value, inner: Err(msg) }) => value + msg, _ => "" }`
    const output = transformMatch(input)
    expect(output).toContain('case "Ok"')
    expect(output).toContain('inner._tag === "Err"')
    expect(output).toContain('value')
  })

  it('simple struct patterns still work after SJS3 changes', () => {
    const input = `match c { Ok({ v }) => v, Err({ e }) => 0 }`
    const output = transformMatch(input)
    expect(output).toContain('const { v } = __m')
    expect(output).toContain('const { e } = __m')
  })
})
