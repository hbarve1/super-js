import { describe, it, expect } from 'vitest';
import {
  SjsPanic,
  panic,
  assert,
  todo,
  unreachable,
  attachIteratorSymbol,
  inspect,
} from '../index.js';

describe('panic & assertions', () => {
  it('panic throws SjsPanic with the message', () => {
    expect(() => panic('boom')).toThrowError(SjsPanic);
    expect(() => panic('boom')).toThrow('boom');
  });

  it('assert throws only when falsy and narrows', () => {
    expect(() => assert(true)).not.toThrow();
    expect(() => assert(0, 'must be set')).toThrow('must be set');
    const v: number | null = 1 as number | null;
    assert(v !== null);
    expect(v + 1).toBe(2); // narrowed to number
  });

  it('todo and unreachable always throw', () => {
    expect(() => todo()).toThrow(/TODO/);
    expect(() => unreachable()).toThrow(/unreachable/);
    expect(() => unreachable({ _tag: 'Ghost' })).toThrow(/Ghost/);
  });
});

describe('attachIteratorSymbol', () => {
  it('makes a next()-based iterator usable in for…of', () => {
    class Range {
      private cur: number;
      constructor(private end: number) {
        this.cur = 0;
      }
      next(): IteratorResult<number> {
        return this.cur < this.end
          ? { value: this.cur++, done: false }
          : { value: undefined, done: true };
      }
    }
    attachIteratorSymbol(Range);
    const out = [...(new Range(3) as unknown as Iterable<number>)];
    expect(out).toEqual([0, 1, 2]);
  });

  it('is idempotent', () => {
    class C {
      next(): IteratorResult<number> {
        return { value: undefined, done: true };
      }
    }
    attachIteratorSymbol(C);
    const proto = C.prototype as unknown as Record<symbol, unknown>;
    const first = proto[Symbol.iterator];
    attachIteratorSymbol(C);
    expect(proto[Symbol.iterator]).toBe(first);
  });
});

describe('inspect', () => {
  it('formats primitives', () => {
    expect(inspect('hi')).toBe('"hi"');
    expect(inspect(42)).toBe('42');
    expect(inspect(10n)).toBe('10n');
    expect(inspect(null)).toBe('null');
    expect(inspect(undefined)).toBe('undefined');
    expect(inspect(true)).toBe('true');
  });

  it('formats arrays and objects', () => {
    expect(inspect([1, 'a', true])).toBe('[1, "a", true]');
    expect(inspect({ a: 1, b: 'x' })).toBe('{ a: 1, b: "x" }');
    expect(inspect({})).toBe('{}');
  });

  it('renders sum-type variants in constructor form', () => {
    expect(inspect({ _tag: 'Ok', _0: 42 })).toBe('Ok(42)');
    expect(inspect({ _tag: 'Err', _0: 'boom' })).toBe('Err("boom")');
    expect(inspect({ _tag: 'None' })).toBe('None');
    expect(inspect({ _tag: 'Point', x: 1, y: 2 })).toBe('Point({ x: 1, y: 2 })');
  });

  it('formats Map and Set', () => {
    expect(inspect(new Map([['a', 1]]))).toBe('Map(1) { "a" => 1 }');
    expect(inspect(new Set([1, 2]))).toBe('Set(2) { 1, 2 }');
  });

  it('handles circular references', () => {
    const a: Record<string, unknown> = {};
    a['self'] = a;
    expect(inspect(a)).toBe('{ self: [Circular] }');
  });
});
