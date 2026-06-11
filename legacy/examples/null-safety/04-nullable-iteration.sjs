// null-safety/04-nullable-iteration.sjs — iterating T?[] safely, filtering nulls, for-of with nullable elements

// T?[] is an array whose elements may be null — the array itself is non-null.
// After `if (item !== null)` inside a for-of loop, item is narrowed to T.
// compact() removes nulls and returns T[], preserving order — no .filter(Boolean) which loses type info.

// Remove null entries from an array and return a strongly-typed T[].
function compact<T>(arr: T?[]): T[] {
  const result: T[] = []
  for (const item of arr) {
    if (item !== null) result.push(item)  // item: T (narrowed)
  }
  return result
}

// Return the first non-null element, or null if every element is null.
function firstNonNull<T>(arr: T?[]): T? {
  for (const item of arr) {
    if (item !== null) return item  // item: T (narrowed)
  }
  return null
}

// Return the last non-null element, or null if every element is null.
function lastNonNull<T>(arr: T?[]): T? {
  let found: T? = null
  for (const item of arr) {
    if (item !== null) found = item
  }
  return found
}

// Count how many elements are non-null.
function countNonNull<T>(arr: T?[]): number {
  let n: number = 0
  for (const item of arr) {
    if (item !== null) n = n + 1
  }
  return n
}

// Map over a T?[] — apply fn only to non-null items; nulls propagate as null in the output.
function mapNullable<T, U>(arr: T?[], fn: (x: T) => U): U?[] {
  const result: U?[] = []
  for (const item of arr) {
    if (item !== null) {
      result.push(fn(item))
    } else {
      result.push(null)
    }
  }
  return result
}

// --- Demo ---

const names: string?[] = ["Alice", null, "Bob", null, "Carol"]

console.log(compact(names))        // ["Alice", "Bob", "Carol"]
console.log(firstNonNull(names))   // Alice
console.log(lastNonNull(names))    // Carol
console.log(countNonNull(names))   // 3

// All nulls — compact returns empty array, firstNonNull returns null.
const allNulls: string?[] = [null, null, null]
console.log(compact(allNulls))     // []
console.log(firstNonNull(allNulls)) // null

// Numbers — 0 is NOT null; compact keeps it.
const scores: number?[] = [10, null, 0, null, 42]
console.log(compact(scores))       // [10, 0, 42]
console.log(firstNonNull(scores))  // 10
console.log(countNonNull(scores))  // 3

// mapNullable — uppercases non-null strings, leaves nulls as null.
const upper: string?[] = mapNullable(names, (s: string) => s.toUpperCase())
console.log(upper)  // ["ALICE", null, "BOB", null, "CAROL"]
