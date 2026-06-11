import { describe, it, expect } from 'vitest';
import type { Token, Diagnostic, TokenKind } from '@superjs/types';
import { tokenize } from '../index.js';

/** Significant token kinds (drops the trailing eof). */
function kinds(src: string): TokenKind[] {
  return tokenize(src).tokens.slice(0, -1).map((t: Token) => t.kind);
}
function values(src: string): string[] {
  return tokenize(src).tokens.slice(0, -1).map((t: Token) => t.value);
}

describe('identifiers & keywords', () => {
  it('distinguishes keywords from identifiers', () => {
    expect(kinds('const x match foo')).toEqual(['const', 'identifier', 'match', 'identifier']);
  });
  it('banned identifiers still lex as identifiers', () => {
    expect(kinds('any enum')).toEqual(['identifier', 'identifier']);
  });
  it('private identifiers', () => {
    expect(kinds('this.#x')).toEqual(['this', '.', 'private-identifier']);
  });
});

describe('numbers', () => {
  it('decimal, float, exponent', () => {
    expect(values('1 2.5 3e10 4.2E-3')).toEqual(['1', '2.5', '3e10', '4.2E-3']);
    expect(kinds('1 2.5')).toEqual(['number', 'number']);
  });
  it('hex, octal, binary', () => {
    expect(values('0xFF 0o17 0b1010')).toEqual(['0xFF', '0o17', '0b1010']);
  });
  it('numeric separators', () => {
    expect(values('1_000_000 0xDE_AD')).toEqual(['1_000_000', '0xDE_AD']);
  });
  it('bigint', () => {
    expect(kinds('42n 0xFFn')).toEqual(['bigint', 'bigint']);
  });
  it('leading-dot float', () => {
    expect(kinds('.5')).toEqual(['number']);
  });
});

describe('strings & templates', () => {
  it('single and double quotes with escapes', () => {
    expect(values('"a\\"b" \'c\'')).toEqual(['"a\\"b"', "'c'"]);
  });
  it('template with no substitution', () => {
    expect(kinds('`hello`')).toEqual(['template-full']);
  });
  it('template with substitutions produces head/middle/tail + expr tokens', () => {
    expect(kinds('`a${x}b${y}c`')).toEqual([
      'template-head', 'identifier', 'template-middle', 'identifier', 'template-tail',
    ]);
  });
  it('nested braces inside substitution', () => {
    expect(kinds('`${ {a:1} }`')).toEqual([
      'template-head', '{', 'identifier', ':', 'number', '}', 'template-tail',
    ]);
  });
});

describe('operators (maximal munch)', () => {
  it('multi-char operators', () => {
    expect(kinds('a >>>= b')).toEqual(['identifier', '>>>=', 'identifier']);
    expect(kinds('a ?? b ?. c')).toEqual(['identifier', '??', 'identifier', '?.', 'identifier']);
    expect(kinds('x===y')).toEqual(['identifier', '===', 'identifier']);
    expect(kinds('a=>b')).toEqual(['identifier', '=>', 'identifier']);
  });
  it('?. is not split when followed by a digit (conditional)', () => {
    expect(kinds('a?.5:6')).toEqual(['identifier', '?', 'number', ':', 'number']);
  });
});

describe('regex vs division', () => {
  it('regex after = ', () => {
    expect(kinds('const r = /ab+c/gi')).toEqual(['const', 'identifier', '=', 'regex']);
  });
  it('division after identifier', () => {
    expect(kinds('a / b')).toEqual(['identifier', '/', 'identifier']);
  });
  it('regex char class with slash', () => {
    expect(values('= /[/]/')).toEqual(['=', '/[/]/']);
  });
});

describe('positions & line breaks', () => {
  it('tracks line/column and ASI hint', () => {
    const toks = tokenize('a\nb').tokens;
    expect(toks[0]?.span.start.line).toBe(1);
    expect(toks[1]?.span.start.line).toBe(2);
    expect(toks[1]?.precededByLineBreak).toBe(true);
    expect(toks[0]?.precededByLineBreak).toBe(false);
  });
  it('skips comments', () => {
    expect(kinds('a // line\n/* block */ b')).toEqual(['identifier', 'identifier']);
  });
});

describe('BiDi rejection (SJS-L011)', () => {
  it('emits L011 for a BiDi control character in a string', () => {
    const rlo = String.fromCharCode(0x202e); // RIGHT-TO-LEFT OVERRIDE
    const { diagnostics } = tokenize(`const x = "ab${rlo}cd"`);
    expect(diagnostics.some((d: Diagnostic) => d.code === 'SJS-L011')).toBe(true);
  });
  it('clean source has no diagnostics', () => {
    expect(tokenize('const x = 1').diagnostics).toHaveLength(0);
  });
});

describe('error recovery', () => {
  it('unterminated string reports P002', () => {
    const { diagnostics } = tokenize('"abc');
    expect(diagnostics.some((d: Diagnostic) => d.code === 'SJS-P002')).toBe(true);
  });
  it('always ends with eof', () => {
    const toks = tokenize('a b c').tokens;
    expect(toks[toks.length - 1]?.kind).toBe('eof');
  });
});
