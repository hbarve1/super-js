// generics/03-generic-sum-types.sjs — generic sum types in a generics context
// Cross-ref: sum-types/03-generic-sum-types.sjs defines the same types in full.
// Here we show Result<T,E> and Option<T> powering type-safe pipelines.
// No throw for errors, no null for error values, no any.

// --- Declarations ---

type Result<T, E> = | Ok(T) | Err(E)
type Option<T>   = | Some(T) | None

// --- Result helpers ---

function mapResult<T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> {
  return match r {
    Ok(v)  => Ok(f(v))
    Err(e) => Err(e)
  }
}

function flatMapResult<T, U, E>(r: Result<T, E>, f: (v: T) => Result<U, E>): Result<U, E> {
  return match r {
    Ok(v)  => f(v)
    Err(e) => Err(e)
  }
}

function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return match r {
    Ok(v)  => v
    Err(_) => fallback
  }
}

function resultToOption<T, E>(r: Result<T, E>): Option<T> {
  return match r {
    Ok(v)  => Some(v)
    Err(_) => None
  }
}

// --- Option helpers ---

function mapOption<T, U>(o: Option<T>, f: (v: T) => U): Option<U> {
  return match o {
    Some(v) => Some(f(v))
    None    => None
  }
}

function flatMapOption<T, U>(o: Option<T>, f: (v: T) => Option<U>): Option<U> {
  return match o {
    Some(v) => f(v)
    None    => None
  }
}

function getOrElse<T>(o: Option<T>, fallback: T): T {
  return match o {
    Some(v) => v
    None    => fallback
  }
}

function optionToResult<T, E>(o: Option<T>, err: E): Result<T, E> {
  return match o {
    Some(v) => Ok(v)
    None    => Err(err)
  }
}

// --- Domain functions — all errors as Result, never throw ---

function parsePositive(s: string): Result<number, string> {
  const n = Number(s)
  if (isNaN(n))  return Err("not a number: " + s)
  if (n <= 0)    return Err("must be positive, got: " + n)
  return Ok(n)
}

function safeDivide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

function safeSqrt(n: number): Result<number, string> {
  if (n < 0) return Err("sqrt of negative: " + n)
  return Ok(Math.sqrt(n))
}

function lookupUser(id: number): Option<string> {
  const db: { [key: number]: string } = { 1: "alice", 2: "bob", 3: "carol" }
  const name = db[id]
  return name !== undefined ? Some(name) : None
}

function lookupScore(name: string): Option<number> {
  const db: { [key: string]: number } = { alice: 95, bob: 87 }
  const score = db[name]
  return score !== undefined ? Some(score) : None
}

// --- Pipelines using flatMapResult and flatMapOption ---

// Parse input -> divide 100 by it -> take sqrt
function pipeline(input: string): Result<number, string> {
  return flatMapResult(
    flatMapResult(parsePositive(input), n => safeDivide(100, n)),
    safeSqrt
  )
}

// Look up user -> look up their score -> double it
function userScorePipeline(userId: number): Option<number> {
  return flatMapOption(
    lookupUser(userId),
    name => mapOption(lookupScore(name), score => score * 2)
  )
}

// Mix Result and Option in a single pipeline
function scoreOrError(userId: number): Result<number, string> {
  const userOpt = lookupUser(userId)
  const userResult = optionToResult(userOpt, "user " + userId + " not found")
  return flatMapResult(userResult, name => {
    const scoreOpt = lookupScore(name)
    return optionToResult(scoreOpt, "no score for " + name)
  })
}

// --- Demos ---

// Result pipeline
const r1 = pipeline("25")
console.log(unwrapOr(r1, -1))   // 2  (sqrt(100/25) = sqrt(4) = 2)

const r2 = pipeline("0")
match r2 {
  Ok(v)    => console.log("ok:", v)
  Err(msg) => console.log("error:", msg)   // error: must be positive, got: 0
}

const r3 = pipeline("-4")
match r3 {
  Ok(v)    => console.log("ok:", v)
  Err(msg) => console.log("error:", msg)   // error: must be positive, got: -4
}

const r4 = pipeline("abc")
match r4 {
  Ok(v)    => console.log("ok:", v)
  Err(msg) => console.log("error:", msg)   // error: not a number: abc
}

// Option pipeline
const s1 = userScorePipeline(1)
console.log(getOrElse(s1, -1))   // 190  (alice score 95 * 2)

const s2 = userScorePipeline(3)
console.log(getOrElse(s2, -1))   // -1   (carol has no score)

const s3 = userScorePipeline(99)
console.log(getOrElse(s3, -1))   // -1   (no user 99)

// Mixed pipeline
match scoreOrError(1) {
  Ok(v)    => console.log("alice score:", v)    // alice score: 95
  Err(msg) => console.log("error:", msg)
}

match scoreOrError(3) {
  Ok(v)    => console.log("carol score:", v)
  Err(msg) => console.log("error:", msg)        // error: no score for carol
}

match scoreOrError(99) {
  Ok(v)    => console.log("score:", v)
  Err(msg) => console.log("error:", msg)        // error: user 99 not found
}

// mapResult transform on a successful result
const doubled = mapResult(parsePositive("7"), n => n * 2)
console.log(unwrapOr(doubled, 0))   // 14

// resultToOption — discard the error, keep only success
const opt = resultToOption(parsePositive("10"))
console.log(getOrElse(opt, 0))   // 10
