// SJS Example: BigInt Mixing Enforcement (ES2020)
// Task 2.3 — SJS-E004 diagnostic
// Spec: https://tc39.es/ecma262/#sec-numeric-types-bigint-add

// VALID: bigint arithmetic with other bigints
const a: bigint = 100n
const b: bigint = 200n
const sum: bigint = a + b           // OK
const product: bigint = a * b       // OK
const diff: bigint = b - a          // OK
const quotient: bigint = b / a      // OK
const remainder: bigint = b % a     // OK
const power: bigint = a ** 2n       // OK

// VALID: number arithmetic with other numbers
const x: number = 10
const y: number = 20
const numSum: number = x + y        // OK

// VALID: bigint comparisons (no mixing issue)
const isLarger: boolean = a > b     // OK — comparison allowed

// INVALID (SJS-E004): mixing bigint and number in arithmetic
// const bad1 = a + x    // SJS-E004: Cannot mix BigInt and number
// const bad2 = x * b    // SJS-E004: Cannot mix BigInt and number
// const bad3 = b - 5    // SJS-E004: Cannot mix BigInt and number

// BigInt conversion (must be explicit)
const numFromBigInt: number = Number(a)   // explicit cast — OK
const bigIntFromNum: bigint = BigInt(x)   // explicit cast — OK
