/**
 * Curated end-to-end assertions: a small hand-authored set where the *exact*
 * outcome is pinned. Clean programs must compile with zero errors; error
 * programs must emit the specific diagnostic; runtime programs must evaluate to
 * the expected value (the "backend comparison" — emitted JS run against a
 * behavioral oracle).
 */

import { describe, it, expect } from 'vitest';
import { compile } from '@superjs/compiler';
import { loadFixtures, type Fixture } from './corpus.js';

function byName(fxs: Fixture[], suffix: string): Fixture {
  const f = fxs.find((x) => x.name.endsWith(suffix));
  if (!f) throw new Error(`fixture not found: ${suffix}`);
  return f;
}

async function compileOne(fx: Fixture) {
  const r = await compile([{ filename: fx.name, source: fx.source }]);
  const out = [...r.outputs.values()][0];
  return { errors: r.diagnostics.filter((d) => d.severity === 'error'), code: out?.code ?? '' };
}

/** Run emitted JS and return the value the snippet assigns to `__r`. */
function evalResult(code: string): unknown {
  const fn = new Function(`${code}; return typeof __r !== "undefined" ? __r : undefined;`);
  return fn();
}

const CURATED = loadFixtures('curated');

describe('curated — clean programs compile error-free', () => {
  for (const suffix of ['clean/sum-match.sjs', 'clean/functions.sjs', 'clean/nullable.sjs']) {
    it(suffix, async () => {
      const { errors, code } = await compileOne(byName(CURATED, suffix));
      expect(errors).toEqual([]);
      expect(code.length).toBeGreaterThan(0);
      expect(code).not.toMatch(/: number|: string/); // types erased
    });
  }
});

describe('curated — error programs emit the right diagnostic', () => {
  it('null assignment → SJS-E001', async () => {
    const { errors } = await compileOne(byName(CURATED, 'errors/null-assign.sjs'));
    expect(errors.map((d) => d.code)).toContain('SJS-E001');
  });
  it('non-exhaustive match → SJS-E007', async () => {
    const { errors } = await compileOne(byName(CURATED, 'errors/nonexhaustive.sjs'));
    expect(errors.map((d) => d.code)).toContain('SJS-E007');
  });
});

describe('curated — runtime fidelity (emitted JS vs oracle)', () => {
  it('sum + match round-trips to 42', async () => {
    const { errors, code } = await compileOne(byName(CURATED, 'runtime/sum-roundtrip.sjs'));
    expect(errors).toEqual([]);
    expect(evalResult(code)).toBe(42);
  });
  it('class parameter properties assign and read back', async () => {
    const { errors, code } = await compileOne(byName(CURATED, 'runtime/class-prop.sjs'));
    expect(errors).toEqual([]);
    expect(evalResult(code)).toBe(7);
  });
});
