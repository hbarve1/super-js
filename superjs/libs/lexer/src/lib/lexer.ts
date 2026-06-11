/**
 * SJS lexer — source string → token stream.
 *
 * Recursive-descent scanner with: all numeric bases + separators + bigint,
 * single/double strings with escapes, template literals (including nested
 * `${…}` substitutions via a brace/template stack), regex-vs-division
 * disambiguation by previous token, maximal-munch operators, and BiDi
 * control-character rejection (SJS-L011).
 */

import type { Diagnostic, Position, Span, Token, TokenKind } from '@superjs/types';
import { KEYWORD_SET } from '@superjs/types';
import { DiagnosticBag, Codes } from '@superjs/diagnostics';
import {
  isBidiControl,
  isBinaryDigit,
  isDecimalDigit,
  isHexDigit,
  isIdentifierPart,
  isIdentifierStart,
  isLineTerminator,
  isOctalDigit,
  isWhitespace,
} from './char.js';

export interface TokenizeOptions {
  readonly file?: string;
  readonly strict?: boolean;
}

export interface TokenizeResult {
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly Diagnostic[];
}

type BraceContext = 'brace' | 'template';

/** Token kinds after which `/` begins division, not a regex literal. */
const NO_REGEX_AFTER = new Set<TokenKind>([
  'identifier', 'private-identifier', 'number', 'string', 'bigint', 'regex',
  'template-full', 'template-tail', ')', ']', '}', '++', '--',
  'this', 'super', 'true', 'false', 'null', 'undefined',
]);

export function tokenize(source: string, options: TokenizeOptions = {}): TokenizeResult {
  return new Lexer(source, options).run();
}

class Lexer {
  private pos = 0;
  private line = 1;
  private col = 0;
  private readonly tokens: Token[] = [];
  private readonly bag: DiagnosticBag;
  private readonly braces: BraceContext[] = [];
  private prevKind: TokenKind | undefined;
  private sawLineBreak = false;

  constructor(private readonly src: string, opts: TokenizeOptions) {
    this.bag = new DiagnosticBag({ strict: opts.strict ?? false, file: opts.file });
  }

  run(): TokenizeResult {
    for (;;) {
      this.skipTrivia();
      if (this.atEnd()) break;
      this.scanToken();
    }
    this.push('eof', '', this.mark());
    return { tokens: this.tokens, diagnostics: this.bag.all };
  }

  // ── cursor ──────────────────────────────────────────────────────────────────
  private atEnd(): boolean {
    return this.pos >= this.src.length;
  }
  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? '';
  }
  private mark(): Position {
    return { offset: this.pos, line: this.line, column: this.col };
  }
  private advance(): string {
    const ch = this.src[this.pos] as string;
    this.pos++;
    if (ch === '\r') {
      if (this.src[this.pos] === '\n') {
        this.pos++;
      }
      this.line++;
      this.col = 0;
      return '\n';
    }
    if (ch === '\n' || isLineTerminator(ch)) {
      this.line++;
      this.col = 0;
      return ch;
    }
    this.col++;
    return ch;
  }

  private span(start: Position): Span {
    return { start, end: this.mark() };
  }

  private push(kind: TokenKind, value: string, start: Position): void {
    this.tokens.push({
      kind,
      value,
      span: this.span(start),
      precededByLineBreak: this.sawLineBreak,
    });
    this.prevKind = kind;
    this.sawLineBreak = false;
  }

  // ── trivia ──────────────────────────────────────────────────────────────────
  private skipTrivia(): void {
    for (;;) {
      const ch = this.peek();
      if (ch === '') return;
      if (isLineTerminator(ch)) {
        this.sawLineBreak = true;
        this.advance();
      } else if (isWhitespace(ch)) {
        this.advance();
      } else if (ch === '/' && this.peek(1) === '/') {
        this.skipLineComment();
      } else if (ch === '/' && this.peek(1) === '*') {
        this.skipBlockComment();
      } else if (isBidiControl(ch)) {
        this.reportBidi(this.mark());
        this.advance();
      } else {
        return;
      }
    }
  }

  private skipLineComment(): void {
    this.advance(); // /
    this.advance(); // /
    while (!this.atEnd() && !isLineTerminator(this.peek())) {
      if (isBidiControl(this.peek())) this.reportBidi(this.mark());
      this.advance();
    }
  }

  private skipBlockComment(): void {
    const start = this.mark();
    this.advance(); // /
    this.advance(); // *
    while (!this.atEnd()) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        return;
      }
      if (isLineTerminator(this.peek())) this.sawLineBreak = true;
      if (isBidiControl(this.peek())) this.reportBidi(this.mark());
      this.advance();
    }
    this.error(Codes['P002'], 'Unterminated block comment', this.span(start));
  }

  // ── token dispatch ──────────────────────────────────────────────────────────
  private scanToken(): void {
    const start = this.mark();
    const ch = this.peek();

    if (isBidiControl(ch)) {
      this.reportBidi(start);
      this.advance();
      this.push('unknown', ch, start);
      return;
    }
    if (isIdentifierStart(ch)) return this.scanIdentifier(start);
    if (ch === '#') return this.scanPrivateIdentifier(start);
    if (isDecimalDigit(ch) || (ch === '.' && isDecimalDigit(this.peek(1)))) {
      return this.scanNumber(start);
    }
    if (ch === '"' || ch === "'") return this.scanString(start, ch);
    if (ch === '`') return this.scanTemplate(start);
    if (ch === '/' && this.regexAllowed()) return this.scanRegex(start);
    if (ch === '}') return this.scanCloseBrace(start);
    return this.scanPunctuator(start);
  }

  private regexAllowed(): boolean {
    return this.prevKind === undefined || !NO_REGEX_AFTER.has(this.prevKind);
  }

  // ── identifiers / keywords ──────────────────────────────────────────────────
  private scanIdentifier(start: Position): void {
    let value = '';
    while (!this.atEnd() && isIdentifierPart(this.peek())) {
      value += this.advance();
    }
    const kind: TokenKind = KEYWORD_SET.has(value) ? (value as TokenKind) : 'identifier';
    this.push(kind, value, start);
  }

  private scanPrivateIdentifier(start: Position): void {
    let value = this.advance(); // #
    while (!this.atEnd() && isIdentifierPart(this.peek())) {
      value += this.advance();
    }
    this.push('private-identifier', value, start);
  }

  // ── numbers ─────────────────────────────────────────────────────────────────
  private scanNumber(start: Position): void {
    let value = '';
    const first = this.peek();
    if (first === '0' && /[xXoObB]/.test(this.peek(1))) {
      value += this.advance(); // 0
      const radix = this.advance(); // x/o/b
      value += radix;
      const isValid =
        radix === 'x' || radix === 'X' ? isHexDigit
        : radix === 'o' || radix === 'O' ? isOctalDigit
        : isBinaryDigit;
      value += this.scanDigits(isValid);
      if (this.peek() === 'n') value += this.advance();
      this.push(value.endsWith('n') ? 'bigint' : 'number', value, start);
      return;
    }

    value += this.scanDigits(isDecimalDigit);
    let isFloat = false;
    if (this.peek() === '.') {
      isFloat = true;
      value += this.advance();
      value += this.scanDigits(isDecimalDigit);
    }
    if (this.peek() === 'e' || this.peek() === 'E') {
      isFloat = true;
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') value += this.advance();
      value += this.scanDigits(isDecimalDigit);
    }
    if (!isFloat && this.peek() === 'n') {
      value += this.advance();
      this.push('bigint', value, start);
      return;
    }
    this.push('number', value, start);
  }

  /** Scan a run of digits, allowing single `_` separators between digits. */
  private scanDigits(valid: (ch: string) => boolean): string {
    let out = '';
    while (!this.atEnd()) {
      const ch = this.peek();
      if (valid(ch)) {
        out += this.advance();
      } else if (ch === '_' && valid(this.peek(1)) && out.length > 0) {
        out += this.advance();
      } else {
        break;
      }
    }
    return out;
  }

  // ── strings ─────────────────────────────────────────────────────────────────
  private scanString(start: Position, quote: string): void {
    let raw = this.advance(); // opening quote
    for (;;) {
      if (this.atEnd()) {
        this.error(Codes['P002'], 'Unterminated string literal', this.span(start));
        break;
      }
      const ch = this.peek();
      if (ch === quote) {
        raw += this.advance();
        break;
      }
      if (isLineTerminator(ch)) {
        this.error(Codes['P001'], 'Line break in string literal', this.span(start));
        break;
      }
      if (isBidiControl(ch)) this.reportBidi(this.mark());
      if (ch === '\\') {
        raw += this.advance(); // backslash
        if (!this.atEnd()) raw += this.advance(); // escaped char (incl. line continuation)
      } else {
        raw += this.advance();
      }
    }
    this.push('string', raw, start);
  }

  // ── templates ───────────────────────────────────────────────────────────────
  /** Scan from the opening backtick. Emits template-full or template-head. */
  private scanTemplate(start: Position): void {
    this.advance(); // `
    const term = this.scanTemplateBody();
    if (term === 'end') {
      this.push('template-full', this.slice(start), start);
    } else {
      this.push('template-head', this.slice(start), start);
      this.braces.push('template');
    }
  }

  /** Handle `}` — either close a brace or resume a template after `${ … }`. */
  private scanCloseBrace(start: Position): void {
    if (this.braces[this.braces.length - 1] === 'template') {
      this.braces.pop();
      this.advance(); // }
      const term = this.scanTemplateBody();
      if (term === 'end') {
        this.push('template-tail', this.slice(start), start);
      } else {
        this.push('template-middle', this.slice(start), start);
        this.braces.push('template');
      }
      return;
    }
    if (this.braces[this.braces.length - 1] === 'brace') this.braces.pop();
    this.advance();
    this.push('}', '}', start);
  }

  /** Consume template chars until a closing backtick ('end') or `${` ('substitution'). */
  private scanTemplateBody(): 'end' | 'substitution' {
    for (;;) {
      if (this.atEnd()) {
        this.error(Codes['P002'], 'Unterminated template literal', this.span(this.mark()));
        return 'end';
      }
      const ch = this.peek();
      if (ch === '`') {
        this.advance();
        return 'end';
      }
      if (ch === '$' && this.peek(1) === '{') {
        this.advance();
        this.advance();
        return 'substitution';
      }
      if (ch === '\\') {
        this.advance();
        if (!this.atEnd()) this.advance();
        continue;
      }
      if (isBidiControl(ch)) this.reportBidi(this.mark());
      this.advance();
    }
  }

  private slice(start: Position): string {
    return this.src.slice(start.offset, this.pos);
  }

  // ── regex ───────────────────────────────────────────────────────────────────
  private scanRegex(start: Position): void {
    let raw = this.advance(); // /
    let inClass = false;
    for (;;) {
      if (this.atEnd() || isLineTerminator(this.peek())) {
        this.error(Codes['P001'], 'Unterminated regular expression', this.span(start));
        break;
      }
      const ch = this.peek();
      if (ch === '\\') {
        raw += this.advance();
        if (!this.atEnd()) raw += this.advance();
        continue;
      }
      if (ch === '[') inClass = true;
      else if (ch === ']') inClass = false;
      else if (ch === '/' && !inClass) {
        raw += this.advance(); // closing /
        while (!this.atEnd() && isIdentifierPart(this.peek())) raw += this.advance();
        break;
      }
      raw += this.advance();
    }
    this.push('regex', raw, start);
  }

  // ── punctuators (maximal munch) ─────────────────────────────────────────────
  private scanPunctuator(start: Position): void {
    const three = this.src.slice(this.pos, this.pos + 4);
    const candidates: TokenKind[] = [
      '>>>=', '...', '>>>', '===', '!==', '**=', '<<=', '>>=', '&&=', '||=', '??=',
      '?.', '=>', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
      '==', '!=', '<=', '>=', '&&', '||', '??', '<<', '>>', '**',
      '{', '}', '(', ')', '[', ']', ';', ',', '.', '?', ':', '@', '~',
      '+', '-', '*', '/', '%', '<', '>', '=', '!', '&', '|', '^',
    ];
    for (const op of candidates) {
      if (three.startsWith(op)) {
        // `?.` must not be `?.5` (conditional + number) — but `.5` after ? is rare; JS treats ?. only if next isn't a digit
        if (op === '?.' && isDecimalDigit(this.peek(2))) continue;
        for (let i = 0; i < op.length; i++) this.advance();
        if (op === '{') this.braces.push('brace');
        this.push(op as TokenKind, op, start);
        return;
      }
    }
    // Unknown character — emit a diagnostic and a placeholder token to recover.
    const ch = this.advance();
    this.error(Codes['P001'], `Unexpected character '${ch}'`, this.span(start));
    this.push('unknown', ch, start);
  }

  // ── diagnostics ─────────────────────────────────────────────────────────────
  private error(code: string, message: string, span: Span): void {
    this.bag.report({ code, span, message });
  }

  private reportBidi(start: Position): void {
    this.bag.report({
      code: Codes['L011'],
      span: { start, end: { offset: start.offset + 1, line: start.line, column: start.column + 1 } },
    });
  }
}
