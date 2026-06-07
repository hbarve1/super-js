// types/union-types.sjs — unions and when to prefer sum types
//
// Rule: use A|B unions for primitives where typeof/=== works cleanly.
//       Use sum types for distinct shapes — they give exhaustive match.

// --- Primitive unions with typeof narrowing ---
// Always pair A|B with an explicit narrowing check before use.

type Primitive = string | number | boolean

function format(p: Primitive): string {
  if (typeof p === "string")  return '"' + p + '"'
  if (typeof p === "number")  return p.toFixed(2)
  return p ? "true" : "false"
}

type StringOrNumber = string | number

// typeof narrowing every time StringOrNumber is used:
function double(x: StringOrNumber): StringOrNumber {
  if (typeof x === "number") return x * 2
  return x + x
}

function toUpperOrDouble(x: StringOrNumber): string {
  if (typeof x === "string") return x.toUpperCase()
  return (x * 2).toString()
}

// --- When A|B is NOT enough: use a sum type ---
//
// A|B can't tell apart "an object representing success" vs
// "an object representing failure" — both are "object".
// Sum types give named variants and exhaustive match.

type Result<T, E> = | Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

function showResult(r: Result<number, string>): void {
  // match is exhaustive — compiler rejects missing branches
  match r {
    Ok(v)    => console.log("result:", v)
    Err(msg) => console.log("error:", msg)
  }
}

// --- Discriminated union via sum type ---
// Sum type variants are the SJS equivalent of discriminated unions.

type Shape =
  | Circle { radius: number }
  | Rect   { width: number; height: number }
  | Point

function area(s: Shape): number {
  return match s {
    Circle { radius }          => Math.PI * radius * radius
    Rect   { width; height }   => width * height
    Point                      => 0
  }
}

// --- Id: string | number union with narrowing ---

type Id = string | number

function formatId(id: Id): string {
  if (typeof id === "number") return "#" + id
  return id.trim()
}

// --- Optional chaining with nullable (T?) ---
// T? means T | null in SJS. Narrowing uses !==null.

function greet(name: string?): string {
  if (name !== null) return "Hello, " + name + "!"
  return "Hello, stranger!"
}

// --- Demos ---

console.log(format("hello"))  // "hello"
console.log(format(3.14159))  // 3.14
console.log(format(true))     // true
console.log(format(false))    // false

console.log(double(5))        // 10
console.log(double("ha"))     // haha

console.log(toUpperOrDouble("abc"))  // ABC
console.log(toUpperOrDouble(7))      // 14

showResult(divide(10, 2))    // result: 5
showResult(divide(10, 0))    // error: division by zero

console.log(area(Circle { radius: 3 }))          // 28.274...
console.log(area(Rect { width: 4; height: 5 }))  // 20
console.log(area(Point))                          // 0

console.log(formatId(42))       // #42
console.log(formatId("  hi  ")) // hi

console.log(greet("Alice"))  // Hello, Alice!
console.log(greet(null))     // Hello, stranger!
