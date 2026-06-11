/**
 * Conforming corpus — hand-written SuperJS programs that exercise the language
 * *positively*: each must compile with zero errors, erase its types, and
 * evaluate to the expected value. This is the end-to-end proof that real
 * feature combinations work (sum types + match, generics, classes, nullable
 * narrowing, higher-order functions, structural interfaces) — complementing the
 * legacy corpus, which mostly proves crash-safety on non-conforming input.
 *
 * Also the first consumer of `@superjs/test-utils`: fixtures via `loadFixtures`,
 * and the `makeHarness` shorthand wired to the real compiler (`transform`),
 * demonstrating the dependency-injected check helper end to end.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { transform } from '@superjs/compiler';
import { loadFixtures, makeHarness } from '@superjs/test-utils';
import { FIXTURES_DIR } from './corpus.js';

const CONFORMING = loadFixtures(join(FIXTURES_DIR, 'conforming'));

/** Every conforming fixture is authored to evaluate to this value. */
const EXPECTED = 42;

function evalResult(code: string): unknown {
  return new Function(`${code}; return typeof __r !== "undefined" ? __r : undefined;`)();
}

describe('conforming corpus', () => {
  it('discovers the conforming fixtures', () => {
    expect(CONFORMING.length).toBeGreaterThanOrEqual(6);
  });

  for (const fx of CONFORMING) {
    describe(fx.name, () => {
      it('compiles with zero errors, types erased, and evaluates to 42', async () => {
        const r = await transform(fx.source, fx.name);
        expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        expect(r.code).not.toMatch(/: number|: string|interface |type \w+ =/);
        expect(evalResult(r.code)).toBe(EXPECTED);
      });
    });
  }
});

describe('test-utils makeHarness wired to the real compiler', () => {
  // Dependency injection: the Tier-0 harness takes the compiler's transform.
  const h = makeHarness(async (source: string) => transform(source, 'harness.sjs'));

  it('expectClean passes a conforming program', async () => {
    await expect(h.expectClean('const x: number = 1 + 2;')).resolves.toBeUndefined();
  });
  it('expectCode catches a null-safety violation', async () => {
    await h.expectCode('const x: string = null;', 'SJS-E001');
  });
  it('expectClean rejects a program with errors', async () => {
    await expect(h.expectClean('const x: string = null;')).rejects.toThrow(/expected no errors/);
  });
});
