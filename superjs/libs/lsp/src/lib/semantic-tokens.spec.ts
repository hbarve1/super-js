import { describe, it, expect } from 'vitest';
import { semanticTokens, TOKEN_TYPES } from './semantic-tokens.js';

const typeIndex = (name: string) => TOKEN_TYPES.indexOf(name as (typeof TOKEN_TYPES)[number]);

describe('semanticTokens', () => {
  it('encodes keyword, variable and number tokens relative to one another', () => {
    // `const x = 1;` → const@0, x@6, 1@10 ; `=` and `;` are skipped.
    expect(semanticTokens('const x = 1;')).toEqual([
      0, 0, 5, typeIndex('keyword'), 0,   // const
      0, 6, 1, typeIndex('variable'), 0,  // x  (+6 chars from `const`)
      0, 4, 1, typeIndex('number'), 0,    // 1  (+4 chars from `x`)
    ]);
  });

  it('uses an absolute start column after a line delta', () => {
    const data = semanticTokens('const a = 1;\nconst b = 2;');
    // The 4th token is the second line's `const`: deltaLine 1, absolute char 0.
    expect(data.slice(15, 20)).toEqual([1, 0, 5, typeIndex('keyword'), 0]);
  });

  it('classifies string literals', () => {
    const [, , , type] = semanticTokens('const s = "hi";').slice(10);
    expect(type).toBe(typeIndex('string'));
  });

  it('skips a multi-line template literal (single-line tokens only)', () => {
    // The template spans two lines, so it is omitted; only `const t` remain.
    const data = semanticTokens('const t = `a\nb`;');
    expect(data).toEqual([
      0, 0, 5, typeIndex('keyword'), 0,
      0, 6, 1, typeIndex('variable'), 0,
    ]);
  });

  it('returns an empty array for source with no classifiable tokens', () => {
    expect(semanticTokens('   ;;;   ')).toEqual([]);
  });
});
