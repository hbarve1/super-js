import { describe, it, expect } from 'vitest';
import { doc, renderMarkdown, renderJson } from '../index.js';

describe('doc() — extraction', () => {
  it('documents an exported function from its signature', () => {
    const [s] = doc('export function add(a: number, b: number): number { return a + b; }');
    expect(s).toMatchObject({ name: 'add', kind: 'function' });
    expect(s!.signature).toBe('function add(a: number, b: number): number');
  });

  it('documents an exported type alias and sum type', () => {
    const syms = doc('export type Id = string;\nexport type Status = Active | Done;');
    expect(syms.map((s) => s.signature)).toEqual([
      'type Id = string',
      'type Status = Active | Done',
    ]);
  });

  it('documents an exported const with its annotation', () => {
    const [s] = doc('export const MAX: number = 100;');
    expect(s).toMatchObject({ name: 'MAX', kind: 'const', signature: 'const MAX: number' });
  });

  it('ignores non-exported declarations', () => {
    expect(doc('function hidden() {}\nconst x = 1;')).toEqual([]);
  });

  it('marks a default-exported function', () => {
    const [s] = doc('export default function main(): void {}');
    expect(s).toMatchObject({ kind: 'default', name: 'main' });
  });

  it('attaches a leading doc comment with description and tags', () => {
    const src = [
      '/**',
      ' * Adds two numbers.',
      ' *',
      ' * @since 1.0.0',
      ' * @deprecated use sum()',
      ' */',
      'export function add(a: number, b: number): number { return a + b; }',
    ].join('\n');
    const [s] = doc(src);
    expect(s!.doc?.description).toBe('Adds two numbers.');
    expect(s!.doc?.tags).toEqual([
      { tag: 'since', value: '1.0.0' },
      { tag: 'deprecated', value: 'use sum()' },
    ]);
  });

  it('leaves doc null when there is no preceding comment', () => {
    expect(doc('export const x: number = 1;')[0]!.doc).toBeNull();
  });
});

describe('doc() — rendering', () => {
  it('renders Markdown with a signature block and description', () => {
    const md = renderMarkdown(doc('/** A counter. */\nexport const n: number = 0;'), 'mod');
    expect(md).toContain('# mod');
    expect(md).toContain('## `n`');
    expect(md).toContain('```sjs\nconst n: number\n```');
    expect(md).toContain('A counter.');
  });

  it('renders an @example as a code block', () => {
    const src = '/**\n * @example\n * add(1, 2)\n */\nexport function add(a: number, b: number): number { return a + b; }';
    expect(renderMarkdown(doc(src))).toContain('**Example**');
  });

  it('reports no symbols cleanly', () => {
    expect(renderMarkdown([])).toContain('_No exported symbols._');
  });

  it('renders JSON', () => {
    const parsed = JSON.parse(renderJson(doc('export const x: number = 1;')));
    expect(parsed[0]).toMatchObject({ name: 'x', kind: 'const' });
  });
});
