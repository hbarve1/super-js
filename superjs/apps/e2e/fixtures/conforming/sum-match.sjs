type Opt<T> = Some(T) | None;

function unwrapOr(o: Opt<number>, fallback: number): number {
  return match o {
    Some(v) => v,
    None => fallback,
  };
}

const __r: number = unwrapOr(Some(40), 0) + unwrapOr(None, 2);
