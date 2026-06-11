/**
 * Source positions and spans.
 *
 * Coordinate convention:
 *   - `offset`  — 0-based UTF-16 code-unit index into the source string
 *   - `line`    — 1-based line number
 *   - `column`  — 0-based column (UTF-16 code units from line start)
 *
 * Every AST node, token, and diagnostic carries a {@link Span} so downstream
 * stages (checker, codegen source-maps, LSP) can map back to source exactly.
 */

export interface Position {
  /** 0-based UTF-16 code-unit offset from the start of the file. */
  readonly offset: number;
  /** 1-based line number. */
  readonly line: number;
  /** 0-based column (UTF-16 code units from the start of the line). */
  readonly column: number;
}

export interface Span {
  readonly start: Position;
  readonly end: Position;
}

/** The synthetic position used for compiler-generated nodes with no source origin. */
export const SYNTHETIC_POSITION: Position = Object.freeze({
  offset: 0,
  line: 1,
  column: 0,
});

/** The synthetic span used for compiler-generated nodes. */
export const SYNTHETIC_SPAN: Span = Object.freeze({
  start: SYNTHETIC_POSITION,
  end: SYNTHETIC_POSITION,
});

export function position(offset: number, line: number, column: number): Position {
  return { offset, line, column };
}

export function span(start: Position, end: Position): Span {
  return { start, end };
}

/** Combine two spans into one that covers both (assumes `a` precedes `b`). */
export function mergeSpans(a: Span, b: Span): Span {
  return { start: a.start, end: b.end };
}

/** True if `pos` lies within `[span.start, span.end)` by offset. */
export function spanContains(s: Span, pos: Position): boolean {
  return pos.offset >= s.start.offset && pos.offset < s.end.offset;
}
