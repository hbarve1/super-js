// SJS Example: Error.cause typing (ES2022) + Error.isError (ES2025)
// Task 3.3 + 4.4 — specs/002-ecmascript-features/implementation-plan.md

// new Error(message) — basic
const basic = new Error("Something went wrong")
const msg: string = basic.message
const name: string = basic.name
const stack: string | undefined = basic.stack

// new Error(message, { cause }) — ES2022 cause option
async function fetchData(url: string): Promise<string> {
  try {
    return "data"
  } catch (err) {
    throw new Error(`Failed to fetch ${url}`, { cause: err })
  }
}

// Accessing .cause on error instances
function logError(e: Error): void {
  console.error(e.message)
  if (e.cause !== undefined) {
    console.error("Caused by:", e.cause)
  }
}

// Error.isError() — ES2025 type guard
function safeHandle(value: unknown): string {
  if (Error.isError(value)) {
    const isErr: boolean = Error.isError(value)
    return value.message   // value narrowed to Error-like
  }
  return String(value)
}

// Error subclasses (cause works for all)
const typeErr = new TypeError("Invalid argument", { cause: new Error("source") })
const rangeErr = new RangeError("Out of bounds")
