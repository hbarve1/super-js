// SJS Example: Async/Await Type Inference (ES2017+)
// Task 1.2 — specs/002-ecmascript-features/implementation-plan.md

// async function: return type is automatically Promise<T>
async function fetchUser(id: number): Promise<string> {
  return `user-${id}`
}

// await unwraps Promise<T> to T
async function main(): Promise<void> {
  const user: string = await fetchUser(42)
  console.log(user)
}

// async arrow function
const fetchScore = async (userId: string): Promise<number> => {
  return 100
}

// Chaining .then() on Promise
async function pipeline(): Promise<string> {
  const p: Promise<number> = fetchScore("alice")
  const score: number = await p
  return `score: ${score}`
}

// Promise.all — gather multiple results
async function fetchAll(): Promise<void> {
  const results = await Promise.all([fetchScore("a"), fetchScore("b")])
}

// Promise.withResolvers — ES2024 deferred pattern
async function deferred(): Promise<number> {
  const { promise, resolve, reject } = Promise.withResolvers<number>()
  setTimeout(() => resolve(42), 100)
  return await promise
}
