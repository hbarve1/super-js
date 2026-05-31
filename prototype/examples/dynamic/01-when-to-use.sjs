// dynamic/01-when-to-use.sjs — dynamic vs T? vs sum type
//
// Rule: reach for the most specific tool first.
//   1. T?        — value may be null, same type otherwise
//   2. sum type  — value is one of several distinct shapes
//   3. dynamic   — JS interop boundary or truly opaque external value
//
// Using dynamic when T? or a sum type would do is a code smell.
// dynamic bypasses type checking entirely; the compiler cannot help you.

// ─── 1. T? — value may be absent, shape is known ───────────────────────────

interface User {
  id: number
  nickname: string?   // may be null — but when present it is always a string
}

// nickname is string? — narrow to get a plain string before concatenation
function greet(u: User): string {
  return "Hi " + (u.nickname ?? u.id.toString())
}

// WRONG (commented out — do not do this):
// function greetBad(u: User): string {
//   const nick: dynamic = u.nickname   // BAD — dynamic just to avoid null check
//   return "Hi " + nick
// }

// ─── 2. sum type — one of several distinct shapes ──────────────────────────

// Use a sum type when the possible shapes are known up front.
type SearchResult
  = Found { url: string; title: string }
  | NotFound
  | SearchError(string)

function describeResult(r: SearchResult): string {
  match r {
    Found { url, title } => return title + " — " + url
    NotFound             => return "no results"
    SearchError(msg)     => return "error: " + msg
  }
}

// WRONG (commented out — do not do this):
// function describeResultBad(r: dynamic): string {   // BAD — dynamic hides that there are three shapes
//   if (r.url) return r.title + " — " + r.url
//   return "unknown"
// }

// ─── 3. dynamic — opaque external value at an interop boundary ─────────────

// JSON.parse returns a value whose runtime shape is unknown at compile time.
// dynamic is the correct annotation here — we promise to narrow it ourselves.
function parseConfig(raw: string): dynamic {
  return JSON.parse(raw)
}

// dynamic is also appropriate for values coming from third-party JS libraries
// where no type declaration exists.
function fromLegacyLib(input: dynamic): string? {
  if (typeof input === "string") return input
  return null
}

// WRONG (commented out — do not do this):
// function badReturn(): dynamic { return 42 }   // BAD — return type should be number
// function badParam(x: dynamic): void { ... }   // BAD — if shape is known, use that type

// ─── Demo ──────────────────────────────────────────────────────────────────

const alice: User = { id: 42, nickname: null }
const bob: User   = { id: 7,  nickname: "bob99" }

console.log(greet(alice))   // Hi 42
console.log(greet(bob))     // Hi bob99

const results: SearchResult[] = [
  Found { url: "https://example.com", title: "Example" },
  NotFound,
  SearchError("timeout")
]

results.forEach(r => console.log(describeResult(r)))
// Example — https://example.com
// no results
// error: timeout

const raw: dynamic = parseConfig('{"host":"localhost","port":3000}')
console.log(typeof raw)  // object — caller must narrow before using fields

const legacyValue: dynamic = "hello from legacy"
console.log(fromLegacyLib(legacyValue))   // hello from legacy
console.log(fromLegacyLib(123))           // null
