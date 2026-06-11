/**
 * `.sjsir` serialization. The IR is already a plain-data tree, so persistence is
 * a JSON envelope with a format version (so future IR-shape changes are
 * detectable rather than silently misread).
 */

import type { IrProgram } from './ir.js';

export const SJSIR_VERSION = 1;

export interface SjsirEnvelope {
  readonly sjsir: number;
  readonly program: IrProgram;
}

export function serialize(program: IrProgram, pretty = false): string {
  const envelope: SjsirEnvelope = { sjsir: SJSIR_VERSION, program };
  return JSON.stringify(envelope, null, pretty ? 2 : undefined);
}

export function deserialize(text: string): IrProgram {
  const parsed = JSON.parse(text) as Partial<SjsirEnvelope>;
  if (parsed.sjsir !== SJSIR_VERSION) {
    throw new Error(`.sjsir version mismatch: expected ${SJSIR_VERSION}, got ${String(parsed.sjsir)}`);
  }
  if (!parsed.program || parsed.program.type !== 'Program') {
    throw new Error('.sjsir payload is missing a Program root');
  }
  return parsed.program;
}
