// sum-types/02-match.sjs — exhaustive match, wildcard arm (_), binding in tuple/struct patterns

// match must cover every variant of a sum type.
// Omitting a variant is a compile error (SJS-E007).
// Use a wildcard arm (_) only when you intentionally want a catch-all.
// Tuple variant fields are bound by position: Ok(value) binds _0 as `value`.
// You can ignore a field with _ inside a pattern: Number(_).

// --- Token type: mix of unit and tuple variants ---

type Token =
  | Number(number)
  | StringLit(string)
  | Bool(boolean)
  | Null
  | Identifier(string)

// Exhaustive — every variant is explicitly matched.
function tokenToString(t: Token): string {
  return match t {
    Number(n)       => "num:" + n
    StringLit(s)    => "str:" + s
    Bool(b)         => "bool:" + b
    Null            => "null"
    Identifier(name) => "id:" + name
  }
}

// Wildcard arm (_) handles all remaining variants not listed above.
// Useful when you only care about a subset; _ suppresses exhaustiveness checking.
function isLiteral(t: Token): boolean {
  return match t {
    Number(_)    => true
    StringLit(_) => true
    Bool(_)      => true
    Null         => true
    _            => false
  }
}

// Binding in wildcard — _ can appear anywhere to discard a field.
function tokenKind(t: Token): string {
  return match t {
    Number(_)       => "number-literal"
    StringLit(_)    => "string-literal"
    Bool(_)         => "bool-literal"
    Null            => "null-literal"
    Identifier(_)   => "identifier"
  }
}

// --- Priority type: struct variant with exhaustive match ---

type Priority = | Low | Medium | High | Critical { reason: string }

function priorityScore(p: Priority): number {
  return match p {
    Low                 => 1
    Medium              => 2
    High                => 3
    Critical { reason } => 10  // reason captured but not used here
  }
}

function priorityLabel(p: Priority): string {
  return match p {
    Low                 => "low"
    Medium              => "medium"
    High                => "high"
    Critical { reason } => "critical: " + reason
  }
}

// --- Demos ---

const tokens: Token[] = [
  Number(42),
  StringLit("hello"),
  Bool(true),
  Null,
  Identifier("x")
]

for (const tok of tokens) {
  console.log(tokenToString(tok))
}
// num:42
// str:hello
// bool:true
// null
// id:x

console.log(isLiteral(Number(0)))         // true
console.log(isLiteral(Identifier("x")))   // false
console.log(isLiteral(Null))              // true

console.log(tokenKind(StringLit("hi")))   // string-literal
console.log(tokenKind(Identifier("y")))   // identifier

const prio: Priority = Critical { reason: "outage" }
console.log(priorityScore(prio))          // 10
console.log(priorityLabel(prio))          // critical: outage
console.log(priorityScore(Low))           // 1
