// SJS Example: Object Spread Type Merging (ES2018+)
// Task 1.4 — specs/002-ecmascript-features/implementation-plan.md

// Basic spread: merges properties from both objects
const defaults = { theme: "light", fontSize: 14, lang: "en" }
const userPrefs = { theme: "dark", lang: "fr" }
const merged = { ...defaults, ...userPrefs }
// merged has theme: "dark", fontSize: 14, lang: "fr" (later overrides earlier)

// Spread with additional literal properties
const base = { id: 1, name: "base" }
const extended = { ...base, version: 2, active: true }

// Spread in function return
function withDefaults(opts: { timeout?: number }): { timeout: number; retries: number } {
  return { ...{ timeout: 5000, retries: 3 }, ...opts }
}

// Spread to clone and extend
type User = { id: number; name: string; role: string }
const admin: User = { id: 1, name: "Alice", role: "user" }
const promoted: User = { ...admin, role: "admin" }

// Object rest in destructuring (related)
const { id, ...profileData } = { id: 42, name: "Bob", email: "bob@example.com" }
