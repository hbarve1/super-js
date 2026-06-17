/**
 * Identifier-occurrence queries backing the LSP M2 navigation methods —
 * `references`, `documentHighlight`, and `rename`.
 *
 * MVP scope: occurrences are matched by name within a single document (a textual
 * find over identifier nodes), the same model the roadmap specifies for v1.0
 * rename. Cross-file references and scope-precise (shadowing-aware) resolution
 * are later work once the LSP shares the checker's binder.
 */

import { parse } from '@superjs/parser';
import type { Node, Span } from '@superjs/types';

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

/** The identifier name at `offset`, or null when the cursor is not on one. */
export function identifierAt(source: string, offset: number): string | null {
  const { program } = parse(source);
  const hits: { name: string; width: number }[] = [];
  walk(program as unknown as Node, (n) => {
    if (n.kind !== 'Identifier') return;
    const span = (n as { span: Span }).span;
    if (offset < span.start.offset || offset > span.end.offset) return;
    hits.push({ name: (n as { name: string }).name, width: span.end.offset - span.start.offset });
  });
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.width - b.width); // smallest enclosing identifier
  return hits[0]!.name;
}

/** Spans of every identifier in the document whose name equals `name`. */
export function occurrences(source: string, name: string): Span[] {
  const { program } = parse(source);
  const spans: Span[] = [];
  walk(program as unknown as Node, (n) => {
    if (n.kind === 'Identifier' && (n as { name: string }).name === name) {
      spans.push((n as { span: Span }).span);
    }
  });
  return spans;
}
