/**
 * `@superjs/codegen-js` — the JavaScript backend (Tier 2).
 *
 * Prints a lowered {@link IrProgram} to ES2022 source text and a Source Map v3.
 * Because the IR is already fully desugared, codegen is a precedence-aware
 * printer plus position tracking — no SJS semantics live here.
 */

import type { IrProgram } from '@superjs/ir';
import { emit, type EmitOptions, type EmitResult } from './lib/emitter.js';
import type { SourceMap } from './lib/sourcemap.js';

export { emit } from './lib/emitter.js';
export type { EmitOptions, EmitResult } from './lib/emitter.js';
export type { SourceMap, Segment } from './lib/sourcemap.js';
export { SourceMapBuilder, encodeVlq } from './lib/sourcemap.js';

export interface GenerateOptions extends EmitOptions {
  /** Emit a `//# sourceMappingURL=<file>.map` footer (default: from `file`). */
  readonly inlineMapUrl?: boolean;
}

export interface GenerateResult {
  readonly code: string;
  readonly map: SourceMap;
}

/** Generate ES2022 + source map from lowered IR. */
export function generate(program: IrProgram, opts: GenerateOptions = {}): GenerateResult {
  const file = opts.file ?? 'output.js';
  const sourceMappingURL = opts.sourceMappingURL
    ?? (opts.inlineMapUrl !== false ? `${file}.map` : undefined);
  const result: EmitResult = emit(program, { ...opts, file, ...(sourceMappingURL ? { sourceMappingURL } : {}) });
  return { code: result.code, map: result.map };
}
