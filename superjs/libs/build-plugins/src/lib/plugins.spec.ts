import { describe, it, expect } from 'vitest';
import { transformSjs, vitePlugin, vitestPlugin, esbuildPlugin, jestTransform } from '../index.js';

const SRC = 'export const x: number = 1;\n';

describe('transformSjs', () => {
  it('compiles .sjs source to JS + map', async () => {
    const out = await transformSjs(SRC, 'a.sjs');
    expect(out.code).toContain('const x');
    expect(out.code).not.toContain(': number'); // type annotation stripped
    expect(out.map).toBeTruthy();
  });
});

describe('vitePlugin', () => {
  it('transforms a .sjs id and passes through others', async () => {
    const p = vitePlugin();
    expect(p.name).toBe('superjs');
    expect(p.enforce).toBe('pre');
    const r = await p.transform(SRC, '/proj/a.sjs');
    expect(r?.code).toContain('const x');
    expect(await p.transform('const y = 1;', '/proj/a.ts')).toBeNull();
  });

  it('vitestPlugin is the Vite plugin', () => {
    expect(vitestPlugin).toBe(vitePlugin);
  });
});

describe('esbuildPlugin', () => {
  it('registers an onLoad handler for .sjs', () => {
    const p = esbuildPlugin();
    expect(p.name).toBe('superjs');
    let filter: RegExp | undefined;
    p.setup({ onLoad: (opts) => { filter = opts.filter; } });
    expect(filter!.test('x.sjs')).toBe(true);
    expect(filter!.test('x.ts')).toBe(false);
  });
});

describe('jestTransform', () => {
  it('processAsync compiles a .sjs test file', async () => {
    const r = await jestTransform.processAsync(SRC, 'a.spec.sjs');
    expect(r.code).toContain('const x');
  });
});
