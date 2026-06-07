// errors/SJS-E001-null-deref.sjs — SJS-E001: cannot assign type null to string

// Trigger (commented out — would cause SJS-E001):
//   const name: string = null
//   // error SJS-E001: Cannot assign type 'null' to 'string'

// FIX 1: Declare as nullable (T?)
const name1: string? = null

// FIX 2: Provide a non-null value
const name2: string = "Alice"

// FIX 3: Narrow before use
function greet(name: string?): string {
  if (name === null) return "Hello, stranger"
  return "Hello, " + name
}

const cfg: { timeout?: number } = {}
const t: number = cfg.timeout ?? 5000

console.log(greet(null))    // Hello, stranger
console.log(greet("Bob"))   // Hello, Bob
console.log(t)               // 5000
