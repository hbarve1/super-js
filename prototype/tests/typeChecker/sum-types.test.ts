import type { SumType, SumVariantType } from '../../src/typeChecker/types'

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
