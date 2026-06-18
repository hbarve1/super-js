import { describe, it, expect } from 'vitest';
import { toMatchVariant, toMatchVariantWith, toMatchResult, toMatchOption } from '../index.js';

const ok = { _tag: 'Ok', _0: 42 };
const none = { _tag: 'None' };

describe('toMatchVariant', () => {
  it('passes on a matching tag, fails otherwise', () => {
    expect(toMatchVariant(ok, 'Ok').pass).toBe(true);
    expect(toMatchVariant(ok, 'Err').pass).toBe(false);
  });
  it('fails on a non-variant value', () => {
    const r = toMatchVariant(42, 'Ok');
    expect(r.pass).toBe(false);
    expect(r.message()).toContain('non-variant');
  });
});

describe('toMatchVariantWith', () => {
  it('checks tag and first payload', () => {
    expect(toMatchVariantWith(ok, 'Ok', 42).pass).toBe(true);
    expect(toMatchVariantWith(ok, 'Ok', 7).pass).toBe(false);
  });
});

describe('toMatchResult / toMatchOption', () => {
  it('delegate to the tag check', () => {
    expect(toMatchResult(ok, 'Ok').pass).toBe(true);
    expect(toMatchOption(none, 'None').pass).toBe(true);
    expect(toMatchOption(none, 'Some').pass).toBe(false);
  });
});
