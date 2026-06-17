/**
 * `@superjs/lsp` — the SuperJS Language Server (Stage 3, M1).
 *
 * `serveStdio()` is the production entry point (stdin/stdout). `serve()` and
 * `LspServer` are the testable seams; `encodeMessage` / `MessageBuffer` expose
 * the JSON-RPC framing for embedders (e.g. a WebSocket playground bridge).
 */

export { LspServer, type LspServerOptions } from './lib/server.js';
export { serve, serveStdio, type Channel, type ReadableLike, type WritableLike } from './lib/transport.js';
export { encodeMessage, MessageBuffer, type JsonRpcMessage } from './lib/jsonrpc.js';
