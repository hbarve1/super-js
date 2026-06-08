// Binary expression type checking examples
// Demonstrates SJS-E004 and arithmetic type inference

// ── Valid arithmetic ──────────────────────────────────────────────────────────

const sum: number = 1 + 2           // number + number → number (OK)
const product: number = 3 * 4       // number * number → number (OK)
const greeting: string = "Hello, " + "world"  // string + string → string (OK)
const countStr: string = 42 + " items"         // number + string → string (OK)

const bigSum: bigint = 1n + 2n      // bigint + bigint → bigint (OK)
const bigProd: bigint = 10n * 5n    // bigint * bigint → bigint (OK)

// ── Comparison operators → boolean ───────────────────────────────────────────

const isGreater: boolean = 10 > 5   // OK
const isEqual: boolean = "a" === "a" // OK

// ── SJS-E004: BigInt + Number mixing ─────────────────────────────────────────
// The following would emit SJS-E004:
//
//   const bad1 = 1n + 2    // SJS-E004: Cannot mix BigInt and Number
//   const bad2 = 1 + 2n    // SJS-E004: Cannot mix BigInt and Number
//   const bad3 = 5n - 1    // SJS-E004: Cannot mix BigInt and Number
//
// ECMAScript §6.1.6.2 explicitly prohibits this — it throws TypeError at runtime.
// Correct approach: use explicit conversion
//   const ok = 1n + BigInt(2)   // bigint + bigint → OK
//   const ok2 = Number(1n) + 2  // number + number → OK
