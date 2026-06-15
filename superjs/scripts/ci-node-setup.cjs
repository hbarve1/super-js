// Preloaded via NODE_OPTIONS in CI (applies to the main process, child
// processes, and worker threads). nx run-many spawns several task processes,
// each attaching exit/SIGINT/SIGTERM listeners to the shared process and
// tripping Node's 10-listener heuristic (MaxListenersExceededWarning — noise,
// not a leak). Lift the cap and suppress only that warning; all other warnings
// (deprecations, etc.) still print.
require('node:events').EventEmitter.defaultMaxListeners = 0
process.setMaxListeners(0)

const originalEmit = process.emit
process.emit = function (name, data, ...rest) {
  if (name === 'warning' && data && data.name === 'MaxListenersExceededWarning') {
    return false
  }
  return originalEmit.call(this, name, data, ...rest)
}
