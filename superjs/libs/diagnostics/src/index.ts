/**
 * @superjs/diagnostics — Tier 0.
 *
 * The SJS-P/E/W/L code registry (code → severity, category, message template,
 * spec URL) plus diagnostic construction and the {@link DiagnosticBag} collector
 * used by lexer, parser, and checker. Depends only on @superjs/types.
 */

export * from './lib/registry.js';
export * from './lib/factory.js';
