// gradual-typing/step-by-step.sjs — migration path: plain JS → full SJS types

// STAGE 1: Plain JS — no annotations
function parseUser1(raw) {
  return { name: raw.name || "unknown", age: raw.age || 0 }
}

// STAGE 2: Add parameter annotation
function parseUser2(raw: dynamic) {
  return { name: raw.name || "unknown", age: raw.age || 0 }
}

// STAGE 3: Add return type
interface User { name: string; age: number }
function parseUser3(raw: dynamic): User {
  return { name: raw.name || "unknown", age: raw.age || 0 }
}

// STAGE 4: Full types, null-safe
function parseUser4(raw: dynamic): User {
  const name: string = (typeof raw.name === "string") ? raw.name : "unknown"
  const age: number = (typeof raw.age === "number") ? raw.age : 0
  return { name, age }
}

// STAGE 5: SJS idioms — Result<T,E> for validation
type ParseError = | MissingField(string) | WrongType(string, string)
type Result<T, E> = | Ok(T) | Err(E)

function parseUser5(raw: dynamic): Result<User, ParseError> {
  if (typeof raw.name !== "string") return Err(WrongType("name", typeof raw.name))
  if (typeof raw.age !== "number") return Err(WrongType("age", typeof raw.age))
  return Ok({ name: raw.name, age: raw.age })
}

const raw: dynamic = JSON.parse('{"name":"Alice","age":30}')
console.log(parseUser1(raw).name)
console.log(parseUser4(raw).name)
match parseUser5(raw) {
  Ok(u) => console.log(u.name + " age " + u.age)
  Err(e) => match e {
    MissingField(f) => console.log("missing: " + f)
    WrongType(f, t) => console.log("wrong type for " + f + ": " + t)
  }
}
