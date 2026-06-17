/**
 * `textDocument/semanticTokens/full` — lexer-driven token classification for
 * richer, semantic-aware highlighting than a TextMate grammar can give.
 *
 * MVP scope: classification is purely lexical (keyword / string / number /
 * variable). Distinguishing functions, types, parameters and properties needs
 * the binder, and lands in a later slice. Tokens that span more than one line
 * (multi-line template literals) are skipped — the LSP encoding requires every
 * token to be single-line.
 */

import { tokenize } from '@superjs/lexer';
import { KEYWORD_SET } from '@superjs/types';
import type { TokenKind } from '@superjs/types';

/** The token-type legend, declared in the server capability and indexed below. */
export const TOKEN_TYPES = ['keyword', 'string', 'number', 'variable'] as const;
export const TOKEN_MODIFIERS: readonly string[] = [];

const STRING_KINDS = new Set<TokenKind>([
  'string', 'regex', 'template-full', 'template-head', 'template-middle', 'template-tail',
]);

/** Map a token kind to its legend index, or null to skip (punctuation, eof, …). */
function classify(kind: TokenKind): number | null {
  if (KEYWORD_SET.has(kind)) return 0;       // keyword
  if (STRING_KINDS.has(kind)) return 1;      // string
  if (kind === 'number' || kind === 'bigint') return 2; // number
  if (kind === 'identifier' || kind === 'private-identifier') return 3; // variable
  return null;
}

/**
 * Encode a document's semantic tokens as the LSP flat integer array: five
 * fields per token — deltaLine, deltaStartChar, length, tokenType, modifiers —
 * each position relative to the previous emitted token.
 */
export function semanticTokens(source: string): number[] {
  const { tokens } = tokenize(source);
  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;
  for (const t of tokens) {
    const type = classify(t.kind);
    if (type === null) continue;
    if (t.span.start.line !== t.span.end.line) continue; // single-line tokens only
    const line = t.span.start.line - 1; // LSP rows are 0-based
    const char = t.span.start.column;
    const length = t.span.end.offset - t.span.start.offset;
    const deltaLine = line - prevLine;
    const deltaChar = deltaLine === 0 ? char - prevChar : char;
    data.push(deltaLine, deltaChar, length, type, 0);
    prevLine = line;
    prevChar = char;
  }
  return data;
}
