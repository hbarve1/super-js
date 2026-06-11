/**
 * Semantic type constructors, singletons, display, and structural helpers.
 *
 * The checker works exclusively with the {@link Type} model from
 * `@superjs/types` (sjs-type.ts). `NullableType` (`T?`) is treated as sugar for
 * `T | null` per specs/language/001-null-safety.md — {@link members} expands it.
 */

import type {
  Type,
  LiteralType,
  ArrayType,
  FunctionType,
  ObjectType,
  PropertySignature,
  SumType,
  SumVariantType,
} from '@superjs/types';

// ── Primitive singletons ──────────────────────────────────────────────────────
export const NUMBER: Type = { kind: 'number' };
export const STRING: Type = { kind: 'string' };
export const BOOLEAN: Type = { kind: 'boolean' };
export const BIGINT: Type = { kind: 'bigint' };
export const SYMBOL: Type = { kind: 'symbol' };
export const NULL: Type = { kind: 'null' };
export const UNDEFINED: Type = { kind: 'undefined' };
export const VOID: Type = { kind: 'void' };
export const NEVER: Type = { kind: 'never' };
export const UNKNOWN: Type = { kind: 'unknown' };
export const OBJECT_KEYWORD: Type = { kind: 'object-keyword' };
export const DYNAMIC: Type = { kind: 'dynamic' };

export function literal(
  value: string | number | boolean | bigint,
  base: LiteralType['base'],
): LiteralType {
  return { kind: 'literal', value, base };
}

export function arrayOf(element: Type, readonly = false): ArrayType {
  return { kind: 'array', element, readonly };
}

export function nullable(inner: Type): Type {
  if (inner.kind === 'nullable') return inner;
  if (inner.kind === 'dynamic' || inner.kind === 'unknown') return inner;
  return { kind: 'nullable', inner };
}

// ── Union / nullable expansion ────────────────────────────────────────────────

/** Flattened union/nullable members (never returns a union or nullable). */
export function members(t: Type): Type[] {
  if (t.kind === 'union') return t.types.flatMap(members);
  if (t.kind === 'nullable') return [...members(t.inner), NULL];
  return [t];
}

/** Build a union from members: flatten, dedup, simplify. */
export function union(types: readonly Type[]): Type {
  const flat = types.flatMap(members);
  if (flat.some((t) => t.kind === 'dynamic')) return DYNAMIC;
  const out: Type[] = [];
  for (const t of flat) {
    if (t.kind === 'never') continue;
    if (!out.some((u) => same(u, t))) out.push(t);
  }
  if (out.length === 0) return NEVER;
  if (out.length === 1) return out[0]!;
  return { kind: 'union', types: out };
}

export function containsNullish(t: Type): boolean {
  return members(t).some((m) => m.kind === 'null' || m.kind === 'undefined');
}

export function containsNull(t: Type): boolean {
  return members(t).some((m) => m.kind === 'null');
}

/** Drop `null` and `undefined` members (the result of a null-narrowing guard). */
export function stripNullish(t: Type): Type {
  return union(members(t).filter((m) => m.kind !== 'null' && m.kind !== 'undefined'));
}

/** Widen literal types to their base primitive (the `let` rule). */
export function widen(t: Type): Type {
  switch (t.kind) {
    case 'literal':
      switch (t.base) {
        case 'string': return STRING;
        case 'number': return NUMBER;
        case 'boolean': return BOOLEAN;
        case 'bigint': return BIGINT;
      }
      return t;
    case 'nullable':
      return nullable(widen(t.inner));
    case 'union':
      return union(t.types.map(widen));
    default:
      return t;
  }
}

// ── Structural identity (shallow but recursive for composites) ─────────────────
export function same(a: Type, b: Type): boolean {
  if (a === b) return true;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'literal':
      return a.value === (b as LiteralType).value;
    case 'nullable':
      return same(a.inner, (b as typeof a).inner);
    case 'array':
      return same(a.element, (b as ArrayType).element);
    case 'type-ref':
    case 'type-param':
      return a.name === (b as typeof a).name;
    case 'sum':
      return a.name === (b as SumType).name;
    case 'sum-variant': {
      const v = b as SumVariantType;
      return a.owner === v.owner && a.tag === v.tag;
    }
    case 'object': {
      const o = b as ObjectType;
      if (a.name && o.name) return a.name === o.name;
      return a.properties.length === o.properties.length &&
        a.properties.every((p) => {
          const q = o.properties.find((x) => x.name === p.name);
          return q && same(p.type, q.type);
        });
    }
    case 'union': {
      const u = b as typeof a;
      const am = members(a), bm = members(u);
      return am.length === bm.length && am.every((x) => bm.some((y) => same(x, y)));
    }
    default:
      return true; // nullary primitive kinds
  }
}

// ── Display (for diagnostic messages) ─────────────────────────────────────────
export function display(t: Type): string {
  switch (t.kind) {
    case 'number': case 'string': case 'boolean': case 'bigint':
    case 'symbol': case 'null': case 'undefined': case 'void':
    case 'never': case 'unknown': case 'dynamic':
      return t.kind;
    case 'object-keyword':
      return 'object';
    case 'literal':
      return t.base === 'string' ? JSON.stringify(t.value) : String(t.value);
    case 'nullable':
      return `${displayInner(t.inner)}?`;
    case 'array':
      return `${displayInner(t.element)}[]`;
    case 'tuple':
      return `[${t.elements.map(display).join(', ')}]`;
    case 'function':
      return `(${t.params.map((p) => `${p.name}: ${display(p.type)}`).join(', ')}) => ${display(t.returnType)}`;
    case 'object':
      return t.name ?? `{ ${t.properties.map(displayProp).join('; ')} }`;
    case 'union':
      return t.types.map(display).join(' | ');
    case 'sum':
      return t.name;
    case 'sum-variant':
      return `${t.owner}.${t.tag}`;
    case 'type-ref':
      return t.typeArgs?.length ? `${t.name}<${t.typeArgs.map(display).join(', ')}>` : t.name;
    case 'type-param':
      return t.name;
    case 'promise':
      return `Promise<${display(t.value)}>`;
    case 'generator':
      return `Generator<${display(t.yield)}, ${display(t.return)}>`;
  }
}

function displayProp(p: PropertySignature): string {
  return `${p.readonly ? 'readonly ' : ''}${p.name}${p.optional ? '?' : ''}: ${display(p.type)}`;
}

function displayInner(t: Type): string {
  // Parenthesise unions/functions inside `?`/`[]` for readability.
  return t.kind === 'union' || t.kind === 'function' || t.kind === 'nullable'
    ? `(${display(t)})`
    : display(t);
}

export function isLiteralAssignableBase(lit: LiteralType, base: Type): boolean {
  return base.kind === lit.base;
}

export type { Type, FunctionType, ObjectType, SumType, SumVariantType };
