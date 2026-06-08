// Concurrent Async in SJS

type Result<T, E> = | Ok(T) | Err(E)

// Process N items in parallel with concurrency limit
async function withConcurrencyLimit<T, U>(
  items: T[],
  limit: number,
  process: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = new Array(items.length)
  let index = 0

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++
      results[i] = await process(items[i])
    }
  }

  const workers: Promise<void>[] = []
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    workers.push(worker())
  }
  await Promise.all(workers)
  return results
}

// Collect results into Result[]
async function collectResults<T>(
  items: T[],
  process: (item: T) => Promise<Result<string, string>>
): Promise<{ ok: string[]; errors: string[] }> {
  const results = await Promise.allSettled(items.map(process))
  const ok: string[] = []
  const errors: string[] = []
  for (const r of results) {
    if (r.status === 'rejected') {
      errors.push(String(r.reason))
    } else {
      match r.value {
        Ok(v) => ok.push(v)
        Err(e) => errors.push(e)
      }
    }
  }
  return { ok, errors }
}

// Async generator for streaming
async function* range(start: number, end: number, delay: number): AsyncGenerator<number> {
  for (let i = start; i <= end; i++) {
    await new Promise(r => setTimeout(r, delay))
    yield i
  }
}

async function main(): Promise<void> {
  // Parallel fetch with limit
  const ids = [1, 2, 3, 4, 5, 6, 7, 8]
  const pages = await withConcurrencyLimit(ids, 3, async (id) => {
    const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
    const data: dynamic = await res.json()
    return data.title
  })
  console.log(`Fetched ${pages.length} pages`)

  // Async generator
  const gen = range(1, 5, 10)
  for await (const n of gen) {
    process.stdout.write(n + ' ')
  }
  console.log()
}

main().catch(console.error)
