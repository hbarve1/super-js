/**
 * Compile-and-check shorthand via dependency injection.
 *
 * test-utils is Tier 0 and must not import the compiler (Tier 3). So instead of
 * depending on it, the shorthand takes a `CheckLike` function — the caller wires
 * in `@superjs/compiler`'s `check`/`compile`. This keeps the helper reusable
 * across suites while honouring the tier boundary.
 */

import type { Diagnostic, DiagnosticCode } from '@superjs/types';
import { errorsOf, hasCode } from './diagnostics.js';

/** Anything that turns source into diagnostics — e.g. the compiler's `check`. */
export type CheckLike = (source: string) => { diagnostics: readonly Diagnostic[] } | Promise<{ diagnostics: readonly Diagnostic[] }>;

/** A bound checker with assertion helpers. */
export interface Harness {
  /** Run the injected checker and return its diagnostics. */
  diagnostics(source: string): Promise<readonly Diagnostic[]>;
  /** Assert the source produces no error-severity diagnostics. */
  expectClean(source: string): Promise<void>;
  /** Assert the source emits `code`. */
  expectCode(source: string, code: DiagnosticCode): Promise<void>;
}

/** Build a {@link Harness} from any {@link CheckLike} (the compiler's `check`). */
export function makeHarness(check: CheckLike): Harness {
  const diagnostics = async (source: string): Promise<readonly Diagnostic[]> =>
    (await check(source)).diagnostics;

  return {
    diagnostics,
    async expectClean(source) {
      const errs = errorsOf(await diagnostics(source));
      if (errs.length) {
        throw new Error(`expected no errors; got [${errs.map((d) => d.code).join(', ')}]`);
      }
    },
    async expectCode(source, code) {
      const diags = await diagnostics(source);
      if (!hasCode(diags, code)) {
        throw new Error(`expected ${code}; got [${diags.map((d) => d.code).join(', ') || 'none'}]`);
      }
    },
  };
}
