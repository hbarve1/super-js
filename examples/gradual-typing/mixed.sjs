// ── Gradual Typing: Mixed — some annotations, some not ────────────────────
// Super.js enforces types only where annotations are present.
// Unannotated code is treated as `any` and passes type checking.

// Fully annotated — type-checked
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Partially annotated — only return type specified
function buildUrl(base, path, params): string {
  const query = params ? "?" + new URLSearchParams(params).toString() : ""
  return base + path + query
}

// Unannotated — no type checking
function legacyProcess(data) {
  return data.map(item => ({
    id: item.id,
    label: item.name || item.label || String(item.id),
  }))
}

// Class: some fields annotated, some not
class ApiClient {
  baseUrl: string
  headers: Record<string, string>
  timeout       // unannotated — any

  constructor(baseUrl: string, options?) {
    this.baseUrl = baseUrl
    this.headers = options?.headers || {}
    this.timeout = options?.timeout || 5000
  }

  // Annotated method — fully type-checked
  async get<T>(path: string): Promise<T> {
    const url = this.baseUrl + path
    const res = await fetch(url, {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeout),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  // Unannotated method — passes type checking
  post(path, body) {
    return fetch(this.baseUrl + path, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }
}

// Migrating from JS: start with return types only
function parseConfig(raw) {
  const parsed = JSON.parse(raw)
  return {
    host: parsed.host || "localhost",
    port: Number(parsed.port) || 3000,
    debug: Boolean(parsed.debug),
  }
}

// Annotate the return type incrementally
function parseConfig2(raw): { host: string; port: number; debug: boolean } {
  const parsed = JSON.parse(raw)  // `parsed` is still `any` — gradual
  return {
    host: parsed.host || "localhost",
    port: Number(parsed.port) || 3000,
    debug: Boolean(parsed.debug),
  }
}

// Usage
console.log(clamp(15, 0, 10))
console.log(clamp(-5, 0, 10))
console.log(buildUrl("https://api.example.com", "/users", { page: "1", limit: "10" }))

const raw = legacyProcess([
  { id: 1, name: "Alice" },
  { id: 2, label: "Bob" },
  { id: 3 },
])
console.log(raw)

const config = parseConfig2('{"host":"example.com","port":"8080","debug":"true"}')
console.log(config)
