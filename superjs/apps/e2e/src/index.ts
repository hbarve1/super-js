/**
 * `@superjs/e2e` (Tier app) — the end-to-end test harness. It compiles the
 * example corpus through the real `@superjs/compiler` pipeline and asserts
 * crash-safety, determinism, grammar coverage, and runtime fidelity. Exports
 * fixture helpers for the spec files.
 */

export { FIXTURES_DIR, loadFixtures, type Fixture } from './lib/corpus.js';
