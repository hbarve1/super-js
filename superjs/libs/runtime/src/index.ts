/**
 * @superjs/runtime — Tier 5.
 *
 * Pure runtime helpers that ship with compiled SJS apps. Zero compiler
 * dependencies. Codegen emits calls to these for panics, assertions,
 * unreachable tails, iterator wiring, and debug formatting.
 */

export * from './lib/panic.js';
export * from './lib/iterator.js';
export * from './lib/inspect.js';
