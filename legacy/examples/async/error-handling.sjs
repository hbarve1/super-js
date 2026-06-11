// ── Error Handling ─────────────────────────────────────────────────────────

// Custom error classes
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = this.constructor.name
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(`${resource} with id ${id} not found`, "NOT_FOUND", 404)
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message, "VALIDATION_ERROR", 400)
  }
}

class NetworkError extends AppError {
  constructor(message: string, public readonly retryable: boolean = true) {
    super(message, "NETWORK_ERROR", 503)
  }
}

// try / catch / finally
function parseJSON<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    throw new ValidationError(`Invalid JSON: ${(err as Error).message}`)
  } finally {
    // always runs — cleanup, logging, etc.
    console.log("parseJSON attempted")
  }
}

// Error narrowing with instanceof
function handleError(err: unknown): string {
  if (err instanceof ValidationError) {
    return `Validation: ${err.message} (fields: ${JSON.stringify(err.fields)})`
  }
  if (err instanceof NotFoundError) {
    return `Not found (${err.statusCode}): ${err.message}`
  }
  if (err instanceof AppError) {
    return `App error [${err.code}]: ${err.message}`
  }
  if (err instanceof Error) {
    return `Error: ${err.message}`
  }
  return `Unknown: ${String(err)}`
}

// Result pattern (no exceptions needed)
type Ok<T>  = { ok: true;  value: T }
type Err<E> = { ok: false; error: E }
type Result<T, E = Error> = Ok<T> | Err<E>

function tryCatch<T>(fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() }
  } catch (err) {
    return { ok: false, error: err as Error }
  }
}

async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() }
  } catch (err) {
    return { ok: false, error: err as Error }
  }
}

// Error aggregation
class AggregateError_ extends Error {
  constructor(
    public readonly errors: Error[],
    message: string = `${errors.length} errors occurred`,
  ) {
    super(message)
    this.name = "AggregateError"
  }
}

async function validateAll(data: Record<string, string>): Promise<void> {
  const errors: Error[] = []

  if (!data.name) errors.push(new ValidationError("Name required", { name: "required" }))
  if (!data.email?.includes("@")) errors.push(new ValidationError("Invalid email", { email: "invalid" }))
  if (data.age && isNaN(Number(data.age))) errors.push(new ValidationError("Age must be number", { age: "not_number" }))

  if (errors.length > 0) throw new AggregateError_(errors)
}

// Error boundary pattern (wrap risky operations)
function withErrorBoundary<T>(
  fn: () => T,
  fallback: T,
  onError?: (err: Error) => void,
): T {
  try {
    return fn()
  } catch (err) {
    onError?.(err as Error)
    return fallback
  }
}

// Rethrowing
function processData(raw: string): number {
  try {
    const parsed = parseJSON<{ value: number }>(raw)
    if (typeof parsed.value !== "number") {
      throw new ValidationError("value must be a number", { value: "not_number" })
    }
    return parsed.value
  } catch (err) {
    if (err instanceof ValidationError) throw err  // rethrow known error
    throw new AppError(`Processing failed: ${(err as Error).message}`, "PROCESS_ERROR")
  }
}

// Usage
try {
  parseJSON("{invalid}")
} catch (err) {
  console.log(handleError(err))
}

try {
  throw new NotFoundError("User", 42)
} catch (err) {
  console.log(handleError(err))
}

const r1 = tryCatch(() => JSON.parse('{"x": 1}'))
const r2 = tryCatch(() => JSON.parse("bad"))
console.log(r1.ok ? r1.value : null)
console.log(r2.ok ? null : r2.error.message)

const safe = withErrorBoundary(() => { throw new Error("oops") }, "default", e => console.log("Boundary caught:", e.message))
console.log(safe)

;(async () => {
  try {
    await validateAll({ name: "", email: "bad", age: "not-a-number" })
  } catch (err) {
    if (err instanceof AggregateError_) {
      console.log(`${err.errors.length} validation errors:`)
      err.errors.forEach(e => console.log(" -", e.message))
    }
  }
})()
