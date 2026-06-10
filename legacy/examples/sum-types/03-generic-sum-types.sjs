// sum-types/03-generic-sum-types.sjs — Result<T,E> and Option<T> as generic sum types, chaining with helper functions

// Generic sum types let you parameterise variants with type variables.
// Result<T,E> models either success (Ok) or failure (Err) without exceptions.
// Option<T>   models an optional value (Some/None) without null.
// Helper functions (map, flatMap, withDefault) let you chain operations cleanly.

// --- Declarations ---

type Result<T, E> = | Ok(T) | Err(E)
type Option<T>   = | Some(T) | None

// --- Result helpers ---

// Transform the success value; leave errors unchanged.
function mapResult<T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> {
  return match r {
    Ok(value) => Ok(f(value))
    Err(e)    => Err(e)
  }
}

// Chain a fallible operation onto a successful result.
function flatMapResult<T, U, E>(r: Result<T, E>, f: (v: T) => Result<U, E>): Result<U, E> {
  return match r {
    Ok(value) => f(value)
    Err(e)    => Err(e)
  }
}

// Extract success value or provide a fallback.
function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return match r {
    Ok(value) => value
    Err(_)    => fallback
  }
}

// --- Option helpers ---

function mapOption<T, U>(o: Option<T>, f: (v: T) => U): Option<U> {
  return match o {
    Some(v) => Some(f(v))
    None    => None
  }
}

function optionToResult<T, E>(o: Option<T>, err: E): Result<T, E> {
  return match o {
    Some(v) => Ok(v)
    None    => Err(err)
  }
}

function withDefault<T>(o: Option<T>, fallback: T): T {
  return match o {
    Some(v) => v
    None    => fallback
  }
}

// --- Domain functions that return Result ---

function parseNumber(s: string): Result<number, string> {
  const n: number = Number(s)
  if (isNaN(n)) return Err("not a number: " + s)
  return Ok(n)
}

function divideBy(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

function safeSqrt(n: number): Result<number, string> {
  if (n < 0) return Err("cannot take sqrt of " + n)
  return Ok(Math.sqrt(n))
}

// --- Chaining multiple fallible steps ---

// Parse a string, then divide 100 by that number.
function parseAndDivide(s: string): Result<number, string> {
  return flatMapResult(parseNumber(s), n => divideBy(100, n))
}

// Parse, divide, then take the square root.
function parseAndDivideSqrt(s: string): Result<number, string> {
  return flatMapResult(parseAndDivide(s), safeSqrt)
}

// --- Demos ---

const r1: Result<number, string> = parseAndDivide("10")
match r1 {
  Ok(v)    => console.log("100 / 10 = " + v)         // 100 / 10 = 10
  Err(msg) => console.log("error: " + msg)
}

const r2: Result<number, string> = parseAndDivide("0")
match r2 {
  Ok(v)    => console.log("result: " + v)
  Err(msg) => console.log("error: " + msg)            // error: division by zero
}

const r3: Result<number, string> = parseAndDivide("abc")
match r3 {
  Ok(v)    => console.log("result: " + v)
  Err(msg) => console.log("error: " + msg)            // error: not a number: abc
}

// mapResult — double the result if successful
const r4: Result<number, string> = mapResult(parseNumber("7"), n => n * 2)
console.log(unwrapOr(r4, 0))   // 14

// Option demo
const username: Option<string> = Some("alice")
const greeting: Option<string> = mapOption(username, name => "Hello, " + name + "!")
console.log(withDefault(greeting, "Hello, stranger!"))  // Hello, alice!

const missing: Option<string> = None
console.log(withDefault(missing, "Hello, stranger!"))   // Hello, stranger!

// Convert Option to Result for unified error handling
const asResult: Result<string, string> = optionToResult(missing, "username not found")
match asResult {
  Ok(v)    => console.log("got: " + v)
  Err(msg) => console.log("error: " + msg)   // error: username not found
}

// Full pipeline: parse -> divide -> sqrt
const pipeline: Result<number, string> = parseAndDivideSqrt("25")
console.log(unwrapOr(pipeline, -1))   // 2 (sqrt(100/25) = sqrt(4) = 2)
