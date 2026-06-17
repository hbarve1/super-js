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
    server.handle({ id: 7, method: 'textDocument/formatting', params: {} });
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

const at = (uri: string, line: number, character: number) => ({ textDocument: { uri }, position: { line, character } });

describe('LspServer — hover', () => {
  it('advertises hover + definition capabilities', () => {
    const { sent, server } = harness();
    server.handle({ id: 1, method: 'initialize', params: {} });
    expect((sent[0]!.result as { capabilities: Record<string, unknown> }).capabilities)
      .toMatchObject({ hoverProvider: true, definitionProvider: true });
  });

  it('returns the type of the identifier under the cursor as a markdown block', () => {
    const { sent, server } = harness();
    //                                 line 1: `const m = n;` — `n` reference at char 10
    server.handle(open('file:///h.sjs', 'const n: number = 1;\nconst m = n;'));
    server.handle({ id: 5, method: 'textDocument/hover', params: at('file:///h.sjs', 1, 10) });
    const r = sent.at(-1)!.result as { contents: { kind: string; value: string } };
    expect(r.contents.kind).toBe('markdown');
    expect(r.contents.value).toContain('number');
  });

  it('returns null hover off any typed node', () => {
    const { sent, server } = harness();
    server.handle(open('file:///h2.sjs', 'const n: number = 1;'));
    server.handle({ id: 6, method: 'textDocument/hover', params: at('file:///h2.sjs', 5, 0) });
    expect(sent.at(-1)).toMatchObject({ id: 6, result: null });
  });
});

describe('LspServer — definition', () => {
  it('resolves a use to its declaration span (0-based range)', () => {
    const { sent, server } = harness();
    //                                   0         1
    //                                   0123456789012345678
    server.handle(open('file:///def.sjs', 'const x: number = 1;\nconst y: number = x;'));
    server.handle({ id: 8, method: 'textDocument/definition', params: at('file:///def.sjs', 1, 18) });
    const loc = sent.at(-1)!.result as { uri: string; range: { start: { line: number; character: number } } };
    expect(loc.uri).toBe('file:///def.sjs');
    expect(loc.range.start).toEqual({ line: 0, character: 6 }); // `x` declared at line 1 col 7 (0-based 6)
  });

  it('returns null when the cursor is not on a resolvable symbol', () => {
    const { sent, server } = harness();
    server.handle(open('file:///def2.sjs', 'const x: number = 1;'));
    server.handle({ id: 9, method: 'textDocument/definition', params: at('file:///def2.sjs', 0, 0) });
    expect(sent.at(-1)).toMatchObject({ id: 9, result: null });
  });
});

const td = (uri: string) => ({ textDocument: { uri } });

describe('LspServer — outline + folding', () => {
  it('advertises documentSymbol + foldingRange capabilities', () => {
    const { sent, server } = harness();
    server.handle({ id: 1, method: 'initialize', params: {} });
    expect((sent[0]!.result as { capabilities: Record<string, unknown> }).capabilities)
      .toMatchObject({ documentSymbolProvider: true, foldingRangeProvider: true });
  });

  it('returns the outline of an open document', () => {
    const { sent, server } = harness();
    server.handle(open('file:///o.sjs', 'export function f(): void {}\nconst x: number = 1;'));
    server.handle({ id: 3, method: 'textDocument/documentSymbol', params: td('file:///o.sjs') });
    const names = (sent.at(-1)!.result as { name: string }[]).map((s) => s.name);
    expect(names).toEqual(['f', 'x']);
  });

  it('returns folding ranges for an open document', () => {
    const { sent, server } = harness();
    server.handle(open('file:///fold.sjs', 'function f(): void {\n  return;\n}'));
    server.handle({ id: 4, method: 'textDocument/foldingRange', params: td('file:///fold.sjs') });
    expect(sent.at(-1)!.result).toEqual([{ startLine: 0, endLine: 2 }]);
  });

  it('returns an empty outline for an unopened document', () => {
    const { sent, server } = harness();
    server.handle({ id: 5, method: 'textDocument/documentSymbol', params: td('file:///gone.sjs') });
    expect(sent.at(-1)).toMatchObject({ id: 5, result: [] });
  });
});

describe('LspServer — completion', () => {
  it('advertises a completion provider', () => {
    const { sent, server } = harness();
    server.handle({ id: 1, method: 'initialize', params: {} });
    expect((sent[0]!.result as { capabilities: Record<string, unknown> }).capabilities.completionProvider).toBeDefined();
  });

  it('returns a complete list including local declarations', () => {
    const { sent, server } = harness();
    server.handle(open('file:///c.sjs', 'const widget: number = 1;'));
    server.handle({ id: 3, method: 'textDocument/completion', params: at('file:///c.sjs', 0, 25) });
    const r = sent.at(-1)!.result as { isIncomplete: boolean; items: { label: string }[] };
    expect(r.isIncomplete).toBe(false);
    expect(r.items.map((i) => i.label)).toContain('widget');
  });

  it('returns an empty item list for an unopened document', () => {
    const { sent, server } = harness();
    server.handle({ id: 4, method: 'textDocument/completion', params: at('file:///none.sjs', 0, 0) });
    expect(sent.at(-1)!.result).toEqual({ isIncomplete: false, items: [] });
  });
});

describe('LspServer — signatureHelp', () => {
  it('advertises a signatureHelp provider', () => {
    const { sent, server } = harness();
    server.handle({ id: 1, method: 'initialize', params: {} });
    expect((sent[0]!.result as { capabilities: Record<string, unknown> }).capabilities.signatureHelpProvider)
      .toBeDefined();
  });

  it('reports the callee signature and active parameter inside a call', () => {
    const { sent, server } = harness();
    const src = 'function add(a: number, b: number): number { return a + b; }\nconst r: number = add(1, 2);';
    server.handle(open('file:///s.sjs', src));
    // line 1 (0-based), char 25 → the `2` (second argument).
    server.handle({ id: 3, method: 'textDocument/signatureHelp', params: at('file:///s.sjs', 1, 25) });
    const help = sent.at(-1)!.result as { signatures: { label: string }[]; activeParameter: number };
    expect(help.signatures[0]!.label).toContain('a: number');
    expect(help.activeParameter).toBe(1);
  });

  it('returns null when the cursor is not inside a call', () => {
    const { sent, server } = harness();
    server.handle(open('file:///s2.sjs', 'const x: number = 1;'));
    server.handle({ id: 4, method: 'textDocument/signatureHelp', params: at('file:///s2.sjs', 0, 6) });
    expect(sent.at(-1)).toMatchObject({ id: 4, result: null });
  });
});

describe('LspServer — semanticTokens', () => {
  it('advertises a semanticTokens provider with a legend', () => {
    const { sent, server } = harness();
    server.handle({ id: 1, method: 'initialize', params: {} });
    const cap = (sent[0]!.result as { capabilities: Record<string, { legend?: { tokenTypes: string[] } }> })
      .capabilities.semanticTokensProvider;
    expect(cap!.legend!.tokenTypes).toContain('keyword');
  });

  it('returns an encoded token array for an open document', () => {
    const { sent, server } = harness();
    server.handle(open('file:///t.sjs', 'const x = 1;'));
    server.handle({ id: 3, method: 'textDocument/semanticTokens/full', params: td('file:///t.sjs') });
    const data = (sent.at(-1)!.result as { data: number[] }).data;
    expect(data.length % 5).toBe(0);
    expect(data.slice(0, 5)).toEqual([0, 0, 5, 0, 0]); // `const` → keyword
  });

  it('returns empty data for an unopened document', () => {
    const { sent, server } = harness();
    server.handle({ id: 4, method: 'textDocument/semanticTokens/full', params: td('file:///none.sjs') });
    expect(sent.at(-1)!.result).toEqual({ data: [] });
  });
});
