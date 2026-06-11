/**
 * Lexical tokens — the lexer's output alphabet.
 *
 * `TokenKind` is a string-literal union (not a numeric enum) for debuggability
 * and exhaustive `switch` checking. Keyword tokens keep the literal keyword as
 * the kind; punctuators use descriptive names.
 *
 * Source of truth for keywords/operators: specs/grammar.ebnf.
 */

import type { Span } from './span.js';

// ── Reserved keywords (grammar.ebnf §Identifiers and Keywords) ────────────────
export const KEYWORDS = [
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'dynamic', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
  'match', 'new', 'null', 'of', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with',
  'yield', 'abstract', 'async', 'as', 'declare', 'from', 'get', 'interface',
  'object', 'readonly', 'set', 'type',
] as const;

export type Keyword = (typeof KEYWORDS)[number];

export const KEYWORD_SET: ReadonlySet<string> = new Set(KEYWORDS);

/**
 * Identifiers that are banned in SJS (grammar.ebnf §Banned identifiers). The
 * lexer still tokenizes them as identifiers; the parser/checker emits an error
 * so the message can be precise (e.g. SJS-E* "use `dynamic` instead of `any`").
 */
export const BANNED_IDENTIFIERS = ['any', 'enum', 'namespace', 'infer'] as const;
export const BANNED_IDENTIFIER_SET: ReadonlySet<string> = new Set(BANNED_IDENTIFIERS);

// ── Punctuators & operators ───────────────────────────────────────────────────
export type PunctuatorKind =
  | '{' | '}' | '(' | ')' | '[' | ']'
  | ';' | ',' | '.' | '...' | ':' | '?' | '?.' | '=>' | '@'
  // assignment
  | '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '**='
  | '&&=' | '||=' | '??=' | '&=' | '|=' | '^=' | '<<=' | '>>=' | '>>>='
  // arithmetic
  | '+' | '-' | '*' | '/' | '%' | '**'
  // comparison
  | '===' | '!==' | '==' | '!=' | '<' | '>' | '<=' | '>='
  // logical
  | '&&' | '||' | '??' | '!'
  // bitwise
  | '&' | '|' | '^' | '~' | '<<' | '>>' | '>>>'
  // update
  | '++' | '--';

// ── Literal/structural token kinds ────────────────────────────────────────────
export type LiteralTokenKind =
  | 'number'
  | 'string'
  | 'bigint'
  | 'regex'
  | 'template-full'      // `no substitutions`
  | 'template-head'      // `head${
  | 'template-middle'    // }middle${
  | 'template-tail';     // }tail`

export type TriviaTokenKind = 'line-comment' | 'block-comment';

export type TokenKind =
  | Keyword
  | PunctuatorKind
  | LiteralTokenKind
  | TriviaTokenKind
  | 'identifier'
  | 'private-identifier' // #field
  | 'jsx-text'
  | 'eof'
  | 'unknown';           // lexer error-recovery placeholder

export interface Token {
  readonly kind: TokenKind;
  /** Raw source text of the token (exact slice). */
  readonly value: string;
  readonly span: Span;
  /**
   * True if at least one line terminator appears in the trivia immediately
   * before this token — required for ASI and for distinguishing `return\nx`.
   */
  readonly precededByLineBreak: boolean;
}

/** Trivia (comments/whitespace) the lexer may surface for the formatter. */
export interface Trivia {
  readonly kind: TriviaTokenKind | 'whitespace' | 'newline';
  readonly value: string;
  readonly span: Span;
}

export function isKeyword(kind: TokenKind): kind is Keyword {
  return KEYWORD_SET.has(kind);
}
