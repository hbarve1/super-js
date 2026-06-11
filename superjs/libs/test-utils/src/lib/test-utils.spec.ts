import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Diagnostic } from '@superjs/types';
import {
  findFixtures, loadFixtures, loadFixture,
  codesOf, hasCode, errorsOf, warningsOf, countBySeverity, matchesDiagnostic, assertDiagnostic,
  snapshotNode, serializeNode, astEqual,
  makeHarness,
} from '../index.js';

function diag(code: string, severity: Diagnostic['severity'], line: number, column = 0): Diagnostic {
  const pos = { offset: 0, line, column };
  return { code, severity, message: `${code} msg`, span: { start: pos, end: pos } } as Diagnostic;
}

describe('fixtures', () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'sjs-fx-'));
    mkdirSync(join(root, 'nested'), { recursive: true });
    writeFileSync(join(root, 'a.sjs'), 'const a = 1;');
    writeFileSync(join(root, 'nested', 'b.sjs'), 'const b = 2;');
    writeFileSync(join(root, 'ignore.txt'), 'nope');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('finds .sjs files recursively, sorted, skipping other extensions', () => {
    const found = findFixtures(root);
    expect(found).toHaveLength(2);
    expect(found.every((p) => p.endsWith('.sjs'))).toBe(true);
  });
  it('loads fixtures with relative names + source', () => {
    const fxs = loadFixtures(root);
    expect(fxs.map((f) => f.name)).toEqual(['a.sjs', join('nested', 'b.sjs')]);
    expect(fxs[0]!.source).toBe('const a = 1;');
  });
  it('loads a single fixture', () => {
    expect(loadFixture(join(root, 'a.sjs')).source).toBe('const a = 1;');
  });
});

describe('diagnostic matchers', () => {
  const diags = [diag('SJS-E001', 'error', 3, 5), diag('SJS-W003', 'warning', 7), diag('SJS-E007', 'error', 9)];

  it('codesOf / hasCode', () => {
    expect(codesOf(diags)).toEqual(['SJS-E001', 'SJS-W003', 'SJS-E007']);
    expect(hasCode(diags, 'SJS-E007')).toBe(true);
    expect(hasCode(diags, 'SJS-E999')).toBe(false);
  });
  it('errorsOf / warningsOf / countBySeverity', () => {
    expect(errorsOf(diags)).toHaveLength(2);
    expect(warningsOf(diags)).toHaveLength(1);
    expect(countBySeverity(diags)).toEqual({ error: 2, warning: 1, info: 0, hint: 0 });
  });
  it('matchesDiagnostic honours code + position + severity', () => {
    expect(matchesDiagnostic(diags, { code: 'SJS-E001', line: 3, column: 5 })).toBe(true);
    expect(matchesDiagnostic(diags, { code: 'SJS-E001', line: 4 })).toBe(false);
    expect(matchesDiagnostic(diags, { code: 'SJS-W003', severity: 'warning' })).toBe(true);
  });
  it('assertDiagnostic throws with a helpful message on miss', () => {
    expect(() => assertDiagnostic(diags, { code: 'SJS-E001', line: 3 })).not.toThrow();
    expect(() => assertDiagnostic(diags, { code: 'SJS-E404' })).toThrow(/expected diagnostic/);
  });
});

describe('AST snapshot', () => {
  const node = {
    kind: 'VariableDecl', declKind: 'const',
    span: { start: { offset: 0, line: 1, column: 0 }, end: { offset: 9, line: 1, column: 9 } },
    id: { kind: 'Identifier', name: 'x', span: { start: { offset: 6, line: 1, column: 6 } } },
  };

  it('drops positional keys at every level', () => {
    const snap = snapshotNode(node) as Record<string, unknown>;
    expect(snap['span']).toBeUndefined();
    expect((snap['id'] as Record<string, unknown>)['span']).toBeUndefined();
    expect(snap['kind']).toBe('VariableDecl');
    expect((snap['id'] as Record<string, unknown>)['name']).toBe('x');
  });
  it('serializeNode is deterministic regardless of key order', () => {
    const reordered = { id: node.id, declKind: 'const', span: node.span, kind: 'VariableDecl' };
    expect(serializeNode(reordered)).toBe(serializeNode(node));
  });
  it('astEqual ignores spans', () => {
    const shifted = { ...node, span: { start: { offset: 99, line: 5, column: 2 }, end: { offset: 108, line: 5, column: 11 } } };
    expect(astEqual(node, shifted)).toBe(true);
  });
});

describe('compile-and-check harness (DI)', () => {
  // Inject a fake checker so Tier 0 stays compiler-free.
  const fakeCheck = (source: string) => ({
    diagnostics: source.includes('null') ? [diag('SJS-E001', 'error', 1)] : [],
  });
  const h = makeHarness(fakeCheck);

  it('diagnostics passes through the injected checker', async () => {
    expect(await h.diagnostics('const a = 1;')).toEqual([]);
  });
  it('expectClean resolves on clean source, rejects on errors', async () => {
    await expect(h.expectClean('const a = 1;')).resolves.toBeUndefined();
    await expect(h.expectClean('const a = null;')).rejects.toThrow(/expected no errors/);
  });
  it('expectCode asserts the code is present', async () => {
    await expect(h.expectCode('const a = null;', 'SJS-E001')).resolves.toBeUndefined();
    await expect(h.expectCode('const a = 1;', 'SJS-E001')).rejects.toThrow(/expected SJS-E001/);
  });
});
