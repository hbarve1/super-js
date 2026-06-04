// Task 1.2: Async/Await Type Inference
// ECMAScript §15.8 — Async Function Definitions
// https://tc39.es/ecma262/#sec-async-function-definitions
//
// SJS infers that async functions return Promise<T> and that
// `await` unwraps Promise<T> → T at the type level.

// ── Async function declarations ───────────────────────────────────────────────

// ✓ OK — annotated with Promise<number>; `return 42` is checked against number
async function fetchCount(): Promise<number> {
  return 42
}

// ✓ OK — unannotated async function; gradual typing applies
async function fetchData() {
  return "hello"
}

// ✗ SJS-E002 — returning string where Promise<number> requires number
// async function bad(): Promise<number> {
//   return "oops"
// }

// ── Async arrow functions ─────────────────────────────────────────────────────

// ✓ OK — async arrow annotated with Promise<string>
const greet = async (): Promise<string> => "hello"

// ✗ SJS-E002 — async arrow returns number, annotation says Promise<string>
// const wrong = async (): Promise<string> => 42

// ── await unwraps Promise<T> → T ─────────────────────────────────────────────

async function main(): Promise<void> {
  // ✓ OK — fetchCount() returns Promise<number>, await gives number
  const count: number = await fetchCount()

  // ✓ OK — calling an async function yields Promise<number>
  const promise: Promise<number> = fetchCount()

  // ✗ SJS-E001 — await fetchCount() is number, not string
  // const bad: string = await fetchCount()
}

// ── SJS-E009: await outside async ────────────────────────────────────────────

// The checker emits SJS-E009 when `await` appears inside a non-async function.
// Babel's parser rejects this at parse time, so the checker fires in AST
// verification mode (e.g., after preprocessing or manual AST construction).
