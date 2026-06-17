/**
 * Pure-AST LSP queries: `textDocument/documentSymbol` (outline) and
 * `textDocument/foldingRange`. Neither needs type information, so both parse
 * the document source directly via `@superjs/parser` and walk the top level.
 */

import { parse } from '@superjs/parser';
import type { Statement, Span, Identifier } from '@superjs/types';

/** LSP `SymbolKind` subset we emit. */
const SymbolKind = { Class: 5, Interface: 11, Function: 12, Variable: 13, Constant: 14 } as const;

interface LspRange { start: { line: number; character: number }; end: { line: number; character: number }; }
interface DocumentSymbol {
  name: string;
  kind: number;
  range: LspRange;
  selectionRange: LspRange;
}
interface FoldingRange { startLine: number; endLine: number; }

function range(span: Span): LspRange {
  return {
    start: { line: span.start.line - 1, character: span.start.column },
    end: { line: span.end.line - 1, character: span.end.column },
  };
}

function sym(id: Identifier, kind: number, full: Span): DocumentSymbol {
  return { name: id.name, kind, range: range(full), selectionRange: range(id.span) };
}

/** One declaration → its outline symbols (a `VariableDecl` may yield several). */
function fromDecl(d: Statement, full: Span): DocumentSymbol[] {
  switch (d.kind) {
    case 'FunctionDecl': return [sym(d.id, SymbolKind.Function, full)];
    case 'ClassDecl': return [sym(d.id, SymbolKind.Class, full)];
    case 'TypeDecl': return [sym(d.id, SymbolKind.Interface, full)];
    case 'ObjectTypeDecl': return [sym(d.id, SymbolKind.Interface, full)];
    case 'VariableDecl':
      return d.declarators.flatMap((dec) => dec.id.kind === 'Identifier'
        ? [sym(dec.id, d.declKind === 'const' ? SymbolKind.Constant : SymbolKind.Variable, full)]
        : []);
    default: return [];
  }
}

/** Top-level outline. Exported declarations are unwrapped to the inner decl. */
export function documentSymbols(source: string): DocumentSymbol[] {
  const { program } = parse(source);
  const out: DocumentSymbol[] = [];
  for (const s of program.body) {
    if (s.kind === 'ExportNamedDecl' && s.declaration) {
      out.push(...fromDecl(s.declaration, s.span));
    } else if (s.kind === 'ExportDefaultDecl'
      && (s.declaration.kind === 'FunctionDecl' || s.declaration.kind === 'ClassDecl')) {
      out.push(...fromDecl(s.declaration as Statement, s.span));
    } else {
      out.push(...fromDecl(s, s.span));
    }
  }
  return out;
}

/** Foldable regions: any top-level declaration spanning more than one line. */
export function foldingRanges(source: string): FoldingRange[] {
  const { program } = parse(source);
  const out: FoldingRange[] = [];
  for (const s of program.body) {
    const startLine = s.span.start.line - 1;
    const endLine = s.span.end.line - 1;
    if (endLine > startLine) out.push({ startLine, endLine });
  }
  return out;
}
