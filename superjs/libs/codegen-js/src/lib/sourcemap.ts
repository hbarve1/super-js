/**
 * Source Map v3 construction (specs/language/054-source-maps.md).
 *
 * Collects (generated → original) position segments and encodes them as a
 * Base64-VLQ `mappings` string. Deterministic: segments are emitted in the
 * order tokens are written, columns are 0-based, all deltas are relative as the
 * v3 spec requires.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64-VLQ encode a single signed integer. */
function vlq(value: number): string {
  let v = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = '';
  do {
    let digit = v & 0b11111;
    v >>>= 5;
    if (v > 0) digit |= 0b100000; // continuation bit
    out += B64[digit];
  } while (v > 0);
  return out;
}

export interface Segment {
  /** 0-based generated column. */
  readonly genColumn: number;
  /** 0-based index into `sources`. */
  readonly sourceIndex: number;
  /** 0-based original line. */
  readonly sourceLine: number;
  /** 0-based original column. */
  readonly sourceColumn: number;
}

export interface SourceMap {
  readonly version: 3;
  readonly file: string;
  readonly sources: readonly string[];
  readonly mappings: string;
  readonly names: readonly string[];
}

/**
 * Accumulates one array of {@link Segment}s per generated line, then encodes.
 * All segment fields are absolute; encoding computes the relative VLQ deltas.
 */
export class SourceMapBuilder {
  private readonly lines: Segment[][] = [[]];

  /** Begin a new generated line (called by the emitter on each newline). */
  newline(): void {
    this.lines.push([]);
  }

  /** Record a mapping at the current generated position. */
  add(seg: Segment): void {
    this.lines[this.lines.length - 1]!.push(seg);
  }

  encode(file: string, sources: readonly string[]): SourceMap {
    let prevSourceIndex = 0, prevSourceLine = 0, prevSourceColumn = 0;
    const encodedLines: string[] = [];

    for (const segments of this.lines) {
      let prevGenColumn = 0;
      const parts: string[] = [];
      // Segments within a line are sorted by generated column (determinism).
      const sorted = [...segments].sort((a, b) => a.genColumn - b.genColumn);
      for (const s of sorted) {
        let segStr = vlq(s.genColumn - prevGenColumn);
        prevGenColumn = s.genColumn;
        segStr += vlq(s.sourceIndex - prevSourceIndex);
        prevSourceIndex = s.sourceIndex;
        segStr += vlq(s.sourceLine - prevSourceLine);
        prevSourceLine = s.sourceLine;
        segStr += vlq(s.sourceColumn - prevSourceColumn);
        prevSourceColumn = s.sourceColumn;
        parts.push(segStr);
      }
      encodedLines.push(parts.join(','));
    }

    return {
      version: 3,
      file,
      sources,
      mappings: encodedLines.join(';'),
      names: [],
    };
  }
}

export { vlq as encodeVlq };
