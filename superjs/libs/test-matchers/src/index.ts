/**
 * `@superjs/test-matchers` — Jest/Vitest matchers for SuperJS sum types.
 * Call `expect.extend(matchers)` once, then assert with `toMatchResult`,
 * `toMatchOption`, `toMatchVariant`, and `toMatchVariantWith`.
 */

export {
  matchers,
  toMatchVariant, toMatchVariantWith, toMatchResult, toMatchOption,
  type MatcherResult,
} from './lib/matchers.js';
