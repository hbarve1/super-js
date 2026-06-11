/**
 * `parseTypeDecl` / `emitTypeDecl` round-trip corpus (stage-1-compiler-core B5).
 *
 * For each input: `parseTypeDecl(input) → emitTypeDecl → parseTypeDecl(output)`
 * must reparse to a structurally-equal AST (spans ignored). This is the proof of
 * the type-declaration surface the Stage-2 interop translator depends on — if a
 * form doesn't survive the round trip, the translator can't rely on it.
 *
 * Covers the spec's categories (those SJS actually allows): primitives, arrays,
 * tuples, unions, nullable, function signatures, object types (+ optional /
 * readonly / index signatures / nested), generics (incl. nested `>>`), and
 * variant sum types (unit / tuple / record), including `T | null` unions and
 * object index signatures `{ [k: string]: V }`.
 */

import { describe, it, expect } from 'vitest';
import { parseTypeDecl, emitTypeDecl } from '../index.js';

/** Drop positional fields so two parses compare by structure. */
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

const CORPUS: Record<string, readonly string[]> = {
  primitives: [
    'number', 'string', 'boolean', 'bigint', 'symbol', 'void',
    'null', 'undefined', 'never', 'unknown', 'object', 'dynamic',
  ],
  arrays: ['number[]', 'string[][]', '(number | string)[]', 'boolean[][][]'],
  tuples: ['[number, string]', '[number]', '[number, string, boolean]'],
  unions: ['number | string', 'number | string | boolean', 'A | B | C', 'number | null', 'string | undefined'],
  nullable: ['string?', 'number[]?', '(number | string)?'],
  functions: [
    '() => number',
    '(a: number) => string',
    '(a: number, b: string) => boolean',
    '(x: number) => (y: number) => number',
  ],
  objects: [
    '{ x: number }',
    '{ x: number; y: string }',
    '{ readonly x: number }',
    '{ x?: number }',
    '{ a: { b: number } }',
    '{ [key: string]: number }',
    '{ [id: string]: Array<number> }',
  ],
  generics: [
    'Array<number>',
    'Map<string, number>',
    'Promise<number>',
    'Array<Map<string, number>>',
    'Map<string, Array<number>>',
  ],
  'variant sums': [
    'Ok(number) | Err(string)',
    'Some(number) | None',
    'Rect({ w: number, h: number }) | Dot',
    'Cons(number) | Nil',
  ],
};

describe('parseTypeDecl / emitTypeDecl round-trip corpus', () => {
  for (const [category, cases] of Object.entries(CORPUS)) {
    describe(category, () => {
      for (const input of cases) {
        it(`round-trips \`${input}\``, () => {
          const first = parseTypeDecl(input);
          const printed = emitTypeDecl(first);
          const second = parseTypeDecl(printed);
          expect(stripSpans(second)).toEqual(stripSpans(first));
        });
      }
    });
  }

  it('emit is idempotent (printing the reparse yields identical text)', () => {
    for (const cases of Object.values(CORPUS)) {
      for (const input of cases) {
        const once = emitTypeDecl(parseTypeDecl(input));
        const twice = emitTypeDecl(parseTypeDecl(once));
        expect(twice).toBe(once);
      }
    }
  });
});
