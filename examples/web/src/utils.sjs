// ── utils.sjs — Shared utility functions ──────────────────────────────────────

/**
 * Generate a monotonically increasing integer ID.
 * Uses a module-level counter so each call returns a unique value.
 */
let _idCounter: number = 0

export function generateId(): number {
  _idCounter += 1
  return _idCounter
}

/**
 * Format a Unix timestamp (milliseconds) as a locale-aware short date string.
 */
export function formatDate(ts: number): string {
  const d: Date = new Date(ts)
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Returns a debounced version of `fn` that delays invocation by `wait` ms.
 * Subsequent calls within the window reset the timer.
 */
export function debounce(fn: (...args: dynamic[]) => void, wait: number): (...args: dynamic[]) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function debounced(...args: any[]): void {
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }
}

/**
 * Returns a throttled version of `fn` that fires at most once per `limit` ms.
 */
export function throttle(fn: (...args: dynamic[]) => void, limit: number): (...args: dynamic[]) => void {
  let lastCall: number = 0

  return function throttled(...args: any[]): void {
    const now: number = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      fn(...args)
    }
  }
}
