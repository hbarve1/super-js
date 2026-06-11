/**
 * Runtime termination + assertion helpers.
 *
 * These ship with compiled SJS apps. Codegen emits calls to them for
 * non-exhaustive `match` fallthrough (`unreachable`), `todo()` placeholders,
 * and runtime assertions. Zero dependencies.
 */

/** Error thrown by {@link panic}; lets hosts distinguish intentional panics. */
export class SjsPanic extends Error {
  override readonly name = 'SjsPanic';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SjsPanic.prototype);
  }
}

/** Abort execution unconditionally with a message. */
export function panic(message: string): never {
  throw new SjsPanic(message);
}

/** Narrowing assertion. Throws {@link SjsPanic} if `condition` is falsy. */
export function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new SjsPanic(message);
}

/** Marker for unfinished code paths. Always throws. */
export function todo(message = 'not yet implemented'): never {
  throw new SjsPanic(`TODO: ${message}`);
}

/**
 * Marks a code path the type system proves unreachable (e.g. the default tail
 * of an exhaustive `match`). Accepts the impossible value for diagnostics.
 */
export function unreachable(value?: unknown): never {
  const detail = value === undefined ? '' : `: ${stringifyBrief(value)}`;
  throw new SjsPanic(`entered unreachable code${detail}`);
}

function stringifyBrief(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'object' && value !== null && '_tag' in value) {
    return String((value as { _tag: unknown })._tag);
  }
  return typeof value === 'string' ? value : String(value);
}
