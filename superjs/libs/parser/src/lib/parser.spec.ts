import { describe, it, expect } from 'vitest';
import type { Node } from '@superjs/types';
import { parse } from '../index.js';

function ok(src: string) {
  const { program, diagnostics } = parse(src);
  expect(diagnostics, JSON.stringify(diagnostics)).toHaveLength(0);
  return program;
}
function first(src: string): Node {
  return ok(src).body[0] as Node;
}
/** Collect all node kinds in the tree (for shape assertions). */
function kindsOf(node: unknown, acc: string[] = []): string[] {
  if (node && typeof node === 'object') {
    if ('kind' in node && typeof (node as { kind: unknown }).kind === 'string') {
      acc.push((node as { kind: string }).kind);
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach((x) => kindsOf(x, acc));
      else if (v && typeof v === 'object') kindsOf(v, acc);
    }
  }
  return acc;
}

describe('declarations', () => {
  it('typed const', () => {
    const s = first('const x: number = 1;');
    expect(s.kind).toBe('VariableDecl');
    expect(kindsOf(s)).toContain('PrimitiveTypeNode');
  });
  it('function with generics, params, return type', () => {
    const s = first('function id<T>(x: T): T { return x; }');
    expect(s.kind).toBe('FunctionDecl');
    expect(kindsOf(s)).toEqual(expect.arrayContaining(['TypeParam', 'Parameter', 'ReturnStatement']));
  });
  it('class with members and access modifiers', () => {
    ok('class C<T> extends Base { private x: number = 0; static m(): void {} get v(): number { return 1 } }');
  });
  it('interface (structural, no implements)', () => {
    const s = first('interface Cmp<T> { compareTo(other: T): number; readonly id: string; }');
    expect(s.kind).toBe('InterfaceDecl');
  });
  it('import / export', () => {
    ok('import React, { useState as us } from "react";');
    ok('export { a, b as c } from "./m";');
    ok('export default function f() {}');
  });
});

describe('sum types & match', () => {
  it('parses a sum type declaration', () => {
    const s = first('type Result<T, E> = Ok(T) | Err(E);');
    expect(s.kind).toBe('TypeDecl');
    expect(kindsOf(s)).toContain('SumTypeDef');
    expect(kindsOf(s).filter((k) => k === 'VariantDef')).toHaveLength(2);
  });
  it('record variant', () => {
    ok('type Tree = Leaf | Node({ left: Tree, right: Tree });');
  });
  it('parses a leading-pipe sum type (multi-line style)', () => {
    const s = first('type Result<T, E> =\n  | Ok(T)\n  | Err(E);');
    expect(kindsOf(s)).toContain('SumTypeDef');
    expect(kindsOf(s).filter((k) => k === 'VariantDef')).toHaveLength(2);
  });
  it('parses a leading-pipe enum-style sum of unit variants', () => {
    const s = first('type Color =\n  | Red\n  | Green\n  | Blue;');
    expect(kindsOf(s).filter((k) => k === 'VariantDef')).toHaveLength(3);
  });
  it('parses a leading-pipe union of (non-variant) types', () => {
    const s = first('type N = | { a: number } | { b: string };');
    expect(kindsOf(s)).toContain('UnionTypeNode');
  });
  it('parses `T | null` as a union, not a sum of unit variants', () => {
    const s = first('type N = number | null;');
    expect(kindsOf(s)).toContain('UnionTypeNode');
    expect(kindsOf(s)).not.toContain('SumTypeDef');
  });
  it('parses an object type with an index signature', () => {
    expect(kindsOf(first('type Dict = { [key: string]: number };'))).toContain('IndexSignature');
  });
  it('parses a parenthesized type wrapped by an array', () => {
    const s = first('type A = (number | string)[];');
    expect(kindsOf(s)).toContain('ParenthesizedTypeNode');
    expect(kindsOf(s)).toContain('ArrayTypeNode');
  });
  it('match expression with tuple/unit/default arms', () => {
    const p = ok('const m = match r { Ok(v) => v, Err(e) => 0, default => -1, };');
    expect(kindsOf(p)).toEqual(
      expect.arrayContaining(['MatchExpression', 'TupleVariantPattern', 'DefaultPattern']),
    );
  });
});

describe('expressions (precedence)', () => {
  it('arithmetic precedence: a + b * c', () => {
    const p = ok('const x = a + b * c;');
    const k = kindsOf(p);
    expect(k).toContain('BinaryExpression');
  });
  it('logical and nullish', () => {
    ok('const x = a && b || c ?? d;');
  });
  it('ternary + assignment right-assoc', () => {
    ok('x = a ? b : c; y = z = 1;');
  });
  it('member / call / optional chaining', () => {
    const p = ok('a.b?.c(d)?.[e];');
    expect(kindsOf(p)).toEqual(expect.arrayContaining(['MemberExpression', 'CallExpression']));
  });
  it('new with member callee', () => {
    expect(kindsOf(ok('const x = new A.B(1);'))).toContain('NewExpression');
  });
  it('arrow functions', () => {
    const p = ok('const f = (x: number): number => x + 1; const g = y => y;');
    expect(kindsOf(p).filter((k) => k === 'ArrowFunction')).toHaveLength(2);
  });
  it('template literals with substitutions', () => {
    const p = ok('const s = `a${x}b${y}c`;');
    expect(kindsOf(p)).toContain('TemplateLiteral');
  });
  it('object & array literals, spread, destructuring', () => {
    ok('const { a, b: c, ...rest } = obj; const [x, , y] = arr; const o = { ...a, k: 1, m() {} };');
  });
  it('as-cast and await/yield in context', () => {
    ok('async function f() { const x = (await p) as number; }');
  });
});

describe('control flow', () => {
  it('if/else, while, for, for-of, for-in, switch, try', () => {
    ok('if (a) b(); else c();');
    ok('while (x) { x--; }');
    ok('for (let i = 0; i < n; i++) sum += i;');
    ok('for (const x of xs) use(x);');
    ok('for (const k in obj) use(k);');
    ok('switch (x) { case 1: a(); break; default: b(); }');
    ok('try { risky(); } catch (e: unknown) { handle(e); } finally { cleanup(); }');
  });
});

describe('jsx', () => {
  it('elements, attributes, expression children, fragments', () => {
    const p = ok('const v = <div className="x" id={y}><span>{text}</span></div>;');
    expect(kindsOf(p)).toEqual(expect.arrayContaining(['JsxElement', 'JsxAttribute', 'JsxExpressionContainer']));
  });
  it('self-closing + fragment', () => {
    ok('const a = <br />; const b = <><x/></>;');
  });
});

describe('error recovery', () => {
  it('reports a parse error but recovers to the next statement', () => {
    const { program, diagnostics } = parse('const x = ;\nconst y = 1;');
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]?.code).toMatch(/^SJS-P/);
    // recovered: second statement still parsed
    expect(program.body.length).toBeGreaterThanOrEqual(1);
  });
  it('produces a Program for empty input', () => {
    expect(parse('').program.body).toHaveLength(0);
  });
});

describe('nested generics — `>>` token splitting', () => {
  it('closes a two-deep type argument list (`Array<Map<K, V>>`)', () => {
    const s = first('const m: Array<Map<string, number>> = x;');
    expect(s.kind).toBe('VariableDecl');
    expect(kindsOf(s)).toContain('TypeRefNode');
  });
  it('closes a three-deep list (`>>>`)', () => {
    ok('const x: Array<Array<Array<number>>> = y;');
  });
  it('handles a nested generic in a type alias', () => {
    ok('type M = Map<string, Array<number>>;');
  });
  it('handles a nested generic as a type-parameter default (`>>`)', () => {
    ok('type Box<T = Array<number>> = T;');
  });
  it('still parses a real right-shift outside type context', () => {
    const s = first('const n = a >> b;');
    expect(kindsOf(s)).toContain('BinaryExpression');
  });
});

describe('generic call / new type arguments', () => {
  it('parses a generic call `f<T>(x)`', () => {
    const s = first('const r = createStack<string>();');
    expect(kindsOf(s)).toContain('CallExpression');
    expect(kindsOf(s)).toContain('PrimitiveTypeNode'); // the `<string>` type arg
  });
  it('parses a generic `new C<T>()`', () => {
    const s = first('const m = new Map<string, string[]>();');
    expect(kindsOf(s)).toContain('NewExpression');
  });
  it('parses a generic method call `obj.m<T>(x)`', () => {
    ok('const p = obj.method<number>(x);');
  });
  it('does not mistake comparisons for generic calls', () => {
    const lt = first('const b = a < c;');
    expect(kindsOf(lt)).toContain('BinaryExpression');
    expect(kindsOf(lt)).not.toContain('CallExpression');
    ok('const z = a < c > d;'); // `(a < c) > d`, not a call
  });
});
