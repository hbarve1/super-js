/**
 * @superjs/parser — Tier 1.
 *
 * Token stream → AST. Recursive-descent + Pratt, panic-mode recovery.
 * Depends on @superjs/types, @superjs/diagnostics, @superjs/lexer.
 */

export { parse } from './lib/parser.js';
export type { ParseOptions, ParseResult } from './lib/parser.js';
