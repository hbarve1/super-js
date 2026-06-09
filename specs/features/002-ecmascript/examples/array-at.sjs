// SJS Example: Array.prototype.at() and String.prototype.at() (ES2022)
// Task 3.1 — specs/002-ecmascript-features/implementation-plan.md
// Spec: https://tc39.es/proposal-relative-indexing-method/

// array.at() returns T | undefined (not just T)
const nums: number[] = [10, 20, 30, 40, 50]

const first: number | undefined = nums.at(0)     // 10
const last: number | undefined = nums.at(-1)     // 50
const oob: number | undefined = nums.at(100)     // undefined

// Must handle undefined case explicitly
if (first !== undefined) {
  const doubled: number = first * 2   // safe — first is number here
}

// string.at() also returns string | undefined
const greeting: string = "Hello, World!"
const firstChar: string | undefined = greeting.at(0)   // "H"
const lastChar: string | undefined = greeting.at(-1)   // "!"

// Compare with old bracket access (does not give | undefined)
// Legacy: const old = nums[0]  — type is number (unsafe, no undefined)
// Modern: const safe = nums.at(0)  — type is number | undefined (safe)

// Useful for last-element access pattern
type Stack<T> = { items: T[] }
function peek<T>(stack: Stack<T>): T | undefined {
  return stack.items.at(-1)
}
