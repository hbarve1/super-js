/**
 * `@superjs/ir` — SJS-IR: the lowered, target-agnostic JS intermediate
 * representation (Tier 1), plus the AST→IR lowering pass and `.sjsir`
 * serialization.
 */

import { parse } from '@superjs/parser';
import type { IrProgram } from './lib/ir.js';
import { lower } from './lib/lower.js';

export * from './lib/ir.js';
export { lower } from './lib/lower.js';
export { serialize, deserialize, SJSIR_VERSION, type SjsirEnvelope } from './lib/serialize.js';

/** Parse SJS source and lower it to IR (convenience for tools/tests). */
export function lowerSource(source: string): IrProgram {
  return lower(parse(source).program);
}
