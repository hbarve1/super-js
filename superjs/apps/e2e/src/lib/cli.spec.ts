/**
 * End-to-end through the actual `superjs` CLI entry (`run`), driving real
 * fixture files on disk. Uses a capturing IO that delegates file reads/writes to
 * the real filesystem but buffers stdout/stderr and writes builds into an
 * in-memory map, so the test asserts on output and exit codes without spawning a
 * process or touching the build directory.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { run, type IO } from '@superjs/cli';
import { FIXTURES_DIR } from './corpus.js';

function capturingIO(cwd: string): IO & { stdout: () => string; stderr: () => string; writes: Map<string, string> } {
  let out = '', err = '';
  const writes = new Map<string, string>();
  const abs = (p: string) => (isAbsolute(p) ? p : join(cwd, p));
  return {
    out: (t) => { out += t; },
    err: (t) => { err += t; },
    readFile: (p) => readFileSync(abs(p), 'utf8'),
    writeFile: (p, d) => { writes.set(abs(p), d); },
    exists: (p) => writes.has(abs(p)) || existsSync(abs(p)),
    cwd: () => cwd,
    watch: () => () => { /* no watching in e2e */ },
    stdout: () => out,
    stderr: () => err,
    writes,
  };
}

describe('superjs CLI — end-to-end on real fixtures', () => {
  it('check passes a clean fixture (exit 0)', async () => {
    const io = capturingIO(FIXTURES_DIR);
    const code = await run(['check', 'curated/clean/functions.sjs'], io);
    expect(code).toBe(0);
    expect(io.stdout()).toContain('No errors.');
  });

  it('check fails an error fixture and names the code (exit 1)', async () => {
    const io = capturingIO(FIXTURES_DIR);
    const code = await run(['check', 'curated/errors/null-assign.sjs'], io);
    expect(code).toBe(1);
    expect(io.stdout()).toContain('SJS-E001');
  });

  it('build emits JS + external map for a clean fixture', async () => {
    const io = capturingIO(FIXTURES_DIR);
    const code = await run(['build', 'curated/runtime/class-prop.sjs', '--out-dir', 'out'], io);
    expect(code).toBe(0);
    const js = [...io.writes].find(([p]) => p.endsWith('class-prop.js'));
    expect(js).toBeDefined();
    expect(js![1]).toContain('this.x = x;');
    expect([...io.writes.keys()].some((p) => p.endsWith('class-prop.js.map'))).toBe(true);
  });

  it('explain prints a registry entry', async () => {
    const io = capturingIO(FIXTURES_DIR);
    expect(await run(['explain', 'E007'], io)).toBe(0);
    expect(io.stdout()).toContain('SJS-E007');
  });
});
