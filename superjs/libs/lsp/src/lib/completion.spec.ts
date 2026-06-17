import { describe, it, expect } from 'vitest';
import { completions } from './completion.js';

describe('completions', () => {
  it('proposes local declarations with completion kinds', () => {
    const items = completions('function f(): void {}\nconst k: number = 1;');
    expect(items.find((i) => i.label === 'f')).toEqual({ label: 'f', kind: 3 });   // Function
    expect(items.find((i) => i.label === 'k')).toEqual({ label: 'k', kind: 21 });  // Constant
  });

  it('lists local declarations before keywords', () => {
    const items = completions('const local: number = 1;');
    const localIdx = items.findIndex((i) => i.label === 'local');
    const constIdx = items.findIndex((i) => i.label === 'const');
    expect(localIdx).toBeGreaterThanOrEqual(0);
    expect(localIdx).toBeLessThan(constIdx);
  });

  it('includes primitive types and keywords', () => {
    const labels = completions('').map((i) => i.label);
    expect(labels).toContain('number');
    expect(labels).toContain('match');
    expect(labels).toContain('export');
  });

  it('deduplicates a declaration name that collides with a primitive spelling', () => {
    // `number` declared as a const must not also appear as a primitive entry.
    const number = completions('const number: number = 1;').filter((i) => i.label === 'number');
    expect(number).toHaveLength(1);
    expect(number[0]!.kind).toBe(21); // Constant — the declaration wins (added first)
  });
});
