/**
 * `@superjs/interop` (Tier 4) — TypeScript ↔ SuperJS interop.
 *
 * Translates `.d.ts` type declarations to `.d.sjs`, using the TypeScript compiler
 * API to parse and `@superjs/compiler`'s `emitTypeDecl` to print. The
 * `typescript` dependency is confined to this tool — the core compiler pipeline
 * stays TS-free.
 */

export { translateDts, type TranslateResult } from './lib/translate.js';
