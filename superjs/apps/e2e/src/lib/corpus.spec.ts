/**
 * Corpus-wide end-to-end guarantees over the example programs (93 real `.sjs`
 * files adapted from the legacy corpus). These don't assert *clean* compiles —
 * the fresh core is a sound subset, so many examples legitimately produce
 * diagnostics — they assert the invariants that must hold for *every* input:
 * the compiler never throws, output is deterministic, and the grammar parses.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '@superjs/compiler';
import { parse } from '@superjs/parser';
import { loadFixtures } from './corpus.js';

const CORPUS = loadFixtures('corpus');

/** Floor on the error-free count — a regression that breaks working programs trips this. */
const CLEAN_BASELINE = 23;

describe('example corpus', () => {
  it('discovers the corpus', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(90);
  });

  describe('crash-safety + determinism (every fixture)', () => {
    for (const fx of CORPUS) {
      it(`compiles ${fx.name} without throwing, deterministically`, async () => {
        const a = await compile([{ filename: fx.name, source: fx.source }]);
        const b = await compile([{ filename: fx.name, source: fx.source }]);
        const ac = [...a.outputs.values()][0];
        const bc = [...b.outputs.values()][0];
        expect(ac).toBeDefined();
        expect(ac!.code).toBe(bc!.code);
        expect(JSON.stringify(ac!.map)).toBe(JSON.stringify(bc!.map));
      });
    }
  });

  describe('grammar smoke (every fixture parses to a Program)', () => {
    for (const fx of CORPUS) {
      it(`parses ${fx.name}`, () => {
        const { program } = parse(fx.source, { file: fx.name });
        expect(program.kind).toBe('Program');
        expect(Array.isArray(program.body)).toBe(true);
      });
    }
  });

  it(`keeps at least ${CLEAN_BASELINE} programs error-free`, async () => {
    let clean = 0;
    for (const fx of CORPUS) {
      const r = await compile([{ filename: fx.name, source: fx.source }]);
      if (!r.diagnostics.some((d) => d.severity === 'error')) clean++;
    }
    expect(clean).toBeGreaterThanOrEqual(CLEAN_BASELINE);
  });
});
