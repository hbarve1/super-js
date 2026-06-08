// SJS3: Nested pattern matching

type Expr =
  | Num(number)
  | Add { left: Expr; right: Expr }
  | Mul { left: Expr; right: Expr }
  | Neg(Expr);

function eval(e: Expr): number {
  return match e {
    Num(n)              => n,
    Add { left, right } => eval(left) + eval(right),
    Mul { left, right } => eval(left) * eval(right),
    Neg(inner)          => -eval(inner),
  };
}

// Nested sum type matching
type Result<T> =
  | Ok(T)
  | Err(string);

type Nested = Result<Result<number>>;

function doubleUnwrap(r: Nested): string {
  return match r {
    Ok(Ok(n))    => `double ok: ${n}`,
    Ok(Err(msg)) => `inner error: ${msg}`,
    Err(msg)     => `outer error: ${msg}`,
  };
}

console.log(doubleUnwrap(Ok(Ok(42))));     // "double ok: 42"
console.log(doubleUnwrap(Ok(Err("x"))));   // "inner error: x"
console.log(doubleUnwrap(Err("outer")));   // "outer error: outer"

// Deep nesting with struct variants
type Tree<T> =
  | Leaf { value: T }
  | Node { left: Tree<T>; right: Tree<T> };

function depth<T>(t: Tree<T>): number {
  return match t {
    Leaf _               => 0,
    Node { left, right } => 1 + Math.max(depth(left), depth(right)),
  };
}
