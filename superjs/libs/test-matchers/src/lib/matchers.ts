/**
 * `@superjs/test-matchers` — assertions for SuperJS sum types in Jest / Vitest.
 *
 * SuperJS variants compile to objects tagged with `_tag` (RFC-0003), e.g.
 * `Ok(1)` → `{ _tag: "Ok", _0: 1 }`. These matchers check that tag (and,
 * optionally, the first payload). Framework-agnostic: each returns the
 * `{ pass, message }` shape that both Jest and Vitest `expect.extend` accept.
 *
 * Usage: `expect.extend(matchers)` once, then `expect(result).toMatchResult("Ok")`.
 */

export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

interface Tagged { _tag?: string; _0?: unknown; }

function tagOf(received: unknown): string | undefined {
  return typeof received === 'object' && received !== null
    ? (received as Tagged)._tag
    : undefined;
}

/** Assert the value is a variant with the given `_tag`. */
export function toMatchVariant(received: unknown, tag: string): MatcherResult {
  const actual = tagOf(received);
  return {
    pass: actual === tag,
    message: () => `expected a variant tagged "${tag}", got ${actual === undefined ? 'a non-variant' : `"${actual}"`}`,
  };
}

/** Assert the value is a variant with the given tag AND first payload (`_0`). */
export function toMatchVariantWith(received: unknown, tag: string, payload: unknown): MatcherResult {
  const tagPass = tagOf(received) === tag;
  const payloadActual = typeof received === 'object' && received !== null ? (received as Tagged)._0 : undefined;
  const pass = tagPass && Object.is(payloadActual, payload);
  return {
    pass,
    message: () => `expected variant "${tag}" with payload ${String(payload)}, got "${String(tagOf(received))}" / ${String(payloadActual)}`,
  };
}

/** Assert a `Result` is `Ok` or `Err`. */
export function toMatchResult(received: unknown, tag: 'Ok' | 'Err'): MatcherResult {
  return toMatchVariant(received, tag);
}

/** Assert an `Option` is `Some` or `None`. */
export function toMatchOption(received: unknown, tag: 'Some' | 'None'): MatcherResult {
  return toMatchVariant(received, tag);
}

/** The matcher set to pass to `expect.extend(...)`. */
export const matchers = { toMatchVariant, toMatchVariantWith, toMatchResult, toMatchOption };
