// ── Promises ───────────────────────────────────────────────────────────────

// Basic promise creation
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function fetchData(id: number): Promise<{ id: number; name: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id > 0) {
        resolve({ id, name: `User ${id}` })
      } else {
        reject(new Error(`Invalid ID: ${id}`))
      }
    }, 50)
  })
}

// Promise chaining
fetchData(1)
  .then(user => {
    console.log("Got user:", user.name)
    return fetchData(2)
  })
  .then(user => {
    console.log("Got user:", user.name)
  })
  .catch((err: Error) => {
    console.error("Error:", err.message)
  })
  .finally(() => {
    console.log("Done (always runs)")
  })

// Promise.all — wait for all, fail-fast
Promise.all([fetchData(1), fetchData(2), fetchData(3)])
  .then(users => {
    console.log("All users:", users.map(u => u.name))
  })
  .catch((err: Error) => console.error("One failed:", err.message))

// Promise.allSettled — wait for all, report each outcome
Promise.allSettled([fetchData(1), fetchData(-1), fetchData(3)])
  .then(results => {
    results.forEach(result => {
      if (result.status === "fulfilled") {
        console.log("✅", result.value.name)
      } else {
        console.log("❌", result.reason.message)
      }
    })
  })

// Promise.race — first to settle wins
Promise.race([
  delay(100).then(() => "slow"),
  delay(10).then(() => "fast"),
]).then(winner => console.log("Winner:", winner))

// Promise.any — first to FULFILL wins (ignores rejections)
Promise.any([
  Promise.reject(new Error("fail1")),
  delay(20).then(() => "second"),
  delay(10).then(() => "first"),
]).then(value => console.log("First success:", value))

// Promise.resolve / Promise.reject
const immediate: Promise<number> = Promise.resolve(42)
const failed: Promise<never> = Promise.reject(new Error("immediate fail"))

immediate.then(n => console.log("Immediate:", n))
failed.catch((e: Error) => console.log("Caught:", e.message))

// Promisify callback-style function
function promisify<T>(
  fn: (callback: (err: Error | null, result?: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) reject(err)
      else resolve(result as T)
    })
  })
}

// Sequential vs parallel
async function sequential(): Promise<void> {
  const start = Date.now()
  await delay(20)
  await delay(20)
  console.log(`Sequential: ~${Date.now() - start}ms`)
}

async function parallel(): Promise<void> {
  const start = Date.now()
  await Promise.all([delay(20), delay(20)])
  console.log(`Parallel: ~${Date.now() - start}ms`)
}

// Promise-based retry
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  backoff: number = 50,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (retries === 0) throw err
    await delay(backoff)
    return withRetry(fn, retries - 1, backoff * 2)
  }
}

// Promise-based timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
  )
  return Promise.race([promise, timeout])
}

// Run all
;(async () => {
  await sequential()
  await parallel()
  const result = await withRetry(() => fetchData(5), 2)
  console.log("Retried:", result.name)
})()
