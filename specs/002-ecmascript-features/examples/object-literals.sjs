// Task 2.2: Object literal type inference + static property access
// ECMA-262 §13.2.5 Object Initializer, §13.3.2 Property Accessors

// ── Object literal inference ──────────────────────────────────────────────────

// SJS infers the type of each property from the initializer expression.
const person = { name: "Alice", age: 30, active: true }

// ✅ Property types flow through member access
const personName: string = person.name    // inferred: string
const personAge: number = person.age      // inferred: number
const isActive: boolean = person.active   // inferred: boolean

// ✅ Nested objects
const config = { server: { host: "localhost", port: 8080 } }
const host: string = config.server.host   // string
const port: number = config.server.port   // number

// ── .length on arrays and strings ────────────────────────────────────────────

const items: number[] = [1, 2, 3]
const count: number = items.length        // ✅ array .length → number

const greeting: string = "hello"
const len: number = greeting.length       // ✅ string .length → number

// ── Gradual typing: unknown property returns any ──────────────────────────────

// ✅ Accessing a property not in the inferred ObjectType → any (no error)
// const missing: string = person.unknown  // 'unknown' not in { name, age, active } → any

// ❌ Type mismatch detected:
// const wrongType: string = person.age   // age is number, string expected → SJS-E001
