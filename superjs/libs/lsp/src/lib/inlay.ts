/**
 * `textDocument/inlayHint` — inferred-type hints after a `const`/`let` binding
 * that has an initialiser but no written type annotation. The hint renders the
 * initialiser's type (resolved through the compiler's `typeAt`, since the
 * binding identifier itself is not a typed span) as `: T` just after the name.
 *
 * MVP scope: variable type hints only. Parameter-name hints at call sites and
 * return-type hints are later work.
 */

import { parse } from '@superjs/parser';
import { model } from '@superjs/checker';
import type { Node, Position, Type } from '@superjs/types';

/** Resolve the type at a source position (1-based line, 0-based column). */
export type ResolveType = (line: number, column: number) => Type | null;

export interface InlayHint {
  position: { line: number; character: number };
  label: string;
  kind: number;        // 1 = Type, 2 = Parameter
  paddingLeft: boolean;
}

function isNode(v: unknown): v is Node {
  return typeof v === 'object' && v !== null && typeof (v as { kind?: unknown }).kind === 'string'
    && typeof (v as { span?: unknown }).span === 'object';
}

function walk(node: Node, visit: (n: Node) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    const v = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(v)) { for (const e of v) if (isNode(e)) walk(e, visit); }
    else if (isNode(v)) walk(v, visit);
  }
}

/** Inferred-type inlay hints for a document. */
export function inlayHints(source: string, resolveType: ResolveType): InlayHint[] {
  const { program } = parse(source);
  const hints: InlayHint[] = [];
  walk(program as unknown as Node, (n) => {
    if ((n as { kind: string }).kind !== 'VariableDeclarator') return;
    const d = n as unknown as {
      id: { kind: string; span: { end: Position } };
      typeAnnotation?: unknown;
      init?: { span: { start: Position } };
    };
    if (d.typeAnnotation || !d.init || d.id.kind !== 'Identifier') return;
    const type = resolveType(d.init.span.start.line, d.init.span.start.column);
    if (!type) return;
    hints.push({
      position: { line: d.id.span.end.line - 1, character: d.id.span.end.column },
      label: `: ${model.display(type)}`,
      kind: 1,
      paddingLeft: false,
    });
  });
  return hints;
}
