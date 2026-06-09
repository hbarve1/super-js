// SJS Example: Promise.withResolvers (ES2024)
// Task 2.4 — specs/002-ecmascript-features/implementation-plan.md
// Spec: https://tc39.es/proposal-promise-with-resolvers/

// Basic usage: deferred Promise pattern
const { promise, resolve, reject } = Promise.withResolvers<number>()

// Use in event-driven code
function waitForValue(): Promise<number> {
  const { promise, resolve, reject } = Promise.withResolvers<number>()
  setTimeout(() => resolve(42), 100)
  return promise
}

// Multiple callbacks pattern
type EventResolver<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function createEventPromise<T>(): EventResolver<T> {
  return Promise.withResolvers<T>()
}

const numberEvent = createEventPromise<number>()
// Resolve from anywhere:
numberEvent.resolve(100)
const result: Promise<number> = numberEvent.promise
