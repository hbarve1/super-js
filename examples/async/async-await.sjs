// ── Async / Await ──────────────────────────────────────────────────────────

// Basic async function
async function fetchUser(id: number): Promise<{ id: number; name: string; email: string }> {
  await new Promise(resolve => setTimeout(resolve, 10))
  return { id, name: `User${id}`, email: `user${id}@example.com` }
}

async function fetchPosts(userId: number): Promise<Array<{ id: number; title: string }>> {
  await new Promise(resolve => setTimeout(resolve, 10))
  return [
    { id: 1, title: `Post by User${userId}` },
    { id: 2, title: `Another by User${userId}` },
  ]
}

// Sequential awaits
async function getUserWithPosts(userId: number) {
  const user = await fetchUser(userId)
  const posts = await fetchPosts(userId)
  return { user, posts }
}

// Parallel awaits — both run concurrently
async function getUserAndPosts(userId: number) {
  const [user, posts] = await Promise.all([fetchUser(userId), fetchPosts(userId)])
  return { user, posts }
}

// Error handling with try/catch
async function safeGet(id: number): Promise<string> {
  try {
    const user = await fetchUser(id)
    return user.name
  } catch (err) {
    if (err instanceof Error) return `Error: ${err.message}`
    return "Unknown error"
  }
}

// Async error propagation
async function step1(): Promise<number> {
  throw new Error("step1 failed")
}

async function step2(): Promise<string> {
  const n = await step1()  // throws
  return `Result: ${n}`
}

async function run() {
  try {
    await step2()
  } catch (err) {
    console.log("Caught:", (err as Error).message)
  }
}

// Async class methods
class DataService {
  private cache: Map<number, any> = new Map()

  async get<T>(id: number, fetcher: (id: number) => Promise<T>): Promise<T> {
    if (this.cache.has(id)) {
      return this.cache.get(id) as T
    }
    const data = await fetcher(id)
    this.cache.set(id, data)
    return data
  }

  async getMany<T>(ids: number[], fetcher: (id: number) => Promise<T>): Promise<T[]> {
    return Promise.all(ids.map(id => this.get(id, fetcher)))
  }
}

// Async generator
async function* paginate<T>(
  fetchPage: (page: number, size: number) => Promise<T[]>,
  pageSize: number = 3,
): AsyncGenerator<T> {
  let page = 0
  while (true) {
    const items = await fetchPage(page, pageSize)
    if (items.length === 0) return
    for (const item of items) yield item
    page++
  }
}

// Async iteration with for-await-of
async function processAll(): Promise<void> {
  async function mockFetch(page: number, size: number): Promise<number[]> {
    if (page >= 3) return []
    return Array.from({ length: size }, (_, i) => page * size + i + 1)
  }

  const results: number[] = []
  for await (const item of paginate<number>(mockFetch, 3)) {
    results.push(item)
  }
  console.log("Paginated:", results)
}

// Concurrent with rate limiting
async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }

  return results
}

// Async IIFE
;(async () => {
  const data = await getUserWithPosts(1)
  console.log(data.user.name, data.posts.length, "posts")

  const parallel = await getUserAndPosts(2)
  console.log(parallel.user.email)

  console.log(await safeGet(3))
  await run()

  const service = new DataService()
  const users = await service.getMany([1, 2, 3], fetchUser)
  console.log(users.map(u => u.name))

  await processAll()

  const ids = [1, 2, 3, 4, 5, 6]
  const allUsers = await withConcurrency(ids, 2, fetchUser)
  console.log(allUsers.map(u => u.id))
})()
