// Task 3.2: Optional chaining type inference
// ECMA-262 §13.5.1 Optional Chains, §13.13 Nullish Coalescing

// ── Optional member access (`?.`) ─────────────────────────────────────────────
// ECMA-262 §13.5.1 — short-circuits to undefined when object is null/undefined

const user = { name: "Alice", address: { city: "NYC" } }

// ✅ obj?.prop returns T | undefined (property type unioned with undefined)
const city: string | undefined = user?.name     // string | undefined
const age:  number | undefined = (user as any)?.age   // any?.x → any

// ❌ Cannot assign T | undefined directly to T without narrowing:
// const name: string = user?.name   // SJS-E001: string | undefined ≁ string

// ✅ Use ?? to provide a fallback (undefined case handled):
const displayName: string = user?.name ?? "Unknown"  // (string | undefined) → strip undefined → string

// ── Nullish coalescing (`??`) narrowing ───────────────────────────────────────
// ECMA-262 §13.13 — strips null/undefined from the left operand's type

type MaybeString = string | null | undefined

const raw: MaybeString = null
const safe: string = raw ?? "default"          // ✅ (string | null | undefined) ?? string → string

// ✅ Chaining optional access with ?? fallback
const greeting: string = user?.name ?? "Guest" // ✅ string

// ── Type narrowing examples ───────────────────────────────────────────────────

const maybeNumber: number | null = null
const definiteNumber: number = maybeNumber ?? 0   // ✅ null ?? number → number

const maybeStr: string | undefined = undefined
const definiteStr: string = maybeStr ?? "hello"   // ✅ undefined ?? string → string
