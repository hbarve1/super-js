/**
 * `textDocument/completion` — completion proposals for a document.
 *
 * MVP scope: the document's own top-level declarations, the SJS keywords, and
 * the built-in primitive type names. It is position-insensitive (the same set
 * regardless of cursor) — scope-aware filtering and member completion after `.`
 * are later slices once the LSP exposes per-position scope from the checker.
 */

import { documentSymbols } from './symbols.js';

/** LSP `CompletionItemKind`. */
const Kind = { Function: 3, Variable: 6, Class: 7, Interface: 8, Keyword: 14, Constant: 21 } as const;

/** Map a `SymbolKind` (from {@link documentSymbols}) to a `CompletionItemKind`. */
const SYMBOL_TO_COMPLETION: Record<number, number> = {
  12: Kind.Function,  // Function
  5: Kind.Class,      // Class
  11: Kind.Interface, // Interface (type)
  14: Kind.Constant,  // Constant
  13: Kind.Variable,  // Variable
};

const KEYWORDS = [
  'const', 'let', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'match', 'type', 'class', 'extends', 'import', 'export', 'from', 'default',
  'async', 'await', 'yield', 'new', 'true', 'false', 'null', 'undefined',
  'break', 'continue', 'throw', 'try', 'catch', 'finally',
];

const PRIMITIVE_TYPES = [
  'number', 'string', 'boolean', 'bigint', 'symbol', 'void', 'never',
  'unknown', 'object', 'dynamic',
];

export interface CompletionItem { label: string; kind: number; }

/** Build the completion list for a document's source. */
export function completions(source: string): CompletionItem[] {
  const seen = new Set<string>();
  const items: CompletionItem[] = [];
  const add = (label: string, kind: number) => {
    if (seen.has(label)) return;
    seen.add(label);
    items.push({ label, kind });
  };
  // Local declarations first — the most relevant proposals.
  for (const s of documentSymbols(source)) add(s.name, SYMBOL_TO_COMPLETION[s.kind] ?? Kind.Variable);
  for (const t of PRIMITIVE_TYPES) add(t, Kind.Keyword);
  for (const k of KEYWORDS) add(k, Kind.Keyword);
  return items;
}
