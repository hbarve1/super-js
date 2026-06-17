import { describe, it, expect } from 'vitest';
import { transform } from '@superjs/compiler';
import { translateDts } from '../index.js';

/** Translate, asserting the emitted .d.sjs parses + checks without errors. */
async function tr(dts: string) {
  const r = translateDts(dts);
  const checked = await transform(r.code, 'out.d.sjs');
  expect(checked.diagnostics.filter((d) => d.severity === 'error'), r.code).toEqual([]);
  return r;
}

describe('translateDts — type aliases', () => {
  it('maps primitives', async () => {
    expect((await tr('type N = number;')).code.trim()).toBe('type N = number;');
    expect((await tr('type S = string;')).code.trim()).toBe('type S = string;');
  });
  it('maps arrays and tuples', async () => {
    expect((await tr('type A = number[];')).code).toContain('type A = number[];');
    expect((await tr('type T = [number, string];')).code).toContain('[number, string]');
  });
  it('maps unions including null', async () => {
    expect((await tr('type U = number | string;')).code).toContain('number | string');
    expect((await tr('type N = number | null;')).code).toContain('number | null');
  });
  it('maps generics and nested generics', async () => {
    expect((await tr('type M = Map<string, number[]>;')).code).toContain('Map<string, number[]>');
    expect((await tr('type N = Array<Map<string, number>>;')).code).toContain('Array<Map<string, number>>');
  });
  it('maps function types', async () => {
    expect((await tr('type F = (a: number, b: string) => boolean;')).code).toContain('(a: number, b: string) => boolean');
  });
  it('maps object type literals with optional + readonly + index signatures', async () => {
    const r = await tr('type O = { readonly x: number; y?: string; [k: string]: number };');
    expect(r.code).toContain('readonly x: number');
    expect(r.code).toContain('y?: string');
    expect(r.code).toContain('[k: string]: number');
  });
});

describe('translateDts — interfaces', () => {
  it('translates an interface to a structural object-type alias', async () => {
    const r = await tr('interface Point { x: number; y: number; }');
    expect(r.code).toContain('type Point = {');
    expect(r.code).toContain('x: number');
  });
  it('carries type parameters', async () => {
    const r = await tr('interface Box<T> { value: T; }');
    expect(r.code).toContain('type Box<T> = {');
    expect(r.code).toContain('value: T');
  });
  it('maps a method signature to a function-typed property', async () => {
    const r = await tr('interface Repo<T> { find(id: string): T | null; }');
    expect(r.code).toContain('find: (id: string) => T | null');
  });
});

describe('translateDts — unsupported forms degrade to dynamic', () => {
  it('maps `any` to dynamic and reports it', async () => {
    const r = await tr('type A = any;');
    expect(r.code).toContain('dynamic');
    expect(r.unsupported.join('\n')).toMatch(/any.*dynamic/);
  });
  it('reports a dropped type-parameter constraint', async () => {
    const r = await tr('type C<T extends object> = T[];');
    expect(r.unsupported.some((u) => u.includes('constraint'))).toBe(true);
    expect(r.code).toContain('type C<T> = T[];');
  });
});

describe('translateDts — intersection auto-merge', () => {
  it('merges two object-type literals into one object type', async () => {
    const r = await tr('type I = { a: number } & { b: string };');
    expect(r.code).toContain('a: number');
    expect(r.code).toContain('b: string');
    expect(r.code).not.toContain('dynamic');
    expect(r.unsupported).toEqual([]);
  });
  it('merges three branches', async () => {
    const r = await tr('type I = { a: number } & { b: string } & { c: boolean };');
    expect(r.code).toContain('a: number');
    expect(r.code).toContain('c: boolean');
    expect(r.code).not.toContain('dynamic');
  });
  it('falls back to dynamic on a property-name conflict', async () => {
    const r = await tr('type I = { a: number } & { a: string };');
    expect(r.code).toContain('dynamic');
    expect(r.unsupported.some((u) => u.includes('intersection-not-mergeable'))).toBe(true);
  });
  it('falls back to dynamic when a branch is a named type (not a literal)', async () => {
    const r = await tr('type I = Foo & { b: string };');
    expect(r.code).toContain('dynamic');
    expect(r.unsupported.some((u) => u.includes('intersection-not-mergeable'))).toBe(true);
  });
});

describe('translateDts — enums become sum types', () => {
  it('maps a numeric enum to a sum type of its member names', async () => {
    const r = await tr('enum Color { Red, Green, Blue }');
    expect(r.code.trim()).toBe('type Color = Red | Green | Blue;');
  });
  it('maps a string enum to a sum type (values dropped — runtime data)', async () => {
    const r = await tr('enum Dir { Up = "UP", Down = "DOWN" }');
    expect(r.code.trim()).toBe('type Dir = Up | Down;');
  });
  it('reports a single-member enum instead of emitting a broken sum type', () => {
    const r = translateDts('enum Solo { Only }');
    expect(r.code.trim()).toBe('');
    expect(r.unsupported.some((u) => u.includes('Solo') && u.includes('≥ 2'))).toBe(true);
  });
});

describe('translateDts — untranslated top-level decls are reported, never dropped', () => {
  it('reports a top-level function declaration', () => {
    const r = translateDts('export declare function greet(name: string): string;');
    expect(r.unsupported.some((u) => u.includes('greet') && u.includes('function'))).toBe(true);
  });
  it('reports a class declaration', () => {
    const r = translateDts('export declare class Widget { id: string; }');
    expect(r.unsupported.some((u) => u.includes('Widget') && u.includes('class'))).toBe(true);
  });
  it('reports a namespace declaration', () => {
    const r = translateDts('declare namespace NS { type X = number; }');
    expect(r.unsupported.some((u) => u.includes('NS'))).toBe(true);
  });
  it('reports a top-level variable declaration', () => {
    const r = translateDts('export declare const VERSION: string;');
    expect(r.unsupported.some((u) => u.includes('VERSION') && u.includes('variable'))).toBe(true);
  });
  it('does not report bare imports (no type surface lost)', () => {
    const r = translateDts('import { Foo } from "./foo";\ntype Bar = number;');
    expect(r.code).toContain('type Bar = number;');
    expect(r.unsupported).toEqual([]);
  });
});

describe('translateDts — multiple declarations', () => {
  it('translates a small .d.ts module', async () => {
    const r = await tr([
      'type Id = string;',
      'interface User { id: Id; name: string; age?: number; }',
      'type Lookup = (id: Id) => User | null;',
    ].join('\n'));
    expect(r.code).toContain('type Id = string;');
    expect(r.code).toContain('type User = {');
    expect(r.code).toContain('(id: Id) => User | null');
  });
});
