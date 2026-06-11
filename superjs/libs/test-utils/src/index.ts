/**
 * `@superjs/test-utils` (Tier 0, private) — shared test helpers.
 *
 * Fixture loading, diagnostic matchers, position-free AST snapshots, and a
 * compile-and-check shorthand (dependency-injected so Tier 0 stays free of the
 * compiler). Consumed only by other projects' test suites. Depends on types +
 * diagnostics.
 */

export { type Fixture, findFixtures, loadFixtures, loadFixture } from './lib/fixtures.js';
export {
  codesOf, hasCode, errorsOf, warningsOf, countBySeverity,
  matchesDiagnostic, assertDiagnostic, type DiagnosticMatch,
} from './lib/diagnostics.js';
export { snapshotNode, serializeNode, astEqual } from './lib/snapshot.js';
export { makeHarness, type CheckLike, type Harness } from './lib/check.js';
