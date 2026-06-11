/**
 * Resolve syntactic {@link TypeNode} annotations into semantic {@link Type}s.
 *
 * Named references resolve against a {@link TypeResolver} (the checker's type
 * table). Generic instantiation substitutes type arguments. Unknown names
 * resolve to `dynamic` — SJS has no bundled stdlib type surface yet, so library
 * references (DOM, node) must not produce spurious errors.
 */

import type {
  TypeNode,
  Type,
  PropertySignature,
  ParamType,
  ObjectType,
  IndexSignatureType,
  InterfaceProperty,
  InterfaceMethod,
  IndexSignature,
} from '@superjs/types';
import { NUMBER, STRING, BOOLEAN, BIGINT, SYMBOL, NULL, UNDEFINED, VOID, NEVER, UNKNOWN, OBJECT_KEYWORD, DYNAMIC, nullable, union } from './model.js';

/** Named-type lookup + in-scope generic parameters. */
export interface TypeResolver {
  /** Resolve a named type (sum/alias/class/interface). */
  lookupNamedType(name: string): Type | undefined;
  /** True if `name` is an in-scope generic type parameter. */
  isTypeParam(name: string): boolean;
}

export function resolveType(node: TypeNode, r: TypeResolver): Type {
  switch (node.kind) {
    case 'PrimitiveTypeNode':
      return primitive(node.name);
    case 'NullableTypeNode':
      return nullable(resolveType(node.inner, r));
    case 'ParenthesizedTypeNode':
      return resolveType(node.inner, r);
    case 'ArrayTypeNode':
      return { kind: 'array', element: resolveType(node.element, r), readonly: false };
    case 'TupleTypeNode':
      return { kind: 'tuple', elements: node.elements.map((e) => resolveType(e, r)) };
    case 'UnionTypeNode':
      return union(node.types.map((t) => resolveType(t, r)));
    case 'FunctionTypeNode':
      return {
        kind: 'function',
        async: false,
        params: node.params.map((p): ParamType => ({
          name: p.name.name,
          type: resolveType(p.type, r),
          optional: p.optional,
          rest: p.rest,
        })),
        returnType: resolveType(node.returnType, r),
      };
    case 'ObjectTypeNode':
      return objectType(node.members, r);
    case 'TypeRefNode':
      return resolveRef(node.name, node.typeArgs, r);
  }
}

function primitive(name: string): Type {
  switch (name) {
    case 'number': return NUMBER;
    case 'string': return STRING;
    case 'boolean': return BOOLEAN;
    case 'bigint': return BIGINT;
    case 'symbol': return SYMBOL;
    case 'null': return NULL;
    case 'undefined': return UNDEFINED;
    case 'void': return VOID;
    case 'never': return NEVER;
    case 'unknown': return UNKNOWN;
    case 'object': return OBJECT_KEYWORD;
    case 'dynamic': return DYNAMIC;
    default: return DYNAMIC;
  }
}

function resolveRef(
  path: readonly string[],
  typeArgs: readonly TypeNode[] | undefined,
  r: TypeResolver,
): Type {
  const name = path[path.length - 1]!;
  const args = typeArgs?.map((a) => resolveType(a, r));

  // Built-in generic containers.
  if (path.length === 1) {
    if (name === 'Array' || name === 'ReadonlyArray') {
      return { kind: 'array', element: args?.[0] ?? DYNAMIC, readonly: name === 'ReadonlyArray' };
    }
    if (name === 'Promise') return { kind: 'promise', value: args?.[0] ?? DYNAMIC };
    if (r.isTypeParam(name)) return { kind: 'type-param', name };
    const named = r.lookupNamedType(name);
    if (named) return instantiate(named, args);
  }
  // Dotted / unknown names: be lenient (no stdlib type surface).
  return DYNAMIC;
}

/** Substitute generic args into a named sum/object type by position. */
function instantiate(base: Type, args: readonly Type[] | undefined): Type {
  if (!args || args.length === 0) return base;
  const params = base.kind === 'sum' || base.kind === 'object' ? base.typeParams : undefined;
  if (!params || params.length === 0) return base;
  const map = new Map<string, Type>();
  params.forEach((p, i) => map.set(p, args[i] ?? DYNAMIC));
  return substitute(base, map);
}

export function substitute(t: Type, map: ReadonlyMap<string, Type>): Type {
  switch (t.kind) {
    case 'type-param':
      return map.get(t.name) ?? t;
    case 'nullable':
      return nullable(substitute(t.inner, map));
    case 'array':
      return { kind: 'array', element: substitute(t.element, map), readonly: t.readonly };
    case 'tuple':
      return { kind: 'tuple', elements: t.elements.map((e) => substitute(e, map)) };
    case 'union':
      return union(t.types.map((u) => substitute(u, map)));
    case 'function':
      return {
        ...t,
        params: t.params.map((p) => ({ ...p, type: substitute(p.type, map) })),
        returnType: substitute(t.returnType, map),
      };
    case 'object':
      return {
        ...t,
        properties: t.properties.map((p) => ({ ...p, type: substitute(p.type, map) })),
      };
    case 'sum':
      return {
        ...t,
        variants: t.variants.map((v) => ({
          ...v,
          fields: v.fields.map((f) => ({ ...f, type: substitute(f.type, map) })),
        })),
      };
    case 'sum-variant':
      return { ...t, fields: t.fields.map((f) => ({ ...f, type: substitute(f.type, map) })) };
    case 'promise':
      return { kind: 'promise', value: substitute(t.value, map) };
    default:
      return t;
  }
}

function objectType(
  memberNodes: readonly (InterfaceProperty | InterfaceMethod | IndexSignature)[],
  r: TypeResolver,
): ObjectType {
  const properties: PropertySignature[] = [];
  let indexSignature: IndexSignatureType | undefined;
  for (const m of memberNodes) {
    if (m.kind === 'InterfaceProperty') {
      properties.push({
        name: propName(m.name),
        type: resolveType(m.type, r),
        optional: m.optional,
        readonly: m.readonly,
      });
    } else if (m.kind === 'InterfaceMethod') {
      properties.push({
        name: propName(m.name),
        type: {
          kind: 'function',
          async: false,
          params: m.params.map((p): ParamType => ({
            name: paramName(p),
            type: p.typeAnnotation ? resolveType(p.typeAnnotation, r) : DYNAMIC,
            optional: p.optional,
            rest: p.rest,
          })),
          returnType: resolveType(m.returnType, r),
        },
        optional: false,
        readonly: false,
      });
    } else {
      const kt = m.keyType.kind === 'PrimitiveTypeNode' ? m.keyType.name : 'string';
      indexSignature = {
        keyType: kt === 'number' ? 'number' : kt === 'symbol' ? 'symbol' : 'string',
        valueType: resolveType(m.valueType, r),
      };
    }
  }
  return indexSignature
    ? { kind: 'object', properties, indexSignature }
    : { kind: 'object', properties };
}

function propName(key: { kind: string; name?: string; value?: string | number }): string {
  if ('name' in key && typeof key.name === 'string') return key.name;
  if ('value' in key && key.value !== undefined) return String(key.value);
  return '<computed>';
}

function paramName(p: { pattern: { kind: string; name?: string } }): string {
  return p.pattern.kind === 'Identifier' && p.pattern.name ? p.pattern.name : '_';
}
