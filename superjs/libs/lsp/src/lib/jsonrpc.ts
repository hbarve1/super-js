/**
 * JSON-RPC 2.0 message framing for LSP — the `Content-Length` header transport
 * (base protocol of the Language Server Protocol). Pure string in / string out,
 * with no dependency on a concrete byte stream, so the server is driven the same
 * way in tests (in-memory) and in production (stdin/stdout).
 */

/** Internal sentinels for {@link MessageBuffer.next}. */
const SKIP = Symbol('skip');
const STOP = Symbol('stop');

/** A decoded JSON-RPC message — request, response, or notification. */
export interface JsonRpcMessage {
  readonly jsonrpc?: string;
  readonly id?: number | string | null;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { code: number; message: string; data?: unknown };
}

/** Frame a message as `Content-Length: N\r\n\r\n<json>` (UTF-8 byte length). */
export function encodeMessage(msg: JsonRpcMessage): string {
  const json = JSON.stringify({ jsonrpc: '2.0', ...msg });
  const length = Buffer.byteLength(json, 'utf8');
  return `Content-Length: ${length}\r\n\r\n${json}`;
}

/**
 * Accumulates raw transport bytes and yields complete messages as full frames
 * arrive. Handles partial reads (a frame split across chunks) and back-to-back
 * frames in one chunk.
 */
export class MessageBuffer {
  private buf = Buffer.alloc(0);

  /** Append a chunk and return every complete message now available. */
  append(chunk: Buffer | string): JsonRpcMessage[] {
    this.buf = Buffer.concat([this.buf, typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk]);
    const out: JsonRpcMessage[] = [];
    for (;;) {
      const r = this.next();
      if (r === STOP) break;   // need more bytes — wait for the next chunk
      if (r !== SKIP) out.push(r);
    }
    return out;
  }

  /**
   * Consume the front frame. Returns the decoded message, `SKIP` when a complete
   * but unusable frame was dropped (try the next one), or `STOP` when no complete
   * frame is present yet (wait for more bytes).
   */
  private next(): JsonRpcMessage | typeof SKIP | typeof STOP {
    const headerEnd = this.buf.indexOf('\r\n\r\n');
    if (headerEnd === -1) return STOP;
    const header = this.buf.subarray(0, headerEnd).toString('ascii');
    const match = /content-length:\s*(\d+)/i.exec(header);
    if (!match) {
      // Unparseable header — drop it to avoid a permanent stall.
      this.buf = this.buf.subarray(headerEnd + 4);
      return SKIP;
    }
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (this.buf.length < bodyStart + length) return STOP; // body not fully arrived
    const body = this.buf.subarray(bodyStart, bodyStart + length).toString('utf8');
    this.buf = this.buf.subarray(bodyStart + length);
    try {
      return JSON.parse(body) as JsonRpcMessage;
    } catch {
      return SKIP; // malformed JSON — drop this frame, keep going
    }
  }
}
