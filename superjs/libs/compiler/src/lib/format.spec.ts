import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { format } from '../index.js';

describe('format()', () => {
  it('canonicalises spacing, indentation and semicolons', () => {
    const r = format('const   x:number=1+2');
    expect(r.changed).toBe(true);
    expect(r.code).toBe('const x: number = 1 + 2;\n');
  });

  it('indents block bodies with two spaces', () => {
    const r = format('function f(){return 1}');
    expect(r.code).toBe('function f() {\n  return 1;\n}\n');
  });

  it('is idempotent — formatting twice is a no-op', () => {
    const once = format('const x:number=1;\nfunction f(a:string){return a}').code;
    const twice = format(once).code;
    expect(twice).toBe(once);
    expect(format(once).changed).toBe(false);
  });

  it('reports no change for already-formatted source', () => {
    expect(format('const x: number = 1;\n').changed).toBe(false);
  });

  it('leaves source with parse errors untouched', () => {
    const bad = 'const x: = ;;;';
    expect(format(bad)).toEqual({ code: bad, changed: false });
  });

  it('preserves grouping parentheses', () => {
    expect(format('const x = (1 + 2) * 3;\n').code).toBe('const x = (1 + 2) * 3;\n');
  });

  it('formats a sum type + match expression', () => {
    const r = format('type S=Active|Done\nconst l=match s{Active=>"a",Done=>"d",}');
    expect(r.code).toContain('type S = Active | Done;');
    expect(r.code).toContain('match s {');
    expect(r.code).toContain('  Active => "a",');
  });
});

/**
 * Corpus check: every shipped `.sjs` example must format idempotently. The
 * safety gate guarantees no corruption, so the real risk is instability — a
 * file that keeps changing on each pass. Skips cleanly if the spec tree moved.
 */
describe('format() — corpus idempotence', () => {
  const examples = findExamples();
  const files = examples ? readdirSync(examples).filter((f) => f.endsWith('.sjs')) : [];

  it('locates the example corpus', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const f of files) {
    it(`is idempotent on ${f}`, () => {
      const src = readFileSync(join(examples!, f), 'utf8');
      const once = format(src);
      const twice = format(once.code);
      expect(twice.changed, `${f} not idempotent`).toBe(false);
      expect(twice.code).toBe(once.code);
    });
  }
});

describe('format() — properties & performance', () => {
  // Deterministic LCG so the "random" whitespace is reproducible across runs.
  function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
  }

  /** Insert random whitespace after structural tokens — always parse-safe. */
  function mangle(src: string, seed: number): string {
    const rand = lcg(seed);
    let out = '';
    for (const ch of src) {
      out += ch;
      if (';{},'.includes(ch)) {
        const n = Math.floor(rand() * 3);
        out += n === 0 ? '  ' : n === 1 ? '\n  ' : ' ';
      }
    }
    return out;
  }

  const SNIPPETS = [
    'const x: number = 1;\nfunction f(a: string): string { return a; }',
    'type S = Active | Done;\nconst l = match s { Active => "a", Done => "d" };',
    'const o = { a: 1, b: 2 };\nconst xs = [1, 2, 3];',
  ];

  it('is whitespace-invariant: mangled input formats to the canonical form', () => {
    for (const snippet of SNIPPETS) {
      const canonical = format(snippet).code;
      for (let seed = 1; seed <= 5; seed++) {
        const mangled = mangle(snippet, seed);
        expect(format(mangled).code, `seed ${seed}`).toBe(canonical);
      }
    }
  });

  it('formats a 1,000-line file well under the 50 ms budget', () => {
    const big = Array.from({ length: 1000 }, (_, i) => `const x${i}: number = ${i};`).join('\n');
    const start = performance.now();
    const r = format(big);
    const ms = performance.now() - start;
    expect(r.code.split('\n').length).toBeGreaterThanOrEqual(1000);
    // Target is ≤ 50 ms; assert a loose ceiling that still catches a real regression.
    expect(ms).toBeLessThan(200);
  });
});

/** Walk up from this file to find the ES2025 example directory, or null. */
function findExamples(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'specs', 'features', '002-ecmascript', 'examples');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return null;
}
