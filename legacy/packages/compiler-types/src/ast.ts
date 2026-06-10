import type { SourceSpan } from './span.js';

export interface AstNode {
  readonly kind: string;
  readonly span: SourceSpan;
}

export interface AstNodeWithChildren extends AstNode {
  readonly children: readonly AstNode[];
}
