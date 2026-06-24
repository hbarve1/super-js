/**
 * `@superjs/dap` — Debug Adapter Protocol server for SuperJS (WS-B2).
 *
 * `runDebugStdio()` is the production entry (`superjs debug`). Phase 0 skeleton
 * only; compile + Node inspector bridge in Phase 1.
 */

export { SuperJsDebugSession, runDebugStdio, type LaunchArgs } from './lib/session.js';
export { formatRuntimeValue } from './lib/format.js';
