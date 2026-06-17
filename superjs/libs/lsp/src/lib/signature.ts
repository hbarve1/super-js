/**
 * `textDocument/signatureHelp` — when the cursor is inside a call's argument
 * list, show the callee's parameter signature and highlight the active argument.
 *
 * Pure-AST plus a type-resolution callback: the document is parsed to locate the
 * innermost enclosing `CallExpression`, then the callee's function type is
 * resolved through the supplied `resolveType` (wired to the compiler's `typeAt`
 * in the server). The active parameter is the count of top-level commas between
 * the opening paren and the cursor.
 */

import { parse } from '@superjs/parser';
import { model } from '@superjs/checker';
import type { Node, Position, Type, FunctionType } from '@superjs/types';

export interface ParameterInfo { label: string; }
export interface SignatureInfo { label: string; parameters: ParameterInfo[]; }
export interface SignatureHelp {
  signatures: SignatureInfo[];
  activeSignature: number;
  activeParameter: number;
}

/** Resolve the type at a source position (1-based line, 0-based column). */
export type ResolveType = (line: number, column: number) => Type | null;

interface CallNode { kind: 'CallExpression'; callee: Node; args: readonly Node[]; span: { start: Position; end: Position }; }

function isNode(v: unknown): v is Node {
  return typeof v === 'object' && v !== null && typeof (v as { kind?: unknown }).kind === 'string'
    && typeof (v as { span?: unknown }).span === 'object';
}

/** Innermost call whose span strictly contains `offset` (cursor inside the parens). */
function innermostCall(root: Node, offset: number): CallNode | null {
  let best: CallNode | null = null;
  const visit = (node: Node): void => {
    const span = (node as { span: { start: Position; end: Position } }).span;
    if (node.kind === 'CallExpression'
      && offset > span.start.offset && offset <= span.end.offset) {
      const c = node as unknown as CallNode;
      if (!best || width(c.span) < width(best.span)) best = c;
    }
    for (const key of Object.keys(node)) {
      const v = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(v)) { for (const e of v) if (isNode(e)) visit(e); }
      else if (isNode(v)) visit(v);
    }
  };
  visit(root);
  return best;
}

function width(s: { start: Position; end: Position }): number {
  return s.end.offset - s.start.offset;
}

/** The position at which to resolve the callee's type. */
function calleePosition(callee: Node): Position | null {
  if (callee.kind === 'Identifier') return (callee as { span: { start: Position } }).span.start;
  if (callee.kind === 'MemberExpression') {
    const prop = (callee as { computed: boolean; property: Node }).property;
    if (!(callee as { computed: boolean }).computed && prop.kind === 'Identifier') {
      return (prop as { span: { start: Position } }).span.start;
    }
  }
  return null;
}

/** Count top-level commas in `source[from, to)` — commas nested in (), [], {} don't count. */
function activeParameterIndex(source: string, from: number, to: number): number {
  let depth = 0;
  let commas = 0;
  for (let i = from; i < to && i < source.length; i++) {
    const ch = source[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) commas++;
  }
  return commas;
}

function paramLabel(p: FunctionType['params'][number]): string {
  return `${p.rest ? '...' : ''}${p.name}${p.optional ? '?' : ''}: ${model.display(p.type)}`;
}

/** Build signature help for the cursor offset, or null if not inside a call. */
export function signatureHelp(source: string, offset: number, resolveType: ResolveType): SignatureHelp | null {
  const { program } = parse(source);
  const call = innermostCall(program as unknown as Node, offset);
  if (!call) return null;

  const pos = calleePosition(call.callee);
  if (!pos) return null; // unsupported callee form (computed member, IIFE, …)
  const type = resolveType(pos.line, pos.column);
  if (!type || type.kind !== 'function') return null;

  const params = type.params.map((p) => ({ label: paramLabel(p) }));
  const label = `(${params.map((p) => p.label).join(', ')}) => ${model.display(type.returnType)}`;

  const openParen = source.indexOf('(', call.callee.span.end.offset);
  const active = openParen === -1 ? 0 : activeParameterIndex(source, openParen + 1, offset);
  const activeParameter = params.length === 0 ? 0 : Math.min(active, params.length - 1);

  return { signatures: [{ label, parameters: params }], activeSignature: 0, activeParameter };
}
