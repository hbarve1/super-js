import { describe, it, expect } from 'vitest';
import { check } from '../index.js';

/** Codes of all diagnostics for `src`. */
function codes(src: string): string[] {
  return check(src).diagnostics.map((d) => d.code);
}
/** Assert clean (no diagnostics). */
function clean(src: string): void {
  const ds = check(src).diagnostics;
  expect(ds, JSON.stringify(ds, null, 2)).toHaveLength(0);
}
/** True if any diagnostic has `code`. */
function has(src: string, code: string): boolean {
  return codes(src).includes(code);
}

describe('null safety (E001 / E003)', () => {
  it('rejects null assigned to a non-nullable type', () => {
    expect(has('let x: string = null;', 'SJS-E001')).toBe(true);
  });
  it('allows null assigned to a nullable type', () => {
    clean('let x: string? = null;');
  });
  it('rejects returning null from a non-nullable return type', () => {
    expect(has('function f(): string { return null; }', 'SJS-E001')).toBe(true);
  });
  it('flags property access on a nullable value (E003)', () => {
    expect(has('function f(n: string?): number { return n.length; }', 'SJS-E003')).toBe(true);
  });
  it('narrows after a null guard — no E003', () => {
    clean('function f(n: string?): number { if (n !== null) { return n.length; } return 0; }');
  });
  it('narrows via early-return guard', () => {
    clean('function f(n: string?): number { if (n === null) return 0; return n.length; }');
  });
  it('optional chaining suppresses E003', () => {
    expect(has('function f(n: string?): number { return n?.length; }', 'SJS-E003')).toBe(false);
  });
});

describe('assignability (E002)', () => {
  it('rejects string assigned to number', () => {
    expect(has('let x: number = "hi";', 'SJS-E002')).toBe(true);
  });
  it('accepts literal widening to base primitive', () => {
    clean('let x: number = 42;');
  });
  it('accepts structural object assignment', () => {
    clean('interface P { x: number; } const p: P = { x: 1 };');
  });
  it('rejects structurally incompatible object', () => {
    expect(has('interface P { x: number; } const p: P = { x: "no" };', 'SJS-E002')).toBe(true);
  });
  it('rejects missing required property', () => {
    expect(has('interface P { x: number; y: number; } const p: P = { x: 1 };', 'SJS-E002')).toBe(true);
  });
});

describe('inference & widening', () => {
  it('const keeps literal type, narrowing assignment to base ok', () => {
    clean('const x = 42; const y: number = x;');
  });
  it('let widens — number reassignable', () => {
    clean('let x = 1; x = 2;');
  });
});

describe('sum types & match (E007 / W003 / E008)', () => {
  const RESULT = 'type Result<T, E> = Ok(T) | Err(E);\n';
  const TRAFFIC = 'type Traffic = Red | Yellow | Green;\n';

  it('checks an exhaustive match clean', () => {
    clean(RESULT + 'function f(r: Result<number, string>): number { return match r { Ok(v) => v, Err(e) => 0, }; }');
  });
  it('flags a non-exhaustive match (E007)', () => {
    expect(has(TRAFFIC + 'function f(t: Traffic): string { return match t { Red => "s", Green => "g", }; }', 'SJS-E007')).toBe(true);
  });
  it('default arm suppresses exhaustiveness', () => {
    clean(TRAFFIC + 'function f(t: Traffic): string { return match t { Red => "s", default => "x", }; }');
  });
  it('flags an unreachable duplicate arm (W003)', () => {
    expect(has(TRAFFIC + 'function f(t: Traffic): string { return match t { Red => "a", Red => "b", Yellow => "y", Green => "g", }; }', 'SJS-W003')).toBe(true);
  });
  it('binds a tuple-variant payload in the arm', () => {
    clean(RESULT + 'function f(r: Result<number, string>): number { return match r { Ok(v) => v, Err(e) => 0, }; }');
  });
  it('flags ambiguous variant construction (E020)', () => {
    expect(has('type A = Ok(number) | Fail;\ntype B = Ok(string) | Done;\nconst x = Ok(1);', 'SJS-E020')).toBe(true);
  });
  it('disambiguates a variant by expected type — no E020', () => {
    expect(has('type A = Ok(number) | Fail;\ntype B = Ok(string) | Done;\nconst x: A = Ok(1);', 'SJS-E020')).toBe(false);
  });
});

describe('record-variant construction', () => {
  const SHAPE = 'type Shape = Rect({ w: number, h: number }) | Dot;\n';

  it('accepts a record variant built with a matching object literal', () => {
    clean(SHAPE + 'const s: Shape = Rect({ w: 3, h: 4 });');
  });
  it('flags a record-variant field type mismatch (E002)', () => {
    expect(has(SHAPE + 'const s: Shape = Rect({ w: "x", h: 4 });', 'SJS-E002')).toBe(true);
  });
  it('flags a missing record-variant field (E002)', () => {
    expect(has(SHAPE + 'const s: Shape = Rect({ w: 3 });', 'SJS-E002')).toBe(true);
  });
  it('round-trips construction then match destructuring', () => {
    clean(SHAPE + 'function area(s: Shape): number { return match s { Rect({ w, h }) => w * h, Dot => 0, }; }\nconst a: number = area(Rect({ w: 2, h: 5 }));');
  });
});

describe('call-argument expected-type propagation', () => {
  const OPT = 'type Opt<T> = Some(T) | None;\nfunction unwrap(o: Opt<number>, f: number): number { return match o { Some(v) => v, None => f, }; }\n';

  it('infers a generic variant argument from the parameter type', () => {
    clean(OPT + 'const r: number = unwrap(Some(40), 0) + unwrap(None, 2);');
  });
  it('still rejects a wrong-typed variant argument', () => {
    expect(has(OPT + 'const r: number = unwrap(Some("x"), 0);', 'SJS-E002')).toBe(true);
  });
  it('contextually types a bare arrow parameter from the callee signature', () => {
    clean('function apply(f: (n: number) => number, x: number): number { return f(x); }\nconst r: number = apply((n) => n + 1, 5);');
  });
});

describe('narrowing (typeof / truthiness)', () => {
  it('typeof narrows a union member', () => {
    clean('function f(v: string | number): string { if (typeof v === "number") { return v.toFixed(2); } return v; }');
  });
  it('truthiness narrows out null', () => {
    clean('function f(name: string?): string { if (name) { return name; } return "x"; }');
  });
});

describe('as assertions (E002)', () => {
  it('allows unknown → string', () => {
    clean('function f(x: unknown): string { return x as string; }');
  });
  it('rejects assertion between unrelated types', () => {
    expect(has('const n: number = 42; const a = n as string;', 'SJS-E002')).toBe(true);
  });
});

describe('dynamic escape hatch', () => {
  it('dynamic is assignable both ways', () => {
    clean('function f(x: dynamic): number { let n: number = x; return n; }');
  });
  it('unannotated params do not error in non-strict mode', () => {
    clean('function f(x) { return x; }');
  });
});

describe('lint (L003)', () => {
  it('flags == as L003', () => {
    expect(has('function f(a: number, b: number): boolean { return a == b; }', 'SJS-L003')).toBe(true);
  });
});

describe('robustness', () => {
  it('produces no diagnostics for empty input', () => {
    clean('');
  });
  it('handles recursive sum types', () => {
    clean('type Tree<T> = Leaf | Node({ value: T, left: Tree<T>?, right: Tree<T>? });\nconst t: Tree<number> = Leaf;');
  });
  it('checks logical ?? result type', () => {
    clean('function f(s: string?): string { return s ?? "default"; }');
  });
});
