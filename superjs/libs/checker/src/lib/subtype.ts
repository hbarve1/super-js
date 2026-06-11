/**
 * Assignability (`source <: target`) per specs/language type rules.
 *
 *   - `dynamic` is the gradual escape hatch: assignable to/from anything (ADR-001).
 *   - `unknown` is the top type: everything is assignable TO it, nothing flows
 *     out without narrowing.
 *   - `never` is the bottom type: assignable to everything.
 *   - Objects/interfaces are structural (ADR-002); sum types & classes nominal.
 *   - `T?` ≡ `T | null` (ADR-006), handled via {@link members} expansion.
 */

import type { Type, ObjectType, FunctionType, LiteralType, SumType, SumVariantType } from '@superjs/types';
import { members, same } from './model.js';

export function isAssignable(source: Type, target: Type): boolean {
  if (source === target) return true;

  // Gradual + top/bottom shortcuts.
  if (source.kind === 'dynamic' || target.kind === 'dynamic') return true;
  if (source.kind === 'never') return true;
  if (target.kind === 'unknown') return true;

  // Union/nullable on the source: every member must flow to the target.
  if (source.kind === 'union' || source.kind === 'nullable') {
    return members(source).every((m) => isAssignable(m, target));
  }
  // Union/nullable on the target: source must flow to some member.
  if (target.kind === 'union' || target.kind === 'nullable') {
    return members(target).some((m) => isAssignable(source, m));
  }

  if (same(source, target)) return true;

  switch (target.kind) {
    case 'number': case 'string': case 'boolean': case 'bigint': case 'symbol':
      // A literal is assignable to its base primitive.
      return source.kind === 'literal' && source.base === target.kind;
    case 'object-keyword':
      // Any non-primitive value.
      return isNonPrimitive(source);
    case 'literal':
      return source.kind === 'literal' && source.value === target.value;
    case 'array':
      return source.kind === 'array' && isAssignable(source.element, target.element);
    case 'tuple':
      return source.kind === 'tuple'
        && source.elements.length === target.elements.length
        && source.elements.every((e, i) => isAssignable(e, target.elements[i]!));
    case 'function':
      return source.kind === 'function' && functionAssignable(source, target);
    case 'object':
      return objectAssignable(source, target);
    case 'sum':
      return sumAssignable(source, target);
    case 'sum-variant':
      return source.kind === 'sum-variant'
        && source.owner === target.owner && source.tag === target.tag;
    case 'promise':
      return source.kind === 'promise' && isAssignable(source.value, target.value);
    case 'generator':
      return source.kind === 'generator'
        && isAssignable(source.yield, target.yield)
        && isAssignable(source.return, target.return);
    case 'type-ref':
    case 'type-param':
      return (source.kind === 'type-ref' || source.kind === 'type-param')
        && source.name === target.name;
    default:
      return false;
  }
}

function isNonPrimitive(t: Type): boolean {
  switch (t.kind) {
    case 'object': case 'array': case 'tuple': case 'function':
    case 'sum': case 'sum-variant': case 'promise': case 'generator':
      return true;
    default:
      return false;
  }
}

/** Params are contravariant, return covariant; fewer source params is ok. */
function functionAssignable(s: FunctionType, t: FunctionType): boolean {
  if (s.params.length > t.params.length) {
    // Extra required source params can't be satisfied.
    const extra = s.params.slice(t.params.length);
    if (extra.some((p) => !p.optional && !p.rest)) return false;
  }
  for (let i = 0; i < t.params.length; i++) {
    const sp = s.params[i];
    if (!sp) break;
    if (!isAssignable(t.params[i]!.type, sp.type)) return false;
  }
  return isAssignable(s.returnType, t.returnType);
}

/** Structural width+depth subtyping. Every target property present & compatible. */
function objectAssignable(source: Type, target: ObjectType): boolean {
  if (source.kind !== 'object') return false;
  // Nominal classes match by name only.
  if (target.nominal || source.nominal) {
    if (target.nominal && source.nominal) return source.name === target.name;
    if (target.nominal) return source.name === target.name;
  }
  for (const tp of target.properties) {
    const sp = source.properties.find((p) => p.name === tp.name);
    if (!sp) {
      if (tp.optional) continue;
      return false;
    }
    if (!isAssignable(sp.type, tp.type)) return false;
  }
  return true;
}

function sumAssignable(source: Type, target: SumType): boolean {
  if (source.kind === 'sum') return source.name === target.name;
  if (source.kind === 'sum-variant') return source.owner === target.name;
  return false;
}

export type { LiteralType, SumVariantType };
