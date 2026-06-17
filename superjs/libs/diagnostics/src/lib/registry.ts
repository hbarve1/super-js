/**
 * SJS diagnostic registry — the single source of truth for code → severity,
 * category, message template, and spec URL.
 *
 * Mirrors specs/error-codes.md. Codes are PERMANENT (never renumbered/reused).
 * Adding a code here requires the corresponding entry in the spec registry.
 */

import type { Severity, DiagnosticCode } from '@superjs/types';

export type DiagnosticCategory =
  | 'parser'
  | 'null-safety'
  | 'type-check'
  | 'match'
  | 'control-flow'
  | 'access-modifiers'
  | 'classes'
  | 'modules'
  | 'async-await'
  | 'jsx'
  | 'dynamic'
  | 'keywords'
  | 'try-catch'
  | 'security'
  | 'lint';

export interface DiagnosticDescriptor {
  readonly code: DiagnosticCode;
  readonly severity: Severity;
  readonly category: DiagnosticCategory;
  /** Message template; `{name}` tokens are filled by {@link formatMessage}. */
  readonly template: string;
  /** Owning stage, for documentation/triage. */
  readonly stage: string;
}

function d(
  severity: Severity,
  category: DiagnosticCategory,
  template: string,
  stage: string,
): Omit<DiagnosticDescriptor, 'code'> {
  return { severity, category, template, stage };
}

/** Raw table keyed by code; `code` field injected by {@link REGISTRY}. */
const TABLE: Record<string, Omit<DiagnosticDescriptor, 'code'>> = {
  // ── Parser (always fatal) ──────────────────────────────────────────────────
  'SJS-P001': d('error', 'parser', 'Unexpected token', 'Stage 1'),
  'SJS-P002': d('error', 'parser', 'Unexpected end of file', 'Stage 1'),
  'SJS-P003': d('error', 'parser', 'Invalid syntax in type annotation', 'Stage 1'),
  'SJS-P004': d('error', 'parser', 'Invalid sum type declaration', 'Stage 1'),
  'SJS-P005': d('error', 'parser', 'Invalid match expression', 'Stage 1'),
  'SJS-P099': d('error', 'parser', 'Too many parse errors; recovery abandoned', 'Stage 1'),

  // ── Type errors ────────────────────────────────────────────────────────────
  'SJS-E001': d('error', 'null-safety', 'Null or undefined assigned to non-nullable type `{type}`', 'Stage 0'),
  'SJS-E002': d('error', 'type-check', 'Type mismatch: expected `{expected}`, found `{found}`', 'Stage 0'),
  'SJS-E003': d('error', 'null-safety', 'Property access on possibly-null value', 'Stage 0'),
  'SJS-E004': d('error', 'type-check', '`any` is not a valid type in SJS; use `dynamic`', 'Stage 1'),
  'SJS-E005': d('error', 'type-check', 'Intersection type `A & B` is not allowed; use interface extension', 'Stage 1'),
  'SJS-E006': d('error', 'type-check', 'Mapped type is not allowed in SJS', 'Stage 1'),
  'SJS-E007': d('error', 'match', 'Match expression is not exhaustive: missing variant `{variant}`', 'Stage 0'),
  'SJS-E008': d('error', 'type-check', 'Conditional type `T extends U ? A : B` is not allowed', 'Stage 1'),
  'SJS-E009': d('error', 'type-check', '`infer` keyword is not allowed in SJS', 'Stage 1'),
  'SJS-E010': d('error', 'type-check', 'TypeScript `enum` is not allowed; use sum types', 'Stage 1'),
  'SJS-E011': d('error', 'null-safety', 'Non-null assertion `!` is not allowed; use narrowing', 'Stage 1'),
  'SJS-E012': d('error', 'type-check', '`namespace` is not allowed; use ES modules', 'Stage 1'),
  'SJS-E013': d('error', 'control-flow', '`with` statement not allowed (SJS is always strict mode)', 'Stage 1'),
  'SJS-E014': d('error', 'access-modifiers', 'Member `{member}` is not accessible from this scope', 'Stage 1'),
  'SJS-E015': d('error', 'access-modifiers', 'Cannot narrow an access modifier on an overriding member', 'Stage 1'),
  'SJS-E016': d('error', 'classes', 'Cannot instantiate an abstract class directly with `new`', 'Stage 1'),
  'SJS-E017': d('error', 'modules', 'Circular import detected — module graph contains a cycle', 'Stage 1'),
  'SJS-E018': d('error', 'async-await', 'Top-level `await` used outside an ES module context', 'Stage 1'),
  'SJS-E019': d('error', 'jsx', 'Unknown JSX element type `{name}`', 'Stage 2'),
  'SJS-E020': d('error', 'type-check', 'Ambiguous variant constructor `{variant}` — multiple sum types declare it; annotate the expected type', 'Stage 1'),

  // ── Warnings (--strict promotes to error) ──────────────────────────────────
  'SJS-W001': d('warning', 'dynamic', 'Implicit `dynamic` — unannotated position in `--strict` mode', 'Stage 0'),
  'SJS-W002': d('warning', 'dynamic', '`dynamic` value assigned to a typed position without a narrowing check', 'Stage 1'),
  'SJS-W003': d('warning', 'match', 'Unreachable `match` arm — earlier arm already covers this variant', 'Stage 1'),
  'SJS-W004': d('warning', 'keywords', 'Reserved or future SJS keyword `{name}` used as an identifier', 'Stage 1'),
  'SJS-W005': d('warning', 'access-modifiers', 'Explicit `public` modifier is redundant — members are public by default', 'Stage 1'),
  'SJS-W006': d('warning', 'type-check', 'Excess property `{name}` on a fresh object literal assigned to a typed position', 'Stage 1'),
  'SJS-W007': d('warning', 'jsx', 'Missing `key` prop on JSX element in a list or iterator context', 'Stage 2'),
  'SJS-W008': d('warning', 'control-flow', 'Implicit switch fallthrough between non-empty case clauses', 'Stage 1'),
  'SJS-W009': d('warning', 'control-flow', 'Unreachable code following a terminator statement', 'Stage 1'),
  'SJS-W010': d('warning', 'try-catch', '`catch` binding not typed as `Error` or `unknown`', 'Stage 1'),
  'SJS-W012': d('warning', 'security', 'BiDi control character in source file', 'Stage 1'),

  // ── Lint (off in --loose) ──────────────────────────────────────────────────
  'SJS-L001': d('warning', 'lint', 'Prefer `const` — `let` binding `{name}` is never reassigned', 'Stage 3'),
  'SJS-L002': d('warning', 'lint', 'Prefer `let` or `const` over `var`', 'Stage 3'),
  'SJS-L003': d('warning', 'lint', 'Use `===` / `!==` — `==` / `!=` performs type coercion', 'Stage 3'),
  'SJS-L004': d('warning', 'lint', 'Prefer `for…of` over `for…in` for array and iterable iteration', 'Stage 3'),
  'SJS-L005': d('warning', 'lint', '`debugger` statement found in committed code', 'Stage 3'),
  'SJS-L006': d('warning', 'lint', '`match` expression has no arms', 'Stage 3'),
  'SJS-L007': d('warning', 'lint', 'Redundant match arm — variant `{variant}` is already handled', 'Stage 3'),
  'SJS-L008': d('warning', 'lint', 'Prefer an arrow function over a `function` expression callback', 'Stage 3'),
  'SJS-L009': d('warning', 'lint', 'Unused import — `{name}` is never used', 'Stage 3'),
  'SJS-L010': d('warning', 'lint', 'Import `{source}` is out of order — sort imports by source', 'Stage 3'),
  'SJS-L011': d('error', 'security', 'BiDi control character rejected', 'Stage 1'),
  'SJS-L012': d('warning', 'lint', 'Unused declaration — `{name}` is never used', 'Stage 3'),
  'SJS-L013': d('warning', 'lint', 'Explicit `dynamic` type — annotate precisely, or add `// @sjs:dynamic-ok`', 'Stage 3'),
  'SJS-L014': d('warning', 'lint', '`{name}` shadows a binding from an enclosing scope', 'Stage 3'),
  'SJS-L015': d('warning', 'lint', 'Floating promise — `await`, `return`, or otherwise consume this `Promise`', 'Stage 3'),
  'SJS-L016': d('warning', 'lint', 'Unhandled `Result` — `match`, `return`, or otherwise consume it', 'Stage 3'),
  'SJS-L017': d('warning', 'lint', 'Prefer returning `Result<T, E>` over `throw` (RFC-0004)', 'Stage 3'),
  'SJS-L018': d('warning', 'lint', 'Mixed spaces and tabs in leading indentation', 'Stage 3'),
};

export const REGISTRY: Readonly<Record<string, DiagnosticDescriptor>> = Object.freeze(
  Object.fromEntries(
    Object.entries(TABLE).map(([code, rest]) => [code, Object.freeze({ code, ...rest })]),
  ),
);

/** Type-safe code constants for use across the pipeline (e.g. `Codes.E001`). */
export const Codes = Object.freeze(
  Object.fromEntries(
    Object.keys(TABLE).map((code) => [code.replace('SJS-', ''), code]),
  ),
) as Readonly<Record<string, DiagnosticCode>>;

export function getDescriptor(code: DiagnosticCode): DiagnosticDescriptor | undefined {
  return REGISTRY[code];
}

export function allCodes(): readonly DiagnosticCode[] {
  return Object.keys(REGISTRY);
}
