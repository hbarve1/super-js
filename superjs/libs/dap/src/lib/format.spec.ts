import { describe, it, expect } from 'vitest';
import { formatRuntimeValue } from './format.js';

describe('formatRuntimeValue', () => {
  it('formats sum type payloads as Tag(payload)', () => {
    expect(formatRuntimeValue({ _tag: 'Ok', _0: 42 })).toBe('Ok(42)');
    expect(formatRuntimeValue({ _tag: 'Err', _0: 'nope' })).toBe('Err("nope")');
  });

  it('formats nullary constructors', () => {
    expect(formatRuntimeValue({ _tag: 'None' })).toBe('None');
  });

  it('formats plain values as JSON', () => {
    expect(formatRuntimeValue('hi')).toBe('"hi"');
    expect(formatRuntimeValue(1)).toBe('1');
  });
});
