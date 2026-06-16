import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  span,
  position,
  mergeSpans,
  spanContains,
  SYNTHETIC_SPAN,
  SYNTHETIC_POSITION,
  KEYWORD_SET,
  BANNED_IDENTIFIER_SET,
  isKeyword,
  type Token,
  type Diagnostic,
  type Program,
  type Statement,
  type Expression,
  type Type,
  type TypeNode,
} from '../index.js';

describe('span helpers', () => {
  it('builds positions and spans', () => {
    const a = position(0, 1, 0);
    const b = position(5, 1, 5);
    const s = span(a, b);
    expect(s.start).toBe(a);
    expect(s.end).toBe(b);
  });

  it('merges two spans into one covering both', () => {
    const s1 = span(position(0, 1, 0), position(3, 1, 3));
    const s2 = span(position(8, 2, 0), position(12, 2, 4));
    const merged = mergeSpans(s1, s2);
    expect(merged.start.offset).toBe(0);
    expect(merged.end.offset).toBe(12);
  });

  it('spanContains uses half-open [start, end) by offset', () => {
    const s = span(position(2, 1, 2), position(6, 1, 6));
    expect(spanContains(s, position(2, 1, 2))).toBe(true);
    expect(spanContains(s, position(5, 1, 5))).toBe(true);
    expect(spanContains(s, position(6, 1, 6))).toBe(false); // end exclusive
    expect(spanContains(s, position(1, 1, 1))).toBe(false);
  });

  it('synthetic span/position are frozen', () => {
    expect(Object.isFrozen(SYNTHETIC_SPAN)).toBe(true);
    expect(Object.isFrozen(SYNTHETIC_POSITION)).toBe(true);
    expect(SYNTHETIC_POSITION.line).toBe(1);
  });
});

describe('keyword tables', () => {
  it('recognises SJS-specific keywords', () => {
    for (const kw of ['match', 'dynamic', 'type', 'readonly']) {
      expect(KEYWORD_SET.has(kw)).toBe(true);
    }
  });

  it('does not classify banned identifiers as keywords', () => {
    for (const id of ['any', 'enum', 'namespace', 'infer']) {
      expect(KEYWORD_SET.has(id)).toBe(false);
      expect(BANNED_IDENTIFIER_SET.has(id)).toBe(true);
    }
  });

  it('isKeyword narrows token kinds', () => {
    expect(isKeyword('const')).toBe(true);
    expect(isKeyword('identifier')).toBe(false);
    expect(isKeyword('+')).toBe(false);
  });
});

describe('discriminated unions are well-formed', () => {
  it('Token shape', () => {
    const t: Token = {
      kind: 'const',
      value: 'const',
      span: SYNTHETIC_SPAN,
      precededByLineBreak: false,
    };
    expect(t.kind).toBe('const');
  });

  it('Diagnostic shape', () => {
    const d: Diagnostic = {
      code: 'SJS-E001',
      severity: 'error',
      message: "Cannot assign 'null' to non-nullable type 'string'.",
      span: SYNTHETIC_SPAN,
    };
    expect(d.code).toBe('SJS-E001');
  });

  it('AST: a minimal program type-checks', () => {
    const prog: Program = { kind: 'Program', body: [], span: SYNTHETIC_SPAN };
    expectTypeOf(prog.body).toEqualTypeOf<readonly Statement[]>();
    expect(prog.kind).toBe('Program');
  });

  it('Expression union members narrow on kind', () => {
    const expr: Expression = {
      kind: 'NumberLiteral',
      value: 42,
      raw: '42',
      span: SYNTHETIC_SPAN,
    };
    if (expr.kind === 'NumberLiteral') {
      expect(expr.value).toBe(42);
    }
  });

  it('semantic Type vs syntactic TypeNode are distinct', () => {
    const sem: Type = { kind: 'nullable', inner: { kind: 'string' } };
    const syn: TypeNode = {
      kind: 'NullableTypeNode',
      inner: { kind: 'PrimitiveTypeNode', name: 'string', span: SYNTHETIC_SPAN },
      span: SYNTHETIC_SPAN,
    };
    expect(sem.kind).toBe('nullable');
    expect(syn.kind).toBe('NullableTypeNode');
  });
});
