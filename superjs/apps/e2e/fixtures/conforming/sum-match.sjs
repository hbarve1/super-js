type Opt<T> = Some(T) | None;

function unwrapOr(o: Opt<number>, fallback: number): number {
  return match o {
    Some(v) => v,
    None => fallback,
  };
}

const present: Opt<number> = Some(40);
const absent: Opt<number> = None;
const __r: number = unwrapOr(present, 0) + unwrapOr(absent, 2);
