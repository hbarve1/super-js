/**
 * Wire an {@link LspServer} to a byte transport. The default binds the standard
 * LSP channel: read framed messages from `stdin`, write replies to `stdout`.
 * The streams are injectable so the binding itself is unit-testable.
 */

import { LspServer, type LspServerOptions } from './server.js';
import { encodeMessage, MessageBuffer, type JsonRpcMessage } from './jsonrpc.js';

export interface ReadableLike {
  on(event: 'data', listener: (chunk: Buffer | string) => void): unknown;
}
export interface WritableLike {
  write(chunk: string): unknown;
}

export interface Channel {
  readonly input: ReadableLike;
  readonly output: WritableLike;
}

/**
 * Start a server reading framed messages from `channel.input` and writing framed
 * replies to `channel.output`. Returns the server so callers can hold a handle.
 */
export function serve(channel: Channel, opts: LspServerOptions = {}): LspServer {
  const buffer = new MessageBuffer();
  const server = new LspServer(
    (msg: JsonRpcMessage) => channel.output.write(encodeMessage(msg)),
    opts,
  );
  channel.input.on('data', (chunk) => {
    for (const msg of buffer.append(chunk)) server.handle(msg);
  });
  return server;
}

/** Bind a server to this process's stdin/stdout — the production entry point. */
export function serveStdio(opts: LspServerOptions = {}): LspServer {
  process.stdin.setEncoding('utf8');
  return serve({ input: process.stdin, output: process.stdout }, {
    onExit: (code) => process.exit(code),
    ...opts,
  });
}
