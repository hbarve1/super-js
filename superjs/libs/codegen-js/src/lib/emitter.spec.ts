import { describe, it, expect } from 'vitest';
import { lowerSource } from '@superjs/ir';
import { generate } from '../index.js';

/** Compile SJS source to JS code text. */
function js(src: string): string {
  return generate(lowerSource(src), { inlineMapUrl: false }).code;
}
/** Compile + evaluate, returning the value of `globalThis.__r` set by the snippet. */
function run(src: string): unknown {
  const code = js(src);
  const fn = new Function(`${code}; return typeof __r !== "undefined" ? __r : undefined;`);
  return fn();
}

describe('basic emission', () => {
  it('emits a const with erased type', () => {
    const out = js('const x: number = 1 + 2;');
    expect(out).toContain('const x = 1 + 2;');
    expect(out).not.toContain('number');
  });
  it('emits a function declaration', () => {
    expect(js('function add(a: number, b: number): number { return a + b; }')).toContain('function add(a, b) {');
  });
  it('drops object types and type aliases entirely', () => {
    expect(js('type I { x: number; }\ntype A = string;\nconst y = 1;').trim()).toBe('const y = 1;');
  });
});

describe('expression precedence', () => {
  it('preserves a + b * c without parens', () => {
    expect(js('const x = a + b * c;')).toContain('a + b * c');
  });
  it('parenthesises (a + b) * c', () => {
    expect(js('const x = (a + b) * c;')).toContain('(a + b) * c');
  });
  it('right-associative ** ', () => {
    expect(js('const x = a ** b ** c;')).toContain('a ** b ** c');
  });
  it('emits ternary and arrow', () => {
    expect(js('const f = (x: number) => x > 0 ? 1 : -1;')).toContain('(x) => x > 0 ? 1 : -1');
  });
});

describe('sum types (052) — runtime fidelity', () => {
  const PRE = 'type Result<T, E> = Ok(T) | Err(E);\ntype Opt = Some(number) | None;\n';
  it('emits a tuple variant as a tagged object', () => {
    expect(js(PRE + 'const r = Ok(42);')).toContain('{ _tag: "Ok", _0: 42 }');
  });
  it('emits a unit variant as { _tag } only', () => {
    expect(js(PRE + 'const n = None;')).toContain('{ _tag: "None" }');
  });
  it('constructed value evaluates to the spec shape', () => {
    expect(run(PRE + 'const __r = Ok(7);')).toEqual({ _tag: 'Ok', _0: 7 });
  });
});

describe('match (053) — runtime fidelity', () => {
  const PRE = 'type Result<T, E> = Ok(T) | Err(E);\n';
  it('evaluates an exhaustive match', () => {
    expect(run(PRE + 'const r = Ok(21); const __r = match r { Ok(v) => v * 2, Err(e) => -1, };')).toBe(42);
  });
  it('evaluates the matching arm among several', () => {
    expect(run(PRE + 'const r = Err("bad"); const __r = match r { Ok(v) => "ok", Err(e) => e, };')).toBe('bad');
  });
  it('record-variant destructuring evaluates', () => {
    expect(run('type S = Rect({ w: number, h: number }) | Dot;\nconst s = Rect({ w: 3, h: 4 });\nconst __r = match s { Rect({ w, h }) => w * h, Dot => 0, };')).toBe(12);
  });
  it('default arm omits the throw and evaluates', () => {
    const code = js(PRE + 'const r = Ok(1); const v = match r { Ok(x) => x, default => 0, };');
    expect(code).not.toContain('Non-exhaustive');
  });
});

describe('control flow + classes', () => {
  it('emits a for loop and runs it', () => {
    expect(run('let __r = 0; for (let i = 0; i < 5; i++) { __r += i; }')).toBe(10);
  });
  it('emits a class with a constructor parameter property', () => {
    const out = js('class P { constructor(public x: number) {} }');
    expect(out).toContain('this.x = x;');
  });
  it('class parameter property runs', () => {
    expect(run('class P { constructor(public x: number) {} }\nconst __r = new P(9).x;')).toBe(9);
  });
});

describe('templates, optional chaining, nullish', () => {
  it('emits a template literal', () => {
    expect(js('const s = `a${x}b`;')).toContain('`a${x}b`');
  });
  it('emits optional chaining and nullish', () => {
    const out = js('const v = a?.b ?? c;');
    expect(out).toContain('a?.b ?? c');
  });
});

describe('source maps (054)', () => {
  it('produces a v3 map with one source and non-empty mappings', () => {
    const { map } = generate(lowerSource('const x = 1;\nconst y = 2;'), { file: 'out.js', source: 'in.sjs' });
    expect(map.version).toBe(3);
    expect(map.file).toBe('out.js');
    expect(map.sources).toEqual(['in.sjs']);
    expect(map.mappings.length).toBeGreaterThan(0);
    expect(map.mappings).toContain(';'); // multiple generated lines
  });
  it('appends a sourceMappingURL footer by default', () => {
    expect(generate(lowerSource('const x = 1;'), { file: 'out.js' }).code).toContain('//# sourceMappingURL=out.js.map');
  });
  it('omits sourcesContent (fetched on demand)', () => {
    expect('sourcesContent' in generate(lowerSource('const x = 1;')).map).toBe(false);
  });
});

describe('determinism (054)', () => {
  it('two compilations are byte-identical (code + map)', () => {
    const src = 'type R = Ok(number) | Err(string);\nconst r = Ok(1);\nconst v = match r { Ok(x) => x, Err(e) => 0, };';
    const a = generate(lowerSource(src), { file: 'o.js', source: 's.sjs' });
    const b = generate(lowerSource(src), { file: 'o.js', source: 's.sjs' });
    expect(a.code).toBe(b.code);
    expect(JSON.stringify(a.map)).toBe(JSON.stringify(b.map));
  });
});
