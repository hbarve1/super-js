import { describe, it, expect } from 'vitest';
import { run, parseArgs } from './run.js';
import { VERSION } from './commands.js';
import type { IO } from './io.js';

/** In-memory IO: captures stdout/stderr and a virtual filesystem. */
function makeIO(files: Record<string, string> = {}, cwd = '/work'): IO & {
  stdout: () => string; stderr: () => string; fs: Map<string, string>;
} {
  const fs = new Map<string, string>(Object.entries(files));
  let outBuf = '', errBuf = '';
  return {
    out: (t) => { outBuf += t; },
    err: (t) => { errBuf += t; },
    readFile: (p) => { const v = fs.get(p); if (v === undefined) throw new Error(`ENOENT ${p}`); return v; },
    writeFile: (p, d) => { fs.set(p, d); },
    exists: (p) => fs.has(p),
    cwd: () => cwd,
    stdout: () => outBuf,
    stderr: () => errBuf,
    fs,
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
});

describe('stubs & unknown', () => {
  it('stubbed commands report a planned stage and exit 2', async () => {
    const io = makeIO();
    expect(await run(['lint'], io)).toBe(2);
    expect(io.stderr()).toContain('not implemented yet');
  });
  it('unknown command exits 64', async () => {
    const io = makeIO();
    expect(await run(['frobnicate'], io)).toBe(64);
    expect(io.stderr()).toContain("unknown command 'frobnicate'");
  });
});
