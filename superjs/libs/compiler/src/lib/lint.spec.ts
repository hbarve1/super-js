import { describe, it, expect } from 'vitest';
import { lint } from '../index.js';

const codes = (src: string): string[] => lint(src).map((d) => d.code);

describe('lint — SJS-L001 prefer-const', () => {
  it('flags a let that is never reassigned', () => {
    expect(codes('let x = 1;')).toContain('SJS-L001');
  });
  it('does not flag a let that is reassigned', () => {
    expect(codes('let x = 1;\nx = 2;')).not.toContain('SJS-L001');
  });
  it('does not flag a let reassigned via ++', () => {
    expect(codes('let x = 1;\nx++;')).not.toContain('SJS-L001');
  });
  it('does not flag a let reassigned through destructuring', () => {
    expect(codes('let x = 1;\n[x] = [2];')).not.toContain('SJS-L001');
  });
  it('does not flag const', () => {
    expect(codes('const x = 1;')).not.toContain('SJS-L001');
  });
  it('includes the binding name in the message', () => {
    const d = lint('let total = 0;').find((x) => x.code === 'SJS-L001');
    expect(d?.message).toContain('total');
  });
});

describe('lint — other rules', () => {
  it('L002 flags var', () => {
    expect(codes('var x = 1;')).toContain('SJS-L002');
  });
  it('L003 flags == and !=', () => {
    expect(codes('const b = 1 == 2;')).toContain('SJS-L003');
    expect(codes('const b = 1 != 2;')).toContain('SJS-L003');
    expect(codes('const b = 1 === 2;')).not.toContain('SJS-L003');
  });
  it('L004 flags for…in', () => {
    expect(codes('for (const k in obj) { f(k); }')).toContain('SJS-L004');
  });
  it('L005 flags debugger', () => {
    expect(codes('debugger;')).toContain('SJS-L005');
  });
});

describe('lint — output shape', () => {
  it('findings are warnings sorted by position', () => {
    const ds = lint('debugger;\nvar y = 1;');
    expect(ds.every((d) => d.severity === 'warning')).toBe(true);
    expect(ds[0]!.span.start.offset).toBeLessThanOrEqual(ds[1]!.span.start.offset);
  });
  it('clean code produces no findings', () => {
    expect(lint('const x: number = 1;\nfor (const v of xs) { use(v); }')).toEqual([]);
  });
});
