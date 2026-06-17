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

import { Compiler, offsetAt } from '@superjs/compiler';
import { model } from '@superjs/checker';
import type { Diagnostic, Severity, Span } from '@superjs/types';
import type { JsonRpcMessage } from './jsonrpc.js';
import { documentSymbols, foldingRanges } from './symbols.js';
import { completions } from './completion.js';
import { signatureHelp } from './signature.js';
import { semanticTokens, TOKEN_TYPES, TOKEN_MODIFIERS } from './semantic-tokens.js';

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

/**
 * Decode a `TextDocumentPositionParams` into compiler coordinates: LSP line is
 * 0-based, the compiler's is 1-based; columns are 0-based in both.
 */
function position(params: unknown): { uri: string; line: number; character: number } | null {
  const p = params as { textDocument?: { uri?: string }; position?: { line?: number; character?: number } };
  const uri = p?.textDocument?.uri;
  const pos = p?.position;
  if (!uri || typeof pos?.line !== 'number' || typeof pos.character !== 'number') return null;
  return { uri, line: pos.line + 1, character: pos.character };
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
  /** Open document sources, for the pure-AST queries (outline, folding). */
  private readonly sources = new Map<string, string>();
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
          capabilities: {
            textDocumentSync: { openClose: true, change: 1 },
            hoverProvider: true,
            definitionProvider: true,
            documentSymbolProvider: true,
            foldingRangeProvider: true,
            completionProvider: {},
            signatureHelpProvider: { triggerCharacters: ['(', ','] },
            semanticTokensProvider: {
              legend: { tokenTypes: TOKEN_TYPES, tokenModifiers: TOKEN_MODIFIERS },
              full: true,
            },
          },
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
      case 'textDocument/hover':
        return this.reply(msg.id, this.hover(msg.params));
      case 'textDocument/definition':
        return this.reply(msg.id, this.definition(msg.params));
      case 'textDocument/documentSymbol':
        return this.reply(msg.id, this.outline(msg.params));
      case 'textDocument/foldingRange':
        return this.reply(msg.id, this.folding(msg.params));
      case 'textDocument/completion':
        return this.reply(msg.id, this.completion(msg.params));
      case 'textDocument/signatureHelp':
        return this.reply(msg.id, this.signature(msg.params));
      case 'textDocument/semanticTokens/full':
        return this.reply(msg.id, this.semanticTokens(msg.params));
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
    const text = doc.text ?? '';
    this.sources.set(doc.uri, text);
    this.compiler.setFile(doc.uri, text);
    this.publish(doc.uri);
  }

  private didChange(params: unknown): void {
    const p = params as { textDocument?: { uri?: string }; contentChanges?: { text: string }[] };
    const uri = p?.textDocument?.uri;
    const changes = p?.contentChanges;
    if (!uri || !changes?.length) return;
    // Full sync: the last change carries the whole document.
    const text = changes[changes.length - 1]!.text;
    this.sources.set(uri, text);
    this.compiler.setFile(uri, text);
    this.publish(uri);
  }

  private didClose(params: unknown): void {
    const uri = (params as { textDocument?: { uri?: string } })?.textDocument?.uri;
    if (!uri) return;
    this.sources.delete(uri);
    this.compiler.removeFile(uri);
    this.publish(uri, []); // clear diagnostics for the closed file
  }

  /** `textDocument/documentSymbol` — the file outline (top-level declarations). */
  private outline(params: unknown): ReturnType<typeof documentSymbols> {
    const src = this.sourceOf(params);
    return src === null ? [] : documentSymbols(src);
  }

  /** `textDocument/foldingRange` — multi-line top-level regions. */
  private folding(params: unknown): ReturnType<typeof foldingRanges> {
    const src = this.sourceOf(params);
    return src === null ? [] : foldingRanges(src);
  }

  /** `textDocument/completion` — an `isIncomplete: false` list of proposals. */
  private completion(params: unknown): { isIncomplete: boolean; items: ReturnType<typeof completions> } {
    const src = this.sourceOf(params);
    return { isIncomplete: false, items: src === null ? [] : completions(src) };
  }

  /** `textDocument/signatureHelp` — the callee signature when inside a call. */
  private signature(params: unknown): ReturnType<typeof signatureHelp> {
    const pos = position(params);
    if (!pos) return null;
    const src = this.sources.get(pos.uri);
    if (src === undefined) return null;
    const offset = offsetAt(src, pos.line, pos.character);
    if (offset === null) return null;
    return signatureHelp(src, offset, (line, column) => this.compiler.typeAt(pos.uri, line, column));
  }

  /** `textDocument/semanticTokens/full` — the LSP flat integer token array. */
  private semanticTokens(params: unknown): { data: number[] } {
    const src = this.sourceOf(params);
    return { data: src === null ? [] : semanticTokens(src) };
  }

  private sourceOf(params: unknown): string | null {
    const uri = (params as { textDocument?: { uri?: string } })?.textDocument?.uri;
    return uri ? this.sources.get(uri) ?? null : null;
  }

  /** `textDocument/hover` — the type under the cursor, as a markdown code block. */
  private hover(params: unknown): { contents: { kind: string; value: string }; range?: LspRange } | null {
    const pos = position(params);
    if (!pos) return null;
    const type = this.compiler.typeAt(pos.uri, pos.line, pos.character);
    if (!type) return null;
    return { contents: { kind: 'markdown', value: '```sjs\n' + model.display(type) + '\n```' } };
  }

  /** `textDocument/definition` — the declaration site of the symbol under the cursor. */
  private definition(params: unknown): { uri: string; range: LspRange } | null {
    const pos = position(params);
    if (!pos) return null;
    const sym = this.compiler.symbolAt(pos.uri, pos.line, pos.character);
    if (!sym?.declaration) return null; // library global or unresolved
    return { uri: pos.uri, range: toRange(sym.declaration) };
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
