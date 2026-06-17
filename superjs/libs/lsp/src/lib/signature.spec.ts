import { describe, it, expect } from 'vitest';
import { signatureHelp, type ResolveType } from './signature.js';
import type { Type } from '@superjs/types';

const NUMBER: Type = { kind: 'number' };
const fnType = (...names: string[]): Type => ({
  kind: 'function',
  params: names.map((name) => ({ name, type: NUMBER, optional: false, rest: false })),
  returnType: NUMBER,
  async: false,
});
const resolveAdd: ResolveType = () => fnType('a', 'b');

describe('signatureHelp', () => {
  it('returns the callee signature when the cursor is inside the call', () => {
    // `add(1, 2)` — cursor on the first argument (offset 4).
    const help = signatureHelp('add(1, 2)', 4, resolveAdd);
    expect(help!.signatures[0]!.label).toBe('(a: number, b: number) => number');
    expect(help!.signatures[0]!.parameters.map((p) => p.label)).toEqual(['a: number', 'b: number']);
    expect(help!.activeParameter).toBe(0);
  });

  it('advances the active parameter past a top-level comma', () => {
    // cursor on the second argument (offset 7, the `2`).
    expect(signatureHelp('add(1, 2)', 7, resolveAdd)!.activeParameter).toBe(1);
  });

  it('ignores commas nested in inner calls when counting the active parameter', () => {
    // `add(f(1, 2), 3)` — cursor on the `3` (after the outer comma only).
    const src = 'add(f(1, 2), 3)';
    const offset = src.indexOf('3');
    expect(signatureHelp(src, offset, resolveAdd)!.activeParameter).toBe(1);
  });

  it('returns null when the cursor is not inside any call', () => {
    expect(signatureHelp('const x = 1;', 6, resolveAdd)).toBeNull();
  });

  it('returns null when the callee does not resolve to a function type', () => {
    expect(signatureHelp('add(1)', 4, () => ({ kind: 'number' }))).toBeNull();
  });

  it('clamps the active parameter to the last declared parameter', () => {
    // three commas, but only two params — clamp to index 1.
    expect(signatureHelp('add(1, 2, 3, 4)', 13, resolveAdd)!.activeParameter).toBe(1);
  });
});
