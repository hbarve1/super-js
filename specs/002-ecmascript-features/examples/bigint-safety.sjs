// binary-expr.sjs — Binary expression type checking in SJS
// Demonstrates: arithmetic inference, string concatenation, BigInt/Number mixing (SJS-E004)
// ECMA-262 §13.8 (Additive Operators), §6.1.6.2 (BigInt Type)

// ── Arithmetic inference ──────────────────────────────────────────────────────

const sum: number = 1 + 2           // OK: number + number → number
const diff: number = 10 - 3         // OK: number - number → number
const product: number = 4 * 5       // OK
const quotient: number = 10 / 2     // OK
const power: number = 2 ** 8        // OK: exponentiation

// ── String concatenation ──────────────────────────────────────────────────────

const greeting: string = "Hello" + ", " + "world"   // OK: string + string → string
const label: string = "Count: " + 42                 // OK: string + number → string (JS coercion)

// ── BigInt arithmetic ─────────────────────────────────────────────────────────

const big: bigint = 1000000000000n + 2000000000000n  // OK: bigint + bigint → bigint
const bigPow: bigint = 2n ** 64n                      // OK

// ── Boolean from comparison ───────────────────────────────────────────────────

const isLess: boolean = 1 < 2           // OK: comparison → boolean
const isEqual: boolean = "a" === "b"    // OK
const isNotEqual: boolean = 1 !== 2     // OK

// ── SJS-E004: BigInt/Number mix (compile-time error) ─────────────────────────

// const bad = 1n + 2      // SJS-E004: Cannot mix 'bigint' and 'number'
// const bad2 = 10 * 3n    // SJS-E004: Cannot mix 'number' and 'bigint'
