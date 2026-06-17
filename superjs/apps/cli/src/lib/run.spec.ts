import { describe, it, expect } from 'vitest';
import { run, parseArgs } from './run.js';
import { VERSION } from './commands.js';
import type { IO } from './io.js';

/** In-memory IO: captures stdout/stderr, a virtual filesystem, and watchers. */
function makeIO(files: Record<string, string> = {}, cwd = '/work'): IO & {
  stdout: () => string; stderr: () => string; fs: Map<string, string>;
  fireChange: (path: string) => void;
} {
  const fs = new Map<string, string>(Object.entries(files));
  const watchers: { paths: readonly string[]; cb: (p: string) => void }[] = [];
  let outBuf = '', errBuf = '';
  return {
    out: (t) => { outBuf += t; },
    err: (t) => { errBuf += t; },
    readFile: (p) => { const v = fs.get(p); if (v === undefined) throw new Error(`ENOENT ${p}`); return v; },
    writeFile: (p, d) => { fs.set(p, d); },
    exists: (p) => fs.has(p),
    isDirectory: (p) => { const pre = `${p.replace(/\/+$/, '')}/`; return [...fs.keys()].some((k) => k.startsWith(pre)); },
    readDir: (p) => {
      const pre = `${p.replace(/\/+$/, '')}/`;
      const names = new Set<string>();
      for (const k of fs.keys()) if (k.startsWith(pre)) names.add(k.slice(pre.length).split('/')[0]!);
      return [...names];
    },
    cwd: () => cwd,
    watch: (paths, cb) => { watchers.push({ paths, cb }); return () => { /* noop */ }; },
    stdout: () => outBuf,
    stderr: () => errBuf,
    fs,
    fireChange: (path) => { for (const w of watchers) if (w.paths.includes(path)) w.cb(path); },
  };
}

describe('parseArgs', () => {
  it('splits command, positionals and flags', () => {
    const a = parseArgs(['check', 'a.sjs', 'b.sjs', '--format', 'json']);
    expect(a.command).toBe('check');
    expect(a.positionals).toEqual(['a.sjs', 'b.sjs']);
    expect(a.flags['format']).toBe('json');
  });
  it('supports --flag=value and boolean flags', () => {
    const a = parseArgs(['build', '--out-dir=lib', '--watch']);
    expect(a.flags['out-dir']).toBe('lib');
    expect(a.flags['watch']).toBe(true);
  });
});

describe('help & version', () => {
  it('prints help with no command', async () => {
    const io = makeIO();
    expect(await run([], io)).toBe(0);
    expect(io.stdout()).toContain('usage: superjs <command>');
  });
  it('prints the version', async () => {
    const io = makeIO();
    expect(await run(['--version'], io)).toBe(0);
    expect(io.stdout().trim()).toBe(VERSION);
  });
});

describe('explain', () => {
  it('describes a known code (normalises E001 → SJS-E001)', async () => {
    const io = makeIO();
    expect(await run(['explain', 'E001'], io)).toBe(0);
    expect(io.stdout()).toContain('SJS-E001');
    expect(io.stdout()).toContain('null-safety');
  });
  it('errors on an unknown code', async () => {
    const io = makeIO();
    expect(await run(['explain', 'ZZZ'], io)).toBe(1);
    expect(io.stderr()).toContain('unknown diagnostic code');
  });
  it('prints the full spec doc when reachable (found by walking up from cwd)', async () => {
    const io = makeIO({ '/work/proj/specs/error-codes/SJS-E001.md': '# SJS-E001 — Null safety\n\nLong-form write-up.' }, '/work/proj/src');
    expect(await run(['explain', 'E001'], io)).toBe(0);
    expect(io.stdout()).toContain('Long-form write-up.');
  });
});

describe('check', () => {
  it('reports no errors for a clean file', async () => {
    const io = makeIO({ '/work/a.sjs': 'const x: number = 1 + 2;' });
    expect(await run(['check', 'a.sjs'], io)).toBe(0);
    expect(io.stdout()).toContain('No errors.');
  });
  it('reports and fails on a type error', async () => {
    const io = makeIO({ '/work/bad.sjs': 'const b: string = null;' });
    expect(await run(['check', 'bad.sjs'], io)).toBe(1);
    expect(io.stdout()).toContain('SJS-E001');
  });
  it('emits JSON with --format json', async () => {
    const io = makeIO({ '/work/bad.sjs': 'const b: string = null;' });
    await run(['check', 'bad.sjs', '--format', 'json'], io);
    const parsed = JSON.parse(io.stdout());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].code).toBe('SJS-E001');
  });
  it('fails when a file is missing', async () => {
    const io = makeIO();
    expect(await run(['check', 'nope.sjs'], io)).toBe(1);
    expect(io.stderr()).toContain("cannot find file 'nope.sjs'");
  });
});

describe('build', () => {
  it('writes compiled JS + external map', async () => {
    const io = makeIO({ '/work/a.sjs': 'const x = 1;' });
    expect(await run(['build', 'a.sjs', '--out-dir', 'out'], io)).toBe(0);
    expect(io.fs.get('/work/out/a.js')).toContain('const x = 1;');
    expect(io.fs.has('/work/out/a.js.map')).toBe(true);
    expect(io.stdout()).toContain('built 1 file');
  });
  it('does not write outputs when there are errors', async () => {
    const io = makeIO({ '/work/bad.sjs': 'const b: string = null;' });
    expect(await run(['build', 'bad.sjs', '--out-dir', 'out'], io)).toBe(1);
    expect(io.fs.has('/work/out/bad.js')).toBe(false);
    expect(io.stderr()).toContain('build failed');
  });
  it('writes a persistent cache entry under .superjs/cache and reuses it', async () => {
    const io = makeIO({ '/work/a.sjs': 'const x = 1;' });
    await run(['build', 'a.sjs', '--out-dir', 'out'], io);
    expect([...io.fs.keys()].filter((p) => p.includes('.superjs/cache'))).toHaveLength(1);
    const before = io.fs.get('/work/out/a.js');
    expect(await run(['build', 'a.sjs', '--out-dir', 'out'], io)).toBe(0);
    expect(io.fs.get('/work/out/a.js')).toBe(before); // identical, served from cache
  });
  it('--no-cache skips the cache directory', async () => {
    const io = makeIO({ '/work/a.sjs': 'const x = 1;' });
    await run(['build', 'a.sjs', '--out-dir', 'out', '--no-cache'], io);
    expect([...io.fs.keys()].some((p) => p.includes('.superjs/cache'))).toBe(false);
  });
  it('expands a directory argument to all .sjs files under it', async () => {
    const io = makeIO({
      '/work/src/a.sjs': 'const a = 1;',
      '/work/src/nested/b.sjs': 'const b = 2;',
      '/work/src/readme.md': 'not source',
    });
    expect(await run(['build', 'src', '--out-dir', 'out'], io)).toBe(0);
    expect(io.fs.get('/work/out/a.js')).toContain('const a = 1;');
    expect(io.fs.get('/work/out/b.js')).toContain('const b = 2;');
    expect(io.stdout()).toContain('built 2 files');
  });
  it('--watch does the initial build and rebuilds on change', async () => {
    const io = makeIO({ '/work/a.sjs': 'const x = 1;' });
    expect(await run(['build', 'a.sjs', '--out-dir', 'out', '--watch'], io)).toBe(0);
    expect(io.fs.get('/work/out/a.js')).toContain('const x = 1;');
    expect(io.stdout()).toContain('watching for changes');
    // Edit the file and fire the watcher → output is rebuilt from new source.
    io.fs.set('/work/a.sjs', 'const x = 99;');
    io.fireChange('/work/a.sjs');
    await Promise.resolve(); // let the async rebuild settle
    expect(io.fs.get('/work/out/a.js')).toContain('const x = 99;');
    expect(io.stdout()).toContain('rebuilding');
  });
});

describe('translate (.d.ts → .d.sjs)', () => {
  it('translates a .d.ts file alongside the source by default', async () => {
    const io = makeIO({ '/work/types.d.ts': 'export type Id = string;\nexport interface User { name: string; age: number; }' });
    expect(await run(['translate', 'types.d.ts'], io)).toBe(0);
    const out = io.fs.get('/work/types.d.sjs');
    expect(out).toBeDefined();
    expect(out).toContain('type Id = string');
    expect(out).toContain('type User');
    expect(io.stdout()).toContain('translated types.d.ts → types.d.sjs');
  });
  it('honours --out-dir', async () => {
    const io = makeIO({ '/work/types.d.ts': 'export type Id = string;' });
    expect(await run(['translate', 'types.d.ts', '--out-dir', 'sjs'], io)).toBe(0);
    expect(io.fs.has('/work/sjs/types.d.sjs')).toBe(true);
  });
  it('reports unsupported TS forms as warnings (degraded to dynamic)', async () => {
    const io = makeIO({ '/work/x.d.ts': 'export type X = A & B;' });
    await run(['translate', 'x.d.ts'], io);
    expect(io.stderr()).toContain('warning');
  });
  it('rejects a non-.d.ts file', async () => {
    const io = makeIO({ '/work/foo.ts': 'export const x = 1;' });
    expect(await run(['translate', 'foo.ts'], io)).toBe(1);
    expect(io.stderr()).toContain('is not a .d.ts file');
  });
  it('fails on a missing file', async () => {
    const io = makeIO();
    expect(await run(['translate', 'missing.d.ts'], io)).toBe(1);
    expect(io.stderr()).toContain("cannot find file 'missing.d.ts'");
  });
  it('usage error with no arguments', async () => {
    const io = makeIO();
    expect(await run(['translate'], io)).toBe(2);
    expect(io.stderr()).toContain('usage: superjs translate');
  });
});

describe('add (npm package types → .d.sjs)', () => {
  it("resolves a package's own types, writes .d.sjs and maps it in config paths", async () => {
    const io = makeIO({
      '/work/node_modules/widget/package.json': JSON.stringify({ name: 'widget', types: 'index.d.ts' }),
      '/work/node_modules/widget/index.d.ts': 'export interface Widget { id: string; size: number; }',
    });
    expect(await run(['add', 'widget'], io)).toBe(0);
    const out = io.fs.get('/work/node_modules/@superjs/types/widget/index.d.sjs');
    expect(out).toBeDefined();
    expect(out).toContain('type Widget');
    const config = JSON.parse(io.fs.get('/work/superjs.config.json')!);
    expect(config.paths.widget).toEqual(['node_modules/@superjs/types/widget']);
    expect(io.stdout()).toContain('added widget →');
    expect(io.stdout()).toContain('typed surface: 100% (3/3');
    const surface = JSON.parse(io.fs.get('/work/node_modules/@superjs/types/widget/surface.json')!);
    expect(surface).toMatchObject({ package: 'widget', typed: 3, total: 3 });
  });
  it('falls back to a DefinitelyTyped @types/<pkg> entry', async () => {
    const io = makeIO({
      '/work/node_modules/@types/legacy/index.d.ts': 'export type Id = string;',
    });
    expect(await run(['add', 'legacy'], io)).toBe(0);
    expect(io.fs.has('/work/node_modules/@superjs/types/legacy/index.d.sjs')).toBe(true);
  });
  it('preserves an existing config when adding a path mapping', async () => {
    const io = makeIO({
      '/work/superjs.config.json': JSON.stringify({ language: '1.0', compilerOptions: { strict: true } }),
      '/work/node_modules/widget/package.json': JSON.stringify({ name: 'widget' }),
      '/work/node_modules/widget/index.d.ts': 'export type Id = string;',
    });
    expect(await run(['add', 'widget'], io)).toBe(0);
    const config = JSON.parse(io.fs.get('/work/superjs.config.json')!);
    expect(config.compilerOptions.strict).toBe(true);
    expect(config.paths.widget).toEqual(['node_modules/@superjs/types/widget']);
  });
  it('errors when the package has no declarations installed', async () => {
    const io = makeIO();
    expect(await run(['add', 'ghost'], io)).toBe(1);
    expect(io.stderr()).toContain("no TypeScript declarations found for 'ghost'");
  });
  it('usage error with no arguments', async () => {
    const io = makeIO();
    expect(await run(['add'], io)).toBe(2);
    expect(io.stderr()).toContain('usage: superjs add');
  });
  it('ignores a malformed paths map in config (no crash, import stays dynamic)', async () => {
    const io = makeIO({
      '/work/superjs.config.json': JSON.stringify({ language: '1.0', paths: { widget: 'not-an-array' } }),
      '/work/app.sjs': 'import { Widget } from "widget";\nconst x: number = 1;',
    });
    expect(await run(['check', 'app.sjs'], io)).toBe(0);
    expect(io.stdout()).toContain('No errors.');
  });
  it('end-to-end: a package added with `add` is then resolved by `check`', async () => {
    const io = makeIO({
      '/work/node_modules/widget/package.json': JSON.stringify({ name: 'widget', types: 'index.d.ts' }),
      '/work/node_modules/widget/index.d.ts': 'export interface Widget { id: string; }',
      '/work/app.sjs': 'import { Widget } from "widget";\nconst w: Widget = 5;',
    });
    expect(await run(['add', 'widget'], io)).toBe(0);
    // `check` loads config paths + reads the generated .d.sjs: Widget's real
    // (object) type flows in, so assigning `5` is a mismatch.
    expect(await run(['check', 'app.sjs'], io)).toBe(1);
    expect(io.stdout()).toContain('SJS-E002');
  });
});

describe('init & doctor', () => {
  it('init writes a default config, then leaves it untouched', async () => {
    const io = makeIO();
    expect(await run(['init'], io)).toBe(0);
    expect(io.fs.has('/work/superjs.config.json')).toBe(true);
    expect(JSON.parse(io.fs.get('/work/superjs.config.json')!).language).toBe('1.0');
    expect(await run(['init'], io)).toBe(0);
    expect(io.stdout()).toContain('already exists');
  });
  it('doctor reports environment health', async () => {
    const io = makeIO();
    const code = await run(['doctor'], io);
    expect(code).toBe(0);
    expect(io.stdout()).toContain('superjs doctor');
  });
  it('doctor reports per-package typed surface for added packages', async () => {
    const io = makeIO({
      '/work/superjs.config.json': JSON.stringify({ language: '1.0', paths: { widget: ['node_modules/@superjs/types/widget'] } }),
      '/work/node_modules/@superjs/types/widget/surface.json': JSON.stringify({ package: 'widget', typed: 4, total: 5, unsupported: ['x mapped to dynamic'] }),
    });
    expect(await run(['doctor'], io)).toBe(0);
    expect(io.stdout()).toContain('added packages (1)');
    expect(io.stdout()).toContain('widget');
    expect(io.stdout()).toContain('80% (4/5');
    expect(io.stdout()).toContain('1 dynamic/skipped');
  });
});

describe('format', () => {
  it('rewrites a file in place and reports it', async () => {
    const io = makeIO({ '/work/a.sjs': 'const   x:number=1' });
    expect(await run(['format', 'a.sjs'], io)).toBe(0);
    expect(io.fs.get('/work/a.sjs')).toBe('const x: number = 1;\n');
    expect(io.stdout()).toContain('formatted a.sjs');
  });
  it('--check reports without writing and exits 1 when a file would change', async () => {
    const io = makeIO({ '/work/a.sjs': 'const   x=1' });
    expect(await run(['format', 'a.sjs', '--check'], io)).toBe(1);
    expect(io.fs.get('/work/a.sjs')).toBe('const   x=1'); // untouched
    expect(io.stdout()).toContain('would reformat a.sjs');
  });
  it('--check exits 0 when everything is already formatted', async () => {
    const io = makeIO({ '/work/a.sjs': 'const x = 1;\n' });
    expect(await run(['format', 'a.sjs', '--check'], io)).toBe(0);
    expect(io.stdout()).toContain('All files are formatted.');
  });
  it('usage error with no arguments', async () => {
    const io = makeIO();
    expect(await run(['format'], io)).toBe(2);
    expect(io.stderr()).toContain('usage: superjs format');
  });
});

describe('lint', () => {
  it('reports findings and exits 1', async () => {
    const io = makeIO({ '/work/a.sjs': 'var x = 1;\ndebugger;' });
    expect(await run(['lint', 'a.sjs'], io)).toBe(1);
    expect(io.stdout()).toContain('SJS-L002');
    expect(io.stdout()).toContain('SJS-L005');
  });
  it('exits 0 and reports clean for tidy code', async () => {
    const io = makeIO({ '/work/a.sjs': 'const x: number = 1;\n' });
    expect(await run(['lint', 'a.sjs'], io)).toBe(0);
    expect(io.stdout()).toContain('No lint findings.');
  });
  it('emits JSON with --format json', async () => {
    const io = makeIO({ '/work/a.sjs': 'var x = 1;' });
    await run(['lint', 'a.sjs', '--format', 'json'], io);
    expect(JSON.parse(io.stdout())[0].code).toBe('SJS-L002');
  });
  it('usage error with no arguments', async () => {
    const io = makeIO();
    expect(await run(['lint'], io)).toBe(2);
    expect(io.stderr()).toContain('usage: superjs lint');
  });
});

describe('doc', () => {
  it('prints Markdown API docs to stdout', async () => {
    const io = makeIO({ '/work/m.sjs': '/** Adds. */\nexport function add(a: number, b: number): number { return a + b; }' });
    expect(await run(['doc', 'm.sjs'], io)).toBe(0);
    expect(io.stdout()).toContain('## `add`');
    expect(io.stdout()).toContain('function add(a: number, b: number): number');
    expect(io.stdout()).toContain('Adds.');
  });
  it('writes a .md file with --out-dir', async () => {
    const io = makeIO({ '/work/m.sjs': 'export const x: number = 1;' });
    expect(await run(['doc', 'm.sjs', '--out-dir', 'docs'], io)).toBe(0);
    expect(io.fs.get('/work/docs/m.md')).toContain('## `x`');
    expect(io.stdout()).toContain('documented m.sjs → docs/m.md');
  });
  it('emits JSON with --format json', async () => {
    const io = makeIO({ '/work/m.sjs': 'export const x: number = 1;' });
    await run(['doc', 'm.sjs', '--format', 'json'], io);
    expect(JSON.parse(io.stdout())[0].name).toBe('x');
  });
  it('usage error with no arguments', async () => {
    const io = makeIO();
    expect(await run(['doc'], io)).toBe(2);
    expect(io.stderr()).toContain('usage: superjs doc');
  });
});

describe('stubs & unknown', () => {
  it('stubbed commands report a planned stage and exit 2', async () => {
    const io = makeIO();
    expect(await run(['lsp'], io)).toBe(2);
    expect(io.stderr()).toContain('not implemented yet');
  });
  it('unknown command exits 64', async () => {
    const io = makeIO();
    expect(await run(['frobnicate'], io)).toBe(64);
    expect(io.stderr()).toContain("unknown command 'frobnicate'");
  });
});
