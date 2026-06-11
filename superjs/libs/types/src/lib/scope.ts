/**
 * Symbols and scope entries — shared between checker and LSP.
 */

import type { Span } from './span.js';
import type { Type } from './sjs-type.js';

export type SymbolKind =
  | 'variable'
  | 'function'
  | 'parameter'
  | 'class'
  | 'interface'
  | 'type-alias'
  | 'sum-type'
  | 'sum-variant'
  | 'property'
  | 'method'
  | 'enum-member'
  | 'import'
  | 'type-param';

export type BindingKind = 'const' | 'let' | 'var' | 'param' | 'type';

export interface SymbolInfo {
  readonly name: string;
  readonly kind: SymbolKind;
  /** Resolved type, when known. */
  readonly type?: Type;
  /** Declaration site. */
  readonly declaredAt: Span;
  readonly binding?: BindingKind;
  /** True for `const` / `readonly` bindings — assignment is an error. */
  readonly mutable: boolean;
  readonly exported: boolean;
}

export type ScopeKind =
  | 'module'
  | 'function'
  | 'block'
  | 'class'
  | 'for'
  | 'catch';

export interface ScopeEntry {
  readonly kind: ScopeKind;
  readonly symbols: ReadonlyMap<string, SymbolInfo>;
  readonly parent?: ScopeEntry;
}
