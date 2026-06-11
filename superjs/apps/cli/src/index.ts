/**
 * `@superjs/cli` (Tier app) — the `superjs` command-line interface.
 *
 * Thin orchestration over `@superjs/compiler`: build / check / explain / init /
 * doctor are live; format / lint / doc / add / verify / migrate / test / lsp /
 * repl are wired stubs for later stages. The binary is `src/main.ts`; everything
 * here is exported for embedding and tests.
 */

export { run, parseArgs } from './lib/run.js';
export { VERSION } from './lib/commands.js';
export type { IO } from './lib/io.js';
export { nodeIO } from './lib/io.js';
export { formatPretty, formatJson, type DiagnosticFormat } from './lib/diagnostics-format.js';
