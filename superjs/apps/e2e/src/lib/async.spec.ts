/**
 * Async runtime fidelity. Conforming async programs that must compile clean and
 * whose emitted `__main()` promise resolves to the expected value — proving the
 * codegen emits working `async`/`await` (declarations, arrows, sequential
 * awaits, try/catch) end to end. Each fixture exposes
 * `async function __main(): Promise<number>`; the test awaits it.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { transform } from '@superjs/compiler';
import { loadFixtures } from '@superjs/test-utils';
import { FIXTURES_DIR } from './corpus.js';

const ASYNC = loadFixtures(join(FIXTURES_DIR, 'async'));
const EXPECTED = 42;

/** Run emitted JS and await the promise returned by `__main()`. */
async function runAsync(code: string): Promise<unknown> {
  return new Function(`${code}; return __main();`)();
}

describe('async corpus', () => {
  it('discovers the async fixtures', () => {
    expect(ASYNC.length).toBeGreaterThanOrEqual(5);
  });

  for (const fx of ASYNC) {
    describe(fx.name, () => {
      it('compiles clean and __main() resolves to 42', async () => {
        const r = await transform(fx.source, fx.name);
        expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        expect(r.code).toContain('async');
        expect(await runAsync(r.code)).toBe(EXPECTED);
      });
    });
  }
});
