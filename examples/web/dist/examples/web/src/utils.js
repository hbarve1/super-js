"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debounce = debounce;
exports.formatDate = formatDate;
exports.generateId = generateId;
exports.throttle = throttle;
// ── utils.sjs — Shared utility functions ──────────────────────────────────────

/**
 * Generate a monotonically increasing integer ID.
 * Uses a module-level counter so each call returns a unique value.
 */
let _idCounter = 0;
function generateId() {
  _idCounter += 1;
  return _idCounter;
}

/**
 * Format a Unix timestamp (milliseconds) as a locale-aware short date string.
 */
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Returns a debounced version of `fn` that delays invocation by `wait` ms.
 * Subsequent calls within the window reset the timer.
 */
function debounce(fn, wait) {
  let timer = null;
  return function debounced(...args) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
}

/**
 * Returns a throttled version of `fn` that fires at most once per `limit` ms.
 */
function throttle(fn, limit) {
  let lastCall = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}
//# sourceMappingURL=utils.js.map
