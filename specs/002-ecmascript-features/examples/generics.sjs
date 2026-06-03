// SJS Example: Generic Type Parameter Resolution (ES2015+)
// Task 1.1 — specs/002-ecmascript-features/implementation-plan.md

// Array<T> — generic container type
const strings: Array<string> = ["hello", "world"]
const numbers: Array<number> = [1, 2, 3, 4, 5]

// Nested generics
const matrix: Array<Array<number>> = [[1, 2], [3, 4]]

// Promise<T> — async result container
const strPromise: Promise<string> = new Promise<string>((resolve) => {
  resolve("result")
})

// Map<K, V> — key-value store
const scores: Map<string, number> = new Map()

// Set<T> — unique value collection
const visited: Set<string> = new Set()

// Iterable<T> — anything consumable in for...of
function sum(values: Iterable<number>): number {
  let total = 0
  for (const v of values) total += v
  return total
}

// WeakRef<T> — weak reference to objects
type Target = { id: number; name: string }
const target: Target = { id: 1, name: "cache-entry" }
const weakTarget: WeakRef<Target> = new WeakRef(target)
const maybe: Target | undefined = weakTarget.deref()
