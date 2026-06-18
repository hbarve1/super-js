import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from '@superjs/compiler';

const MODULES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'modules');
let seq = 0;

/** Compile a stdlib module and import its emitted JS so we can call it. */
async function load(name: string): Promise<Record<string, (...args: never[]) => unknown>> {
  const source = readFileSync(join(MODULES_DIR, `${name}.sjs`), 'utf8');
  const { outputs } = await compile([{ filename: `${name}.sjs`, source }], { sourceMap: 'none' });
  const [, output] = [...outputs][0]!;
  const tmp = join(tmpdir(), `sjs-${name}-${seq++}.mjs`);
  writeFileSync(tmp, output.code);
  return import(tmp) as Promise<Record<string, (...args: never[]) => unknown>>;
}

describe('@superjs/stdlib — compiled modules execute correctly', () => {
  it('std-math computes', async () => {
    const m = await load('std-math');
    expect(m.abs(-3 as never)).toBe(3);
    expect(m.clamp(5 as never, 0 as never, 3 as never)).toBe(3);
    expect(m.max(2 as never, 7 as never)).toBe(7);
    expect(m.sqrt(9 as never)).toBe(3);
  });

  it('std-core Option/Result helpers behave', async () => {
    const c = await load('std-core');
    expect(c.isOk(c.ok(1 as never) as never)).toBe(true);
    expect(c.unwrapOr(c.some(5 as never) as never, 0 as never)).toBe(5);
    expect(c.resultOr(c.err('boom' as never) as never, 42 as never)).toBe(42);
  });

  it('std-string transforms', async () => {
    const s = await load('std-string');
    expect(s.upper('hi' as never)).toBe('HI');
    expect(s.join(['a', 'b'] as never, '-' as never)).toBe('a-b');
    expect(s.includes('hello' as never, 'ell' as never)).toBe(true);
  });

  it('std-schema validates', async () => {
    const sc = await load('std-schema');
    const str = sc.string();
    expect((str as { accepts(v: unknown): boolean }).accepts('x')).toBe(true);
    expect((str as { accepts(v: unknown): boolean }).accepts(1)).toBe(false);
  });
});
