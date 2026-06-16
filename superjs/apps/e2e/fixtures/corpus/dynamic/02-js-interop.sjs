// dynamic/02-js-interop.sjs — dynamic at the JS interop boundary
//
// Pattern: accept dynamic from an external source, narrow immediately.
// Never pass dynamic deeper than the boundary function — convert to a typed
// value as early as possible and work with the typed value thereafter.
//
// Three narrowing tools available:
//   typeof x === "string"   — for primitive types
//   x !== null              — for null guard
//   Array.isArray(x)        — for arrays

// ─── Primitive extractors ──────────────────────────────────────────────────

// Returns string? — null signals "value was not a string"
function extractString(raw: dynamic): string? {
  if (typeof raw === "string") return raw
  return null
}

// Returns number? — null signals "value was not a number"
function extractNumber(raw: dynamic): number? {
  if (typeof raw === "number") return raw
  return null
}

// Returns boolean? — null signals "value was not a boolean"
function extractBoolean(raw: dynamic): boolean? {
  if (typeof raw === "boolean") return raw
  return null
}

// ─── Typed config record ───────────────────────────────────────────────────

type ServerConfig {
  host: string
  port: number
  tls: boolean
}

// Convert an opaque dynamic object into a fully typed ServerConfig.
// Returns null if any required field is missing or has the wrong type.
function parseServerConfig(raw: dynamic): ServerConfig? {
  if (raw === null || typeof raw !== "object") return null

  const host = extractString(raw.host)
  const port = extractNumber(raw.port)
  const tls  = extractBoolean(raw.tls)

  if (host === null || port === null || tls === null) return null
  return { host, port, tls }
}

// ─── Typed list ────────────────────────────────────────────────────────────

// Parse a dynamic array whose elements should all be strings.
// Elements that are not strings are skipped (logged as warnings).
function parseStringList(raw: dynamic): string[] {
  if (!Array.isArray(raw)) return []
  const result: string[] = []
  for (const item of raw) {
    const s = extractString(item)
    if (s !== null) {
      result.push(s)
    } else {
      console.log("warning: skipping non-string element: " + typeof item)
    }
  }
  return result
}

// ─── Demo ──────────────────────────────────────────────────────────────────

// Simulate values arriving from a JSON API or legacy JS library.
const rawConfig: dynamic = JSON.parse('{"host":"localhost","port":3000,"tls":false}')
const config = parseServerConfig(rawConfig)
if (config !== null) {
  console.log(config.host + ":" + config.port + " tls=" + config.tls)
  // localhost:3000 tls=false
}

// Missing field — parseServerConfig returns null
const incomplete: dynamic = JSON.parse('{"host":"db.internal"}')
const bad = parseServerConfig(incomplete)
console.log(bad)   // null

// String list from a dynamic source
const rawTags: dynamic = JSON.parse('["alpha","beta",42,"gamma"]')
const tags = parseStringList(rawTags)
console.log(tags)  // warning: skipping non-string element: number
                   // ["alpha","beta","gamma"]

// Primitives narrowed at the boundary
const fromJs: dynamic = "hello"
const s = extractString(fromJs)
if (s !== null) console.log(s.toUpperCase())  // HELLO
