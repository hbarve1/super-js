/**
 * @superjs/lexer — Tier 1.
 *
 * Source string → token stream + diagnostics. Depends on @superjs/types
 * (Token/Span) and @superjs/diagnostics (codes, DiagnosticBag).
 */

export { tokenize } from './lib/lexer.js';
export type { TokenizeOptions, TokenizeResult } from './lib/lexer.js';
