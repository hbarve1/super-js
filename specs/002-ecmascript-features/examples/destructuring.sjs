// Tasks 4.1 & 4.2: Array and Object destructuring type inference
// ECMA-262 §14.3.3 Destructuring Binding Patterns

// ── Array destructuring ───────────────────────────────────────────────────────

// ✅ Element type flows from annotation to bindings
const [first, second]: number[] = [1, 2, 3]
const sum: number = first + second       // first: number, second: number

// ✅ Element type flows from inferred initializer type
const nums = [10, 20, 30]
const [a, b] = nums                      // a: number, b: number
const result: number = a + b

// ✅ Rest element gets the source array type
const [head, ...tail]: string[] = ["x", "y", "z"]
const headStr: string = head            // head: string
const tailArr: string[] = tail          // tail: string[]

// ✅ Holes (sparse patterns) are skipped
const [, middle]: number[] = [1, 2, 3]  // first slot skipped
const midNum: number = middle

// ❌ Element type mismatch:
// const [n]: number[] = [1]
// const s: string = n    // SJS-E001: number ≁ string

// ── Object destructuring ─────────────────────────────────────────────────────

// ✅ Property types from TSTypeLiteral annotation
const { name, age }: { name: string; age: number } = { name: "Alice", age: 30 }
const greeting: string = `Hello, ${name}`   // name: string
const nextAge: number = age + 1             // age: number

// ✅ Property types from inferred object literal initializer
const point = { x: 10, y: 20 }
const { x, y } = point                      // x: number, y: number
const magnitude: number = x + y

// ✅ Rest element
const { a: propA, ...rest } = { a: 1, b: 2, c: 3 }

// ❌ Property type mismatch:
// const { count }: { count: number } = { count: 42 }
// const str: string = count  // SJS-E001: number ≁ string
