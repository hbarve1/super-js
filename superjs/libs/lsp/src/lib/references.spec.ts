import { describe, it, expect } from 'vitest';
import { identifierAt, occurrences } from './references.js';

describe('identifierAt', () => {
  it('returns the identifier name under an offset', () => {
    const src = 'const foo = 1;\nfoo();';
    expect(identifierAt(src, src.indexOf('foo();'))).toBe('foo');
  });

  it('returns null when the offset is not on an identifier', () => {
    expect(identifierAt('const foo = 1;', 0)).toBeNull(); // on the `const` keyword
  });
});

describe('occurrences', () => {
  it('finds every identifier with the given name', () => {
    const spans = occurrences('const foo = 1;\nfoo();\nbar();', 'foo');
    expect(spans).toHaveLength(2);
    expect(spans[0]!.start.offset).toBeLessThan(spans[1]!.start.offset);
  });

  it('returns nothing for an absent name', () => {
    expect(occurrences('const foo = 1;', 'zzz')).toEqual([]);
  });
});
