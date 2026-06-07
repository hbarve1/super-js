// Task 3.1: Unary expression type inference
// ECMA-262 §13.5 Unary Operators

// ── typeof → string ───────────────────────────────────────────────────────────
// ECMA-262 §13.5.3 The typeof Operator
const typeStr: string = typeof 42           // ✅ always string
const typeStr2: string = typeof "hello"     // ✅ always string
const typeStr3: string = typeof true        // ✅ always string
const typeStr4: string = typeof undefined   // ✅ "undefined"

// ❌ typeof result is string, not number:
// const bad: number = typeof 42

// ── ! (logical not) → boolean ────────────────────────────────────────────────
// ECMA-262 §13.5.7 Logical NOT Operator
const notTrue: boolean  = !true             // ✅ boolean
const notZero: boolean  = !0                // ✅ boolean
const notStr:  boolean  = !"hello"          // ✅ boolean

// ── void → undefined ─────────────────────────────────────────────────────────
// ECMA-262 §13.5.2 The void Operator
const nothing: undefined = void 0           // ✅ undefined

// ── Numeric unary operators ───────────────────────────────────────────────────
// ECMA-262 §13.5.4 (Unary +), §13.5.5 (Unary -)
const neg: number  = -42                    // ✅ number
const pos: number  = +3.14                  // ✅ number
const bitNot: number = ~5                   // ✅ ~ → number

// BigInt unary — keeps bigint type
const negBig: bigint = -10n                 // ✅ bigint

// ── Arithmetic pipelines using unary results ──────────────────────────────────
const x: number = -(3 + 4)                 // ✅ -number → number
const y: number = ~(0xFF & 0x0F)           // ✅ ~number → number
