import { describe, it, expect } from 'vitest';
import { documentSymbols, foldingRanges } from './symbols.js';

describe('documentSymbols', () => {
  it('lists top-level declarations with LSP symbol kinds', () => {
    const src = [
      'function f(): void {}',
      'class C {}',
      'type T = number;',
      'const k: number = 1;',
      'let m: number = 2;',
    ].join('\n');
    expect(documentSymbols(src).map((s) => [s.name, s.kind])).toEqual([
      ['f', 12], // Function
      ['C', 5],  // Class
      ['T', 11], // Interface (type alias)
      ['k', 14], // Constant
      ['m', 13], // Variable
    ]);
  });

  it('unwraps exported declarations', () => {
    expect(documentSymbols('export function g(): void {}').map((s) => s.name)).toEqual(['g']);
    expect(documentSymbols('export default class D {}').map((s) => s.name)).toEqual(['D']);
  });

  it('uses the identifier span as the selection range', () => {
    const [s] = documentSymbols('const value: number = 1;');
    // `value` starts at column 6 (after `const `).
    expect(s!.selectionRange.start.character).toBe(6);
    expect(s!.range.start.character).toBe(0); // full decl starts at column 0
  });

  it('ignores non-declaration statements', () => {
    expect(documentSymbols('f();\n1 + 1;')).toEqual([]);
  });
});

describe('foldingRanges', () => {
  it('folds a multi-line declaration', () => {
    const src = 'function f(): void {\n  return;\n}';
    expect(foldingRanges(src)).toEqual([{ startLine: 0, endLine: 2 }]);
  });

  it('does not fold a single-line declaration', () => {
    expect(foldingRanges('const x: number = 1;')).toEqual([]);
  });
});
