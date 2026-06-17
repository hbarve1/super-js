import { describe, it, expect } from 'vitest';
import { inlayHints, type ResolveType } from './inlay.js';
import type { Type } from '@superjs/types';

const NUMBER: Type = { kind: 'number' };
const always: ResolveType = () => NUMBER;
const never: ResolveType = () => null;

describe('inlayHints', () => {
  it('emits a type hint after an un-annotated binding with an initialiser', () => {
    const hints = inlayHints('const x = 1;', always);
    expect(hints).toHaveLength(1);
    expect(hints[0]!.label).toBe(': number');
    expect(hints[0]!.kind).toBe(1);
    // `const x` — the name ends at column 7, where the hint sits.
    expect(hints[0]!.position.character).toBe(7);
  });

  it('skips a binding that already has a type annotation', () => {
    expect(inlayHints('const x: number = 1;', always)).toEqual([]);
  });

  it('skips a binding with no initialiser', () => {
    expect(inlayHints('let x;', always)).toEqual([]);
  });

  it('skips when the type cannot be resolved', () => {
    expect(inlayHints('const x = 1;', never)).toEqual([]);
  });
});
