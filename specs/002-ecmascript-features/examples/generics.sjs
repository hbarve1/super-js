// specs/002-ecmascript-features/examples/generics.sjs
// Demonstrates: Generic Type Parameter Resolution (Task 1.1)

// ── Identity function — T is inferred from the argument ───────────────────────

function identity<T>(x: T): T {
  return x
}

const s: string = identity("hello")   // T inferred as string ✓
const n: number = identity(42)        // T inferred as number ✓

// ── Explicit type argument ────────────────────────────────────────────────────

const e: string = identity<string>("world")  // explicit T=string ✓

// ── Multi-parameter generics ─────────────────────────────────────────────────

function pair<A, B>(a: A, b: B): A {
  return a
}

const first: string = pair("hello", 42)  // A=string, B=number ✓

// ── Generic with Array<T> ─────────────────────────────────────────────────────

function first<T>(arr: Array<T>): T {
  return arr[0]
}

function wrap<T>(x: T): Array<T> {
  return [x]
}

const nums: Array<number> = wrap(42)   // T=number ✓

// ── Generic with Promise<T> ───────────────────────────────────────────────────

function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value)
}
