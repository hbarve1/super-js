/**
 * Lexical scope: a chain of value-binding tables. Type narrowing facts are
 * tracked separately by the checker as flow state, not stored here.
 */

import type { Type } from '@superjs/types';

export interface Binding {
  type: Type;
  /** `false` for `const` / `readonly` — reassignment is SJS-E002 territory. */
  readonly mutable: boolean;
  /** Declaration kind, for diagnostics. */
  readonly kind: 'const' | 'let' | 'var' | 'param' | 'function' | 'class';
}

export class Scope {
  private readonly vars = new Map<string, Binding>();

  constructor(readonly parent?: Scope) {}

  define(name: string, binding: Binding): void {
    this.vars.set(name, binding);
  }

  /** Resolve a binding, walking up the parent chain. */
  lookup(name: string): Binding | undefined {
    return this.vars.get(name) ?? this.parent?.lookup(name);
  }

  has(name: string): boolean {
    return this.vars.has(name);
  }

  child(): Scope {
    return new Scope(this);
  }
}
