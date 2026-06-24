// @superjs/std-core — Option and Result, the canonical optional/error types.

/** `Some(value)` — an optional value is present. */
export type Option<T> = Some(T) | None;
/** `Ok(value)` or `Err(error)` — explicit success/failure without exceptions. */
export type Result<T, E> = Ok(T) | Err(E);

/** Wrap `value` in `Some`. */
export function some<T>(value: T): Option<T> {
  return Some(value);
}

/** Return `true` when the option is `Some`. */
export function isSome<T>(o: Option<T>): boolean {
  return match o {
    Some(value) => true,
    None => false,
  };
}

/** Return `value` from `Some`, or `fallback` for `None`. */
export function unwrapOr<T>(o: Option<T>, fallback: T): T {
  return match o {
    Some(value) => value,
    None => fallback,
  };
}

/** Construct `Ok(value)`. */
export function ok<T, E>(value: T): Result<T, E> {
  return Ok(value);
}

/** Construct `Err(error)`. */
export function err<T, E>(error: E): Result<T, E> {
  return Err(error);
}

export function isOk<T, E>(r: Result<T, E>): boolean {
  return match r {
    Ok(value) => true,
    Err(error) => false,
  };
}

export function resultOr<T, E>(r: Result<T, E>, fallback: T): T {
  return match r {
    Ok(value) => value,
    Err(error) => fallback,
  };
}
