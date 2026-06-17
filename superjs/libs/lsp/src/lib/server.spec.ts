import { describe, it, expect } from 'vitest';
import { LspServer } from './server.js';
import type { JsonRpcMessage } from './jsonrpc.js';

/** Spin up a server that records every outbound message. */
function harness(onExit?: (code: number) => void) {
  const sent: JsonRpcMessage[] = [];
  const server = new LspServer((m) => sent.push(m), onExit ? { onExit } : {});
  return { sent, server };
}

const open = (uri: string, text: string): JsonRpcMessage => ({
  method: 'textDocument/didOpen',
  params: { textDocument: { uri, text } },
});

const diags = (sent: JsonRpcMessage[], uri: string) =>
  sent
    .filter((m) => m.method === 'textDocument/publishDiagnostics'
      && (m.params as { uri: string }).uri === uri)
    .map((m) => (m.params as { diagnostics: unknown[] }).diagnostics);

describe('LspServer — lifecycle', () => {
  it('advertises text-sync capability on initialize', () => {
    const { sent, server } = harness();
    server.handle({ id: 1, method: 'initialize', params: {} });
    expect(sent[0]).toMatchObject({
      id: 1,
      result: { capabilities: { textDocumentSync: { openClose: true, change: 1 } } },
    });
  });

  it('replies to shutdown then exits 0', () => {
    let code = -1;
    const { sent, server } = harness((c) => { code = c; });
    server.handle({ id: 2, method: 'shutdown' });
    expect(sent.at(-1)).toMatchObject({ id: 2, result: null });
    server.handle({ method: 'exit' });
    expect(code).toBe(0);
  });

  it('exits non-zero when exit arrives without shutdown', () => {
    let code = -1;
    const { server } = harness((c) => { code = c; });
    server.handle({ method: 'exit' });
    expect(code).toBe(1);
  });

  it('returns method-not-found for an unknown request', () => {
    const { sent, server } = harness();
    server.handle({ id: 7, method: 'textDocument/hover', params: {} });
    expect(sent[0]).toMatchObject({ id: 7, error: { code: -32601 } });
  });

  it('ignores an unknown notification (no id, no reply)', () => {
    const { sent, server } = harness();
    server.handle({ method: '$/setTrace', params: {} });
    expect(sent).toHaveLength(0);
  });
});

describe('LspServer — diagnostics', () => {
  it('publishes diagnostics on didOpen for an ill-typed file', () => {
    const { sent, server } = harness();
    server.handle(open('file:///a.sjs', 'const count: number = "hello";'));
    const published = diags(sent, 'file:///a.sjs');
    expect(published).toHaveLength(1);
    expect(published[0]!.length).toBeGreaterThan(0);
    expect(published[0]![0]).toMatchObject({ source: 'superjs', severity: 1 });
  });

  it('publishes an empty list for a clean file', () => {
    const { sent, server } = harness();
    server.handle(open('file:///ok.sjs', 'const n: number = 1;'));
    expect(diags(sent, 'file:///ok.sjs')).toEqual([[]]);
  });

  it('maps spans to 0-based LSP ranges', () => {
    const { sent, server } = harness();
    server.handle(open('file:///r.sjs', 'const count: number = "hello";'));
    const d = (diags(sent, 'file:///r.sjs')[0] as { range: { start: { line: number } } }[])[0]!;
    expect(d.range.start.line).toBe(0); // SJS line 1 → LSP line 0
  });

  it('republishes on didChange (full sync)', () => {
    const { sent, server } = harness();
    server.handle(open('file:///c.sjs', 'const n: number = 1;'));
    server.handle({
      method: 'textDocument/didChange',
      params: { textDocument: { uri: 'file:///c.sjs' }, contentChanges: [{ text: 'const n: number = "x";' }] },
    });
    const published = diags(sent, 'file:///c.sjs');
    expect(published[0]).toEqual([]);              // clean on open
    expect(published[1]!.length).toBeGreaterThan(0); // error after change
  });

  it('clears diagnostics on didClose', () => {
    const { sent, server } = harness();
    server.handle(open('file:///d.sjs', 'const count: number = "hello";'));
    server.handle({ method: 'textDocument/didClose', params: { textDocument: { uri: 'file:///d.sjs' } } });
    expect(diags(sent, 'file:///d.sjs').at(-1)).toEqual([]);
  });
});
