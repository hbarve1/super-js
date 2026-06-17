import { describe, it, expect } from 'vitest';
import {
  compile, transform, Compiler,
  parseTypeDecl, emitTypeDecl,
  configHash, apiHash, fileHash, cacheKey, COMPILER_VERSION,
  openFile, typeAt, symbolAt, diagnosticsFor, configureSession,
} from '../index.js';

/** Deep-clone an AST node dropping positional fields, for structural equality. */
function stripSpans(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripSpans);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'span' || k === 'loc') continue;
      out[k] = stripSpans(v);
    }
    return out;
  }
  return node;
}

describe('compile()', () => {
  it('compiles sources to JS outputs keyed by .js filename', async () => {
    const r = await compile([{ filename: 'a.sjs', source: 'const x: number = 1 + 2;' }]);
    expect([...r.outputs.keys()]).toEqual(['a.js']);
    expect(r.outputs.get('a.js')!.code).toContain('const x = 1 + 2;');
    expect(r.diagnostics).toEqual([]);
  });

  it('aggregates diagnostics across files', async () => {
    const r = await compile([
      { filename: 'ok.sjs', source: 'const a = 1;' },
      { filename: 'bad.sjs', source: 'const b: string = null;' },
    ]);
    expect(r.outputs.size).toBe(2);
    expect(r.diagnostics.some((d) => d.code === 'SJS-E001')).toBe(true);
  });

  it('emits a source map alongside code', async () => {
    const r = await compile([{ filename: 'm.sjs', source: 'const y = 2;' }]);
    const out = r.outputs.get('m.js')!;
    expect(out.map.version).toBe(3);
    expect(out.map.sources).toEqual(['m.sjs']);
  });

  it('resolves an imported function type across files (misuse is caught)', async () => {
    const r = await compile([
      { filename: 'math.sjs', source: 'export function double(n: number): number { return n * 2; }' },
      { filename: 'app.sjs', source: 'import { double } from "./math";\nconst x: string = double(2);' },
    ]);
    // double()'s return type flowed in: number assigned to string → mismatch.
    expect(r.diagnostics.some((d) => d.code === 'SJS-E002')).toBe(true);
  });

  it('does not flag correct use of an imported function', async () => {
    const r = await compile([
      { filename: 'math.sjs', source: 'export function double(n: number): number { return n * 2; }' },
      { filename: 'app.sjs', source: 'import { double } from "./math";\nconst x: number = double(2);' },
    ]);
    expect(r.diagnostics).toEqual([]);
  });

  it('resolves an imported type alias across files', async () => {
    const r = await compile([
      { filename: 'types.sjs', source: 'export type Id = string;' },
      { filename: 'app.sjs', source: 'import { Id } from "./types";\nconst x: Id = 5;' },
    ]);
    expect(r.diagnostics.some((d) => d.code === 'SJS-E002')).toBe(true);
  });

  it('resolves imports regardless of source order', async () => {
    const r = await compile([
      { filename: 'app.sjs', source: 'import { double } from "./math";\nconst x: number = double(2);' },
      { filename: 'math.sjs', source: 'export function double(n: number): number { return n * 2; }' },
    ]);
    expect(r.diagnostics).toEqual([]);
  });

  it('leaves an unresolvable import as dynamic (no spurious error)', async () => {
    const r = await compile([
      { filename: 'app.sjs', source: 'import { Thing } from "./missing";\nconst x: number = 1;' },
    ]);
    expect(r.diagnostics).toEqual([]);
  });

  it('does not hang or crash on an import cycle', async () => {
    const r = await compile([
      { filename: 'a.sjs', source: 'import { B } from "./b";\nexport type A = string;' },
      { filename: 'b.sjs', source: 'import { A } from "./a";\nexport type B = number;' },
    ]);
    expect(r.outputs.size).toBe(2);
  });

  it('resolves a bare specifier through config paths + the readFile seam', async () => {
    const disk: Record<string, string> = {
      '/proj/node_modules/@superjs/types/widget/index.d.sjs': 'export type Widget = { id: string; };',
    };
    const r = await compile(
      [{ filename: '/proj/app.sjs', source: 'import { Widget } from "widget";\nconst w: Widget = 5;' }],
      {
        paths: { widget: ['node_modules/@superjs/types/widget'] },
        rootDir: '/proj',
        readFile: (p) => disk[p],
      },
    );
    // Widget resolved to an object type → number `5` is a mismatch.
    expect(r.diagnostics.some((d) => d.code === 'SJS-E002')).toBe(true);
    // The off-session .d.sjs dependency is analysed for types but never emitted.
    expect([...r.outputs.keys()]).toEqual(['/proj/app.js']);
  });

  it('leaves a bare specifier without a paths entry as dynamic', async () => {
    const r = await compile(
      [{ filename: '/proj/app.sjs', source: 'import { Widget } from "widget";\nconst w: Widget = 5;' }],
      { rootDir: '/proj', readFile: () => undefined },
    );
    expect(r.diagnostics).toEqual([]);
  });
});

describe('transform() — single-file async', () => {
  it('returns code, map and diagnostics', async () => {
    const r = await transform('function id(x: number): number { return x; }', 'id.sjs');
    expect(r.code).toContain('function id(x) {');
    expect(r.map.version).toBe(3);
    expect(r.diagnostics).toEqual([]);
  });

  it('surfaces checker diagnostics for a bad single file', async () => {
    const r = await transform('const n: string = null;', 'n.sjs');
    expect(r.diagnostics.some((d) => d.code === 'SJS-E001')).toBe(true);
  });

  it('sum-type construction lowers to a tagged object', async () => {
    const src = 'type R = Ok(number) | Err(string);\nconst r = Ok(7);';
    const r = await transform(src, 'r.sjs');
    expect(r.code).toContain('{ _tag: "Ok", _0: 7 }');
  });
});

describe('LSP queries (typeAt / symbolAt / diagnosticsFor)', () => {
  it('typeAt resolves the type at a literal position', () => {
    configureSession();
    openFile('t.sjs', 'const x = 42;');
    const t = typeAt('t.sjs', 1, 10); // the `42`
    expect(t).not.toBeNull();
    expect(t!.kind).toBe('literal');
  });

  it('symbolAt resolves a use to its declaration', () => {
    configureSession();
    openFile('s.sjs', 'const foo = 1;\nfoo;');
    const sym = symbolAt('s.sjs', 2, 0);
    expect(sym).not.toBeNull();
    expect(sym!.name).toBe('foo');
    expect(sym!.kind).toBe('const');
    expect(sym!.declaration!.start.line).toBe(1);
  });

  it('diagnosticsFor returns cached diagnostics for an open file', () => {
    configureSession();
    openFile('d.sjs', 'const z: string = null;');
    expect(diagnosticsFor('d.sjs').some((x) => x.code === 'SJS-E001')).toBe(true);
  });

  it('returns null for unopened files', () => {
    configureSession();
    expect(typeAt('missing.sjs', 1, 0)).toBeNull();
    expect(symbolAt('missing.sjs', 1, 0)).toBeNull();
  });
});

describe('parseTypeDecl / emitTypeDecl round-trip', () => {
  const cases = [
    'number',
    'string?',
    'number | string',
    'Array<number>',
    'Map<Array<number>, string>',
    'Array<Map<string, number>>', // nested generic closing with `>>`
    '[number, string]',
    '(a: number, b: string) => boolean',
    '{ x: number; y: string }',
    'Ok(number) | Err(string)',
    'Some(number) | None',
  ];
  for (const input of cases) {
    it(`round-trips \`${input}\``, () => {
      const ast = parseTypeDecl(input);
      const printed = emitTypeDecl(ast);
      const reparsed = parseTypeDecl(printed);
      expect(stripSpans(reparsed)).toEqual(stripSpans(ast));
    });
  }

  it('throws on malformed type input', () => {
    expect(() => parseTypeDecl('number |')).toThrow();
  });
});

describe('incremental cache', () => {
  it('returns the cached analysis for unchanged content', () => {
    const c = new Compiler();
    const a = c.setFile('a.sjs', 'const x = 1;');
    const b = c.setFile('a.sjs', 'const x = 1;');
    expect(a).toBe(b); // same object — cache hit
  });

  it('recomputes when content changes', () => {
    const c = new Compiler();
    const a = c.setFile('a.sjs', 'const x = 1;');
    const b = c.setFile('a.sjs', 'const x = 2;');
    expect(a).not.toBe(b);
  });
});

describe('persistent cache (CacheStore)', () => {
  function memStore() {
    const m = new Map<string, import('../index.js').CacheEntry>();
    let hits = 0, misses = 0;
    return {
      get(k: string) { const e = m.get(k); if (e) hits++; else misses++; return e; },
      set(k: string, e: import('../index.js').CacheEntry) { m.set(k, e); },
      stats: () => ({ hits, misses, size: m.size }),
    };
  }

  it('populates on a cold compile and reuses on a warm one', async () => {
    const store = memStore();
    const src = 'const x: number = 1 + 2;';
    const a = await compile([{ filename: 'a.sjs', source: src }], {}, store);
    expect(store.stats()).toMatchObject({ misses: 1, size: 1 });
    const b = await compile([{ filename: 'a.sjs', source: src }], {}, store);
    expect(store.stats().hits).toBe(1);
    // Warm output is identical to cold.
    expect(b.outputs.get('a.js')!.code).toBe(a.outputs.get('a.js')!.code);
  });

  it('misses when the source changes', async () => {
    const store = memStore();
    await compile([{ filename: 'a.sjs', source: 'const x = 1;' }], {}, store);
    await compile([{ filename: 'a.sjs', source: 'const x = 2;' }], {}, store);
    expect(store.stats()).toMatchObject({ misses: 2, size: 2 });
  });

  it('misses when the config changes (config-hash in the key)', async () => {
    const store = memStore();
    const src = 'const x = 1;';
    await compile([{ filename: 'a.sjs', source: src }], { sourceMap: 'none' }, store);
    await compile([{ filename: 'a.sjs', source: src }], { sourceMap: 'inline' }, store);
    expect(store.stats().misses).toBe(2);
  });

  it('preserves diagnostics through the cache', async () => {
    const store = memStore();
    const src = 'const x: string = null;';
    await compile([{ filename: 'bad.sjs', source: src }], {}, store);
    const warm = await compile([{ filename: 'bad.sjs', source: src }], {}, store);
    expect(warm.diagnostics.some((d) => d.code === 'SJS-E001')).toBe(true);
  });
});

describe('hashing (cache key M3/M4)', () => {
  it('configHash is stable and order-independent', () => {
    expect(configHash({ variants: 'default', strict: false }))
      .toBe(configHash({ strict: false, variants: 'default' }));
  });

  it('configHash changes when an output-affecting knob changes', () => {
    expect(configHash({ variants: 'default' })).not.toBe(configHash({ variants: 'classes' }));
  });

  it('apiHash tracks the exported surface, not internals', () => {
    const a = apiHash(['export var:x', 'export FunctionDecl:f']);
    const b = apiHash(['export FunctionDecl:f', 'export var:x']); // reordered
    expect(a).toBe(b);
    expect(a).not.toBe(apiHash(['export var:x']));
  });

  it('cacheKey embeds file hash, version and config hash', () => {
    const key = cacheKey('const x = 1;', configHash({}));
    expect(key).toBe(`${fileHash('const x = 1;')}:${COMPILER_VERSION}:${configHash({})}`);
  });
});

describe('determinism', () => {
  it('two compilations are byte-identical', async () => {
    const src = 'type R = Ok(number) | Err(string);\nconst r = Ok(1);\nconst v = match r { Ok(x) => x, Err(e) => 0, };';
    const a = await compile([{ filename: 's.sjs', source: src }]);
    const b = await compile([{ filename: 's.sjs', source: src }]);
    expect(a.outputs.get('s.js')!.code).toBe(b.outputs.get('s.js')!.code);
    expect(JSON.stringify(a.outputs.get('s.js')!.map)).toBe(JSON.stringify(b.outputs.get('s.js')!.map));
  });
});
