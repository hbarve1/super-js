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
  it('L006 flags an empty match', () => {
    expect(codes('const r = match s {};')).toContain('SJS-L006');
  });
  it('L006 does not flag a match with arms', () => {
    expect(codes('const r = match s { Active => 1, Inactive => 2 };')).not.toContain('SJS-L006');
  });
  it('L007 flags a duplicated match variant', () => {
    const ds = lint('const r = match s { Active => 1, Active => 2 };');
    const dup = ds.find((d) => d.code === 'SJS-L007');
    expect(dup).toBeDefined();
    expect(dup!.message).toContain('Active');
  });
  it('L007 does not flag distinct variants', () => {
    expect(codes('const r = match s { Active => 1, Inactive => 2 };')).not.toContain('SJS-L007');
  });
  it('L008 flags an anonymous function-expression callback', () => {
    expect(codes('xs.map(function (x) { return x; });')).toContain('SJS-L008');
  });
  it('L008 does not flag an arrow callback', () => {
    expect(codes('xs.map((x) => x);')).not.toContain('SJS-L008');
  });
  it('L008 does not flag a named function expression', () => {
    expect(codes('xs.map(function keep(x) { return x; });')).not.toContain('SJS-L008');
  });
  it('L009 flags an unused named import', () => {
    const ds = lint('import { foo } from "./m";');
    const u = ds.find((d) => d.code === 'SJS-L009');
    expect(u).toBeDefined();
    expect(u!.message).toContain('foo');
  });
  it('L009 does not flag an import used in value position', () => {
    expect(codes('import { foo } from "./m";\nfoo();')).not.toContain('SJS-L009');
  });
  it('L009 does not flag an import used only in type position', () => {
    expect(codes('import { Foo } from "./m";\nconst x: Foo = bar;')).not.toContain('SJS-L009');
  });
  it('L009 does not flag a namespace import used via member access', () => {
    expect(codes('import * as ns from "./m";\nns.run();')).not.toContain('SJS-L009');
  });
  it('L009 flags an aliased import by its local name', () => {
    const ds = lint('import { foo as bar } from "./m";');
    expect(ds.find((d) => d.code === 'SJS-L009')!.message).toContain('bar');
  });
  it('L010 flags imports not sorted by source', () => {
    const ds = lint('import { b } from "b";\nimport { a } from "a";\nb(); a();');
    expect(ds.find((d) => d.code === 'SJS-L010')!.message).toContain('`a`');
  });
  it('L010 does not flag sorted imports', () => {
    expect(codes('import { a } from "a";\nimport { b } from "b";\na(); b();')).not.toContain('SJS-L010');
  });
  it('L010 resets the order check across a non-import statement', () => {
    expect(codes('import { b } from "b";\nb();\nimport { a } from "a";\na();')).not.toContain('SJS-L010');
  });
  it('L012 flags an unused top-level const', () => {
    const ds = lint('const unusedThing: number = 1;');
    const u = ds.find((d) => d.code === 'SJS-L012');
    expect(u).toBeDefined();
    expect(u!.message).toContain('unusedThing');
  });
  it('L012 flags an unused function and class', () => {
    expect(codes('function helper(): void {}')).toContain('SJS-L012');
    expect(codes('class Widget {}')).toContain('SJS-L012');
  });
  it('L012 does not flag a referenced binding', () => {
    expect(codes('const x: number = 1;\nuse(x);')).not.toContain('SJS-L012');
    expect(codes('function f(): void {}\nf();')).not.toContain('SJS-L012');
  });
  it('L012 does not flag an exported binding', () => {
    expect(codes('export const api: number = 1;')).not.toContain('SJS-L012');
    expect(codes('export function pub(): void {}')).not.toContain('SJS-L012');
  });
  it('L012 does not flag a binding used only in a re-export', () => {
    expect(codes('const x: number = 1;\nexport { x };')).not.toContain('SJS-L012');
  });
  it('L013 flags an explicit dynamic annotation', () => {
    expect(codes('export const x: dynamic = load();')).toContain('SJS-L013');
  });
  it('L013 is silenced by @sjs:dynamic-ok on the same line', () => {
    expect(codes('export const x: dynamic = load(); // @sjs:dynamic-ok')).not.toContain('SJS-L013');
  });
  it('L013 is silenced by @sjs:dynamic-ok on the line above', () => {
    expect(codes('// @sjs:dynamic-ok\nexport const x: dynamic = load();')).not.toContain('SJS-L013');
  });
  it('L013 does not flag a precise annotation', () => {
    expect(codes('export const x: number = 1;')).not.toContain('SJS-L013');
  });
  it('L014 flags an inner binding shadowing an outer one', () => {
    const ds = lint('export const v: number = 1;\nexport function f(): number { const v: number = 2; return v; }');
    const s = ds.find((d) => d.code === 'SJS-L014');
    expect(s).toBeDefined();
    expect(s!.message).toContain('v');
  });
  it('L014 flags a parameter shadowing an outer binding', () => {
    expect(codes('export const p: number = 1;\nexport function f(p: number): number { return p; }')).toContain('SJS-L014');
  });
  it('L014 does not flag the same name in sibling scopes', () => {
    expect(codes('export function a(x: number): number { return x; }\nexport function b(x: number): number { return x; }'))
      .not.toContain('SJS-L014');
  });
  it('L015 flags a floating promise (unawaited call as a statement)', () => {
    const src = 'export async function f(): Promise<number> { return 1; }\n'
      + 'export async function g(): Promise<void> { f(); }';
    expect(codes(src)).toContain('SJS-L015');
  });
  it('L015 does not flag an awaited promise', () => {
    const src = 'export async function f(): Promise<number> { return 1; }\n'
      + 'export async function g(): Promise<void> { await f(); }';
    expect(codes(src)).not.toContain('SJS-L015');
  });
  it('L015 does not flag a non-promise call statement', () => {
    const src = 'export function h(): number { return 1; }\n'
      + 'export function k(): void { h(); }';
    expect(codes(src)).not.toContain('SJS-L015');
  });
  it('L016 flags an unhandled Result used as a statement', () => {
    const src = 'type Result<T, E> = Ok(T) | Err(E);\n'
      + 'export function f(): Result<number, string> { return Ok(1); }\n'
      + 'export function g(): void { f(); }';
    expect(codes(src)).toContain('SJS-L016');
  });
  it('L016 does not flag a returned Result', () => {
    const src = 'type Result<T, E> = Ok(T) | Err(E);\n'
      + 'export function f(): Result<number, string> { return Ok(1); }\n'
      + 'export function g(): Result<number, string> { return f(); }';
    expect(codes(src)).not.toContain('SJS-L016');
  });
  it('L002 carries a var→let auto-fix', () => {
    const d = lint('var x = 1;\nx;').find((x) => x.code === 'SJS-L002')!;
    expect(d.fixes?.[0]?.edits[0]?.newText).toBe('let');
    expect(d.fixes![0]!.edits[0]!.span.start.offset).toBe(0);
  });
  it('L005 carries a remove-debugger auto-fix', () => {
    const d = lint('debugger;').find((x) => x.code === 'SJS-L005')!;
    expect(d.fixes?.[0]?.edits[0]?.newText).toBe('');
  });
});

describe('lint — output shape', () => {
  it('findings are warnings sorted by position', () => {
    const ds = lint('debugger;\nvar y = 1;');
    expect(ds.every((d) => d.severity === 'warning')).toBe(true);
    expect(ds[0]!.span.start.offset).toBeLessThanOrEqual(ds[1]!.span.start.offset);
  });
  it('clean code produces no findings', () => {
    expect(lint('const x: number = 1;\nuse(x);\nfor (const v of xs) { use(v); }')).toEqual([]);
  });
});
