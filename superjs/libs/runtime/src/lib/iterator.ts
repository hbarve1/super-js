/**
 * Iterator support. SJS generators and custom iterables lower to classes with a
 * `next()` method; `attachIteratorSymbol` makes such an iterator also iterable
 * (`[Symbol.iterator]() { return this }`), so it works in `for…of` and spreads.
 */

export interface IteratorLike<T> {
  next(...args: unknown[]): IteratorResult<T>;
}

/**
 * Define `[Symbol.iterator]` on a constructor's prototype so its instances are
 * self-iterable. Idempotent — does nothing if already present.
 */
export function attachIteratorSymbol<T>(ctor: { prototype: IteratorLike<T> }): void {
  const proto = ctor.prototype as IteratorLike<T> & { [Symbol.iterator]?: unknown };
  if (typeof proto[Symbol.iterator] === 'function') return;
  Object.defineProperty(proto, Symbol.iterator, {
    value(this: IteratorLike<T>): IteratorLike<T> {
      return this;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
