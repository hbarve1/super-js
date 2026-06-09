// logical-conditional.sjs — Logical and conditional expression type inference
// Demonstrates: &&, ||, ?? type inference; ternary union types
//
// Spec refs:
//   ECMA-262 §13.13 Binary Logical Operators — https://tc39.es/ecma262/#sec-binary-logical-operators
//   ECMA-262 §13.14 Conditional Operator   — https://tc39.es/ecma262/#sec-conditional-operator

// ── Logical AND (&&) — ECMA-262 §13.13.3 ─────────────────────────────────────
// `a && b`: returns a when falsy, b when a is truthy.
// SJS infers the union of both branch types (conservative — mirrors TypeScript).

const n: number = 1 && 2               // number && number → number ✓
const s: string = "" && "hello"         // string && string → string ✓

// ── Logical OR (||) — ECMA-262 §13.13.2 ──────────────────────────────────────
// `a || b`: returns a when truthy, b when a is falsy.
// SJS infers union of both types.

const fallback: string = "provided" || "default"     // string || string → string ✓
const mixed: number | string = 0 || "fallback"       // number | string → number | string ✓

// ── Nullish Coalescing (??) — ECMA-262 §13.13.4 ──────────────────────────────
// `a ?? b`: returns a when a is non-null/undefined, b when a is null/undefined.
// SJS strips null/undefined from the left type and unions with right type.

declare const maybeStr: string | null
const definiteStr: string = maybeStr ?? "default"    // (string | null) ?? string → string ✓

declare const maybeNum: number | undefined
const definiteNum: number = maybeNum ?? 0            // (number | undefined) ?? number → number ✓

const fromNull: number = null ?? 42                  // null ?? number → number ✓
const fromUndef: string = undefined ?? "hello"       // undefined ?? string → string ✓

// ── Conditional (ternary) expression — ECMA-262 §13.14 ───────────────────────
// `cond ? a : b` → union of types of a and b.

declare const flag: boolean

const sameType: number = flag ? 1 : 2               // number | number = number ✓
const union: number | string = flag ? 42 : "text"   // number | string ✓

// Ternary with binary expression branches
const computed: number = flag ? 1 + 2 : 10 - 3     // number ✓

// ── Invalid examples (uncommenting triggers SJS-E001) ─────────────────────────

// const bad1: string = "a" || 42          // SJS-E001: string | number ≁ string
// const bad2: number = flag ? 1 : "oops" // SJS-E001: number | string ≁ number
