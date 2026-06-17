/**
 * The SuperJS language server — M1 slice 1: lifecycle, full-document text sync,
 * and push diagnostics. Each `LspServer` owns an isolated `@superjs/compiler`
 * session; LSP text-sync notifications feed that session and every change
 * republishes `textDocument/publishDiagnostics` for the affected document.
 *
 * The server is transport-agnostic: it receives already-decoded messages via
 * {@link handle} and emits replies through the `send` callback given at
 * construction. `connectStdio` (see `transport.ts`) wires it to a real process.
 */

import { Compiler } from '@superjs/compiler';
import type { Diagnostic, Severity, Span } from '@superjs/types';
import type { JsonRpcMessage } from './jsonrpc.js';

/** LSP `DiagnosticSeverity`. */
const SEVERITY: Record<Severity, number> = { error: 1, warning: 2, info: 3, hint: 4 };

interface LspPosition { line: number; character: number; }
interface LspRange { start: LspPosition; end: LspPosition; }
interface LspDiagnostic {
  range: LspRange;
  severity: number;
  code: string;
  source: string;
  message: string;
}

/** Map a SJS span (1-based line, 0-based column) to an LSP range (both 0-based). */
function toRange(span: Span): LspRange {
  return {
    start: { line: span.start.line - 1, character: span.start.column },
    end: { line: span.end.line - 1, character: span.end.column },
  };
}

function toLspDiagnostic(d: Diagnostic): LspDiagnostic {
  return {
    range: toRange(d.span),
    severity: SEVERITY[d.severity] ?? 1,
    code: d.code,
    source: 'superjs',
    message: d.message,
  };
}

export interface LspServerOptions {
  /** Invoked on `exit`; defaults to a no-op so tests don't kill the process. */
  readonly onExit?: (code: number) => void;
}

export class LspServer {
  private readonly compiler = new Compiler();
  private readonly open = new Set<string>();
  private shuttingDown = false;

  constructor(
    private readonly send: (msg: JsonRpcMessage) => void,
    private readonly opts: LspServerOptions = {},
  ) {}

  /** Dispatch one decoded JSON-RPC message. */
  handle(msg: JsonRpcMessage): void {
    switch (msg.method) {
      case 'initialize':
        return this.reply(msg.id, {
          capabilities: { textDocumentSync: { openClose: true, change: 1 } },
          serverInfo: { name: 'superjs-lsp', version: '0.0.1' },
        });
      case 'initialized':
        return; // notification, no reply
      case 'shutdown':
        this.shuttingDown = true;
        return this.reply(msg.id, null);
      case 'exit':
        return this.opts.onExit?.(this.shuttingDown ? 0 : 1);
      case 'textDocument/didOpen':
        return this.didOpen(msg.params);
      case 'textDocument/didChange':
        return this.didChange(msg.params);
      case 'textDocument/didClose':
        return this.didClose(msg.params);
      default:
        // Unknown request → method-not-found; unknown notification → ignore.
        if (msg.id !== undefined && msg.id !== null) {
          this.send({ id: msg.id, error: { code: -32601, message: `method not found: ${msg.method}` } });
        }
    }
  }

  private didOpen(params: unknown): void {
    const doc = (params as { textDocument?: { uri?: string; text?: string } })?.textDocument;
    if (!doc?.uri) return;
    this.open.add(doc.uri);
    this.compiler.setFile(doc.uri, doc.text ?? '');
    this.publish(doc.uri);
  }

  private didChange(params: unknown): void {
    const p = params as { textDocument?: { uri?: string }; contentChanges?: { text: string }[] };
    const uri = p?.textDocument?.uri;
    const changes = p?.contentChanges;
    if (!uri || !changes?.length) return;
    // Full sync: the last change carries the whole document.
    this.compiler.setFile(uri, changes[changes.length - 1]!.text);
    this.publish(uri);
  }

  private didClose(params: unknown): void {
    const uri = (params as { textDocument?: { uri?: string } })?.textDocument?.uri;
    if (!uri) return;
    this.open.delete(uri);
    this.compiler.removeFile(uri);
    this.publish(uri, []); // clear diagnostics for the closed file
  }

  /** Push `textDocument/publishDiagnostics` for one document. */
  private publish(uri: string, diagnostics?: LspDiagnostic[]): void {
    const list = diagnostics ?? this.compiler.diagnosticsFor(uri).map(toLspDiagnostic);
    this.send({ method: 'textDocument/publishDiagnostics', params: { uri, diagnostics: list } });
  }

  private reply(id: JsonRpcMessage['id'], result: unknown): void {
    this.send({ id, result });
  }
}
