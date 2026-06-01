// match/02-destructuring.sjs — nested patterns, binding rename (field: alias), partial destructuring with _

// Struct patterns support three binding forms:
//   { field }         — bind under the original field name
//   { field: alias }  — bind under a shorter alias (rename)
//   { _ }             — discard the field entirely (unused)
//
// Patterns can be nested: a field's value can itself be a variant pattern.
// This lets you match deep structure without intermediate variables.

// --- Recursive expression tree ---

type Expr =
  | Lit(number)
  | Add { left: Expr; right: Expr }
  | Mul { left: Expr; right: Expr }
  | Sub { left: Expr; right: Expr }
  | Neg(Expr)

// Binding rename: `left: l` and `right: r` avoid shadowing local names.
function evaluate(e: Expr): number {
  return match e {
    Lit(n)                     => n
    Add { left: l; right: r } => evaluate(l) + evaluate(r)
    Mul { left: l; right: r } => evaluate(l) * evaluate(r)
    Sub { left: l; right: r } => evaluate(l) - evaluate(r)
    Neg(inner)                 => -evaluate(inner)
  }
}

// Nested patterns: match specific literal values inside a struct field.
// `Add { left: Lit(0); right: r }` matches an Add whose left child is Lit(0).
// The inner Lit(0) is a full pattern — it matches value AND binds nothing.
function simplify(e: Expr): Expr {
  return match e {
    Add { left: Lit(0); right: r }  => r           // 0 + r  → r
    Add { left: l; right: Lit(0) }  => l           // l + 0  → l
    Mul { left: Lit(1); right: r }  => r           // 1 * r  → r
    Mul { left: l; right: Lit(1) }  => l           // l * 1  → l
    Mul { left: Lit(0); right: _ }  => Lit(0)      // 0 * _  → 0  (discard right with _)
    Mul { left: _; right: Lit(0) }  => Lit(0)      // _ * 0  → 0
    Neg(Neg(inner))                 => inner        // --x    → x  (nested tuple pattern)
    _                               => e
  }
}

// Pretty-print using nested match
function prettyPrint(e: Expr): string {
  return match e {
    Lit(n)                     => `${n}`
    Add { left: l; right: r } => `(${prettyPrint(l)} + ${prettyPrint(r)})`
    Mul { left: l; right: r } => `(${prettyPrint(l)} * ${prettyPrint(r)})`
    Sub { left: l; right: r } => `(${prettyPrint(l)} - ${prettyPrint(r)})`
    Neg(inner)                 => `(-${prettyPrint(inner)})`
  }
}

// --- Nested struct type: Result wrapped in a container ---

type ParseResult =
  | Ok { value: Expr; remaining: string }
  | Err { message: string; position: number }

// `Ok { value: expr; remaining: _ }` — destructure value, discard remaining with _
function extractExpr(r: ParseResult): Expr? {
  return match r {
    Ok { value: expr; remaining: _ } => expr
    Err { message: _; position: _ }  => null
  }
}

function parseResultSummary(r: ParseResult): string {
  return match r {
    Ok { value: expr; remaining }    => `parsed: ${prettyPrint(expr)}, leftover: "${remaining}"`
    Err { message; position }        => `error at ${position}: ${message}`
  }
}

// --- Demos ---

// 3 + (2 * 4)  → 11
const expr: Expr = Add {
  left: Lit(3)
  right: Mul { left: Lit(2); right: Lit(4) }
}
console.log(evaluate(expr))       // 11
console.log(prettyPrint(expr))    // (3 + (2 * 4))

// simplify: 0 + (1 * x)  →  x
const redundant: Expr = Add {
  left: Lit(0)
  right: Mul { left: Lit(1); right: Lit(7) }
}
const simplified: Expr = simplify(redundant)
console.log(prettyPrint(simplified))  // 7  (after simplify collapses 1*7→7, then 0+7→7)

// double negation: -(-5) → 5
const doubleNeg: Expr = Neg(Neg(Lit(5)))
console.log(prettyPrint(simplify(doubleNeg)))   // 5

// zero product: 0 * expr → 0
const zeroProd: Expr = Mul { left: Lit(0); right: Lit(99) }
console.log(prettyPrint(simplify(zeroProd)))    // 0

// ParseResult destructuring
const ok: ParseResult = Ok { value: Lit(42); remaining: "" }
const err: ParseResult = Err { message: "unexpected token"; position: 5 }
console.log(parseResultSummary(ok))   // parsed: 42, leftover: ""
console.log(parseResultSummary(err))  // error at 5: unexpected token
