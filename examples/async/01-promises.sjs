// Promises in SJS

// Basic promise
function fetchData(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (url.startsWith('https://')) {
        resolve(`data from ${url}`)
      } else {
        reject(new Error('HTTPS required'))
      }
    }, 100)
  })
}

// Promise chaining
function processData(data: string): Promise<string> {
  return Promise.resolve(data.toUpperCase())
}

// Promise.all
function fetchAll(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(fetchData))
}

// Promise.allSettled for partial success
interface SettledResult {
  url: string
  success: boolean
  value: string?
  error: string?
}

async function fetchWithStatus(urls: string[]): Promise<SettledResult[]> {
  const results = await Promise.allSettled(urls.map(fetchData))
  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return { url: urls[i], success: true, value: r.value, error: null }
    } else {
      return { url: urls[i], success: false, value: null, error: String(r.reason) }
    }
  })
}

// Promise race (timeout pattern)
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  )
  return Promise.race([promise, timeout])
}

async function main(): Promise<void> {
  // Chain
  const result = await fetchData('https://api.example.com')
    .then(processData)
  console.log('chained:', result)

  // All
  const all = await fetchAll(['https://a.com', 'https://b.com'])
  console.log('all:', all)

  // Partial (one bad URL)
  const statuses = await fetchWithStatus(['https://ok.com', 'http://bad.com'])
  for (const s of statuses) {
    console.log(`${s.url}: ${s.success ? s.value : s.error}`)
  }
}

main().catch(console.error)
