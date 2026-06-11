/**
 * Token cursor + diagnostic/recovery helpers shared by the parser.
 */

import type { Diagnostic, Position, Span, Token, TokenKind } from '@superjs/types';
import { DiagnosticBag, Codes } from '@superjs/diagnostics';

/** Thrown to unwind to the nearest statement-recovery boundary. */
export class ParseError extends Error {}

const MAX_ERRORS = 100;

export class Cursor {
  private i = 0;
  readonly bag: DiagnosticBag;
  private errorCount = 0;
  private abandoned = false;

  constructor(
    private readonly tokens: readonly Token[],
    opts: { file?: string; strict?: boolean } = {},
  ) {
    this.bag = new DiagnosticBag({ file: opts.file, strict: opts.strict ?? false });
  }

  get current(): Token {
    return this.tokens[this.i] ?? this.eofToken();
  }

  peek(offset = 0): Token {
    return this.tokens[this.i + offset] ?? this.eofToken();
  }

  private eofToken(): Token {
    return this.tokens[this.tokens.length - 1] as Token;
  }

  get atEnd(): boolean {
    return this.current.kind === 'eof';
  }

  get position(): Position {
    return this.current.span.start;
  }

  /** Save/restore index for backtracking (arrow detection, etc.). */
  mark(): number {
    return this.i;
  }
  reset(mark: number): void {
    this.i = mark;
  }

  /** Full snapshot incl. reported diagnostics — for speculative parsing. */
  snapshot(): { i: number; bag: number; errors: number; abandoned: boolean } {
    return { i: this.i, bag: this.bag.mark(), errors: this.errorCount, abandoned: this.abandoned };
  }
  restore(s: { i: number; bag: number; errors: number; abandoned: boolean }): void {
    this.i = s.i;
    this.bag.rollback(s.bag);
    this.errorCount = s.errors;
    this.abandoned = s.abandoned;
  }

  is(kind: TokenKind): boolean {
    return this.current.kind === kind;
  }

  isAny(...kinds: TokenKind[]): boolean {
    return kinds.includes(this.current.kind);
  }

  /** Consume + return the current token. */
  advance(): Token {
    const t = this.current;
    if (!this.atEnd) this.i++;
    return t;
  }

  /** Consume if the current token matches; report whether it did. */
  eat(kind: TokenKind): boolean {
    if (this.is(kind)) {
      this.advance();
      return true;
    }
    return false;
  }

  /** Consume a token of `kind` or emit P001 and throw to recover. */
  expect(kind: TokenKind, message?: string): Token {
    if (this.is(kind)) return this.advance();
    this.error(Codes['P001'], message ?? `Expected '${kind}' but found '${this.current.kind}'`);
    throw new ParseError();
  }

  /** ASI-aware statement terminator. */
  consumeSemicolon(): void {
    if (this.eat(';')) return;
    if (this.atEnd || this.is('}') || this.current.precededByLineBreak) return;
    this.error(Codes['P001'], `Expected ';' but found '${this.current.kind}'`);
  }

  spanFrom(start: Position): Span {
    const prev = this.tokens[this.i - 1] ?? this.current;
    return { start, end: prev.span.end };
  }

  error(code: string, message: string, span?: Span): void {
    if (this.abandoned) return;
    this.bag.report({ code, span: span ?? this.current.span, message });
    if (++this.errorCount >= MAX_ERRORS) {
      this.abandoned = true;
      this.bag.report({ code: Codes['P099'], span: this.current.span });
    }
  }

  get isAbandoned(): boolean {
    return this.abandoned;
  }

  /** Skip tokens until a likely statement boundary (panic-mode recovery). */
  synchronize(): void {
    if (!this.atEnd) this.advance();
    while (!this.atEnd) {
      if (this.tokens[this.i - 1]?.kind === ';') return;
      if (this.current.precededByLineBreak) return;
      if (
        this.isAny(
          '}', 'const', 'let', 'var', 'function', 'class', 'interface', 'type',
          'if', 'for', 'while', 'do', 'switch', 'return', 'throw', 'try',
          'import', 'export', 'break', 'continue',
        )
      ) {
        return;
      }
      this.advance();
    }
  }

  get diagnostics(): readonly Diagnostic[] {
    return this.bag.all;
  }
}
