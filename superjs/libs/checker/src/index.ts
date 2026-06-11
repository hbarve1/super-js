/**
 * `@superjs/checker` — the SJS type checker (Tier 1).
 *
 * Consumes a parsed {@link Program} (or source via the parser) and produces the
 * full diagnostic set: null-safety, assignability, sum-type construction,
 * `match` exhaustiveness, and `as`-assertion checks.
 */

import type { Program, Diagnostic } from '@superjs/types';
import { parse } from '@superjs/parser';
import { Checker, type CheckOptions, type TypedSpan } from './lib/checker.js';

export { Checker } from './lib/checker.js';
export type { CheckOptions, TypedSpan } from './lib/checker.js';
export { isAssignable } from './lib/subtype.js';
export { resolveType } from './lib/resolve.js';
export * as model from './lib/model.js';

export interface CheckResult {
  readonly diagnostics: readonly Diagnostic[];
  /** Populated when `recordTypes` is set: the synthesized type at each node span. */
  readonly types: readonly TypedSpan[];
}

/** Type-check an already-parsed program. */
export function checkProgram(program: Program, opts: CheckOptions = {}): CheckResult {
  return new Checker(opts).run(program);
}

/**
 * Parse + type-check source. Parser diagnostics and checker diagnostics are
 * concatenated; checking still runs on a partially-recovered tree.
 */
export function check(source: string, opts: CheckOptions = {}): CheckResult {
  const { program, diagnostics } = parse(source, { file: opts.file, strict: opts.strict });
  const checked = new Checker(opts).run(program);
  return { diagnostics: [...diagnostics, ...checked.diagnostics], types: checked.types };
}
