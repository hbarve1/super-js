/**
 * @superjs/types — Tier 0 contracts.
 *
 * The single source of truth for cross-package interfaces: source spans,
 * lexical tokens, the AST, the semantic type-system model, diagnostics, and
 * scope. Zero runtime logic, (almost) zero dependencies.
 *
 * Naming convention to keep syntactic and semantic types distinct:
 *   - Syntactic type *annotations* (parser output) carry a `Node` suffix:
 *     `ArrayTypeNode`, `FunctionTypeNode`, `UnionTypeNode`, …
 *   - Semantic type-model types (checker output) are unsuffixed:
 *     `ArrayType`, `FunctionType`, `UnionType`, the `Type` union, …
 */

export * from './lib/span.js';
export * from './lib/token.js';
export * from './lib/diagnostic.js';
export * from './lib/ast.js';
export * from './lib/scope.js';
export * from './lib/sjs-type.js';
