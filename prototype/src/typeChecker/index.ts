/**
 * Super.js Type Checker
 *
 * Algorithm: bidirectional type checking with gradual typing.
 *   - Synthesis (infer): derive a Type from an expression bottom-up.
 *   - Checking (check): verify an expression against an expected Type top-down.
 *   - Consistency (~): the gradual relation; `any` is consistent with every type.
 *
 * Every rule is cross-referenced to its authoritative specification section.
 * All ECMAScript anchors resolve at: https://tc39.es/ecma262/
 *
 * See: specs/001-superjs-core-language/type-system.md
 */

import type { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import type {
  Type, PrototypeDiagnostic, TypeEnvironment,
  AnyType, NumberType, StringType, BooleanType,
  NullType, UndefinedType, VoidType,
  UnionType, FunctionType, SumType,
  ObjectType, ArrayType, TupleType, TypeParamType,
  PromiseType, IteratorType,
} from './types'

// ── Singleton primitive types ─────────────────────────────────────────────────

const T_ANY:       AnyType       = { kind: 'any' }
const T_NUMBER:    NumberType    = { kind: 'number' }
const T_STRING:    StringType    = { kind: 'string' }
const T_BOOLEAN:   BooleanType   = { kind: 'boolean' }
const T_NULL:      NullType      = { kind: 'null' }
const T_UNDEFINED: UndefinedType = { kind: 'undefined' }
const T_VOID:      VoidType      = { kind: 'void' }
const T_BIGINT:    Type          = { kind: 'bigint' }
const T_SYMBOL:    Type          = { kind: 'symbol' }
const T_NEVER:     Type          = { kind: 'never' }

// ── Spec URLs ─────────────────────────────────────────────────────────────────

const SPEC = {
  LANGUAGE_TYPES: 'https://tc39.es/ecma262/#sec-ecmascript-language-types',
  LET_CONST:      'https://tc39.es/ecma262/#sec-let-and-const-declarations',
  FUNCTION_DEF:   'https://tc39.es/ecma262/#sec-function-definitions',
  BIGINT_MIXING:  'https://tc39.es/ecma262/#sec-numeric-types-bigint-add',
  ASYNC_AWAIT:    'https://tc39.es/ecma262/#sec-async-function-definitions',
  PROMISE:        'https://tc39.es/ecma262/#sec-promise-objects',
  WEAKREF:        'https://tc39.es/ecma262/#sec-weak-ref-objects',
} as const

// ── Generic type instantiation ────────────────────────────────────────────────

/**
 * Substitutes type parameters in `type` using `bindings`.
 * E.g. instantiate(TypeParam('T'), {T: number}) → number
 */
function instantiate(type: Type, bindings: Map<string, Type>): Type {
  if (bindings.size === 0) return type

  switch (type.kind) {
    case 'typeParam': {
      const resolved = bindings.get((type as TypeParamType).name)
      return resolved ?? type
    }
    case 'array':
      return { kind: 'array', elementType: instantiate((type as ArrayType).elementType, bindings) }
    case 'tuple':
      return { kind: 'tuple', elements: (type as TupleType).elements.map(e => instantiate(e, bindings)) }
    case 'promise':
      return { kind: 'promise', resolvedType: instantiate((type as PromiseType).resolvedType, bindings) }
    case 'union':
      return { kind: 'union', types: (type as UnionType).types.map(t2 => instantiate(t2, bindings)) }
    case 'function': {
      const fn = type as FunctionType
      return {
        kind: 'function',
        params: fn.params.map(p => ({ ...p, type: instantiate(p.type, bindings) })),
        returnType: instantiate(fn.returnType, bindings),
        typeParams: fn.typeParams,
        async: fn.async,
      }
    }
    case 'object': {
      const obj = type as ObjectType
      const props = new Map<string, Type>()
      for (const [k, v] of obj.properties) {
        props.set(k, instantiate(v, bindings))
      }
      return { kind: 'object', properties: props }
    }
    default:
      return type
  }
}

// ── Build stdlib type environment ─────────────────────────────────────────────

function T_OBJ(props: Record<string, Type>): ObjectType {
  return { kind: 'object', properties: new Map(Object.entries(props)) }
}

function T_FN(
  params: Array<{ name: string; type: Type; optional?: boolean }>,
  returnType: Type,
  opts?: { typeParams?: string[]; async?: boolean }
): FunctionType {
  return {
    kind: 'function',
    params: params.map(p => ({ name: p.name, type: p.type, optional: p.optional ?? false })),
    returnType,
    typeParams: opts?.typeParams,
    async: opts?.async,
  }
}

function T_PROMISE(inner: Type): PromiseType {
  return { kind: 'promise', resolvedType: inner }
}

function T_ARRAY(elem: Type): ArrayType {
  return { kind: 'array', elementType: elem }
}

function T_UNION(...types: Type[]): UnionType {
  return { kind: 'union', types }
}

const T_PARAM = (name: string): TypeParamType => ({ kind: 'typeParam', name })

/**
 * Build the global standard library type environment.
 * ECMAScript spec: https://tc39.es/ecma262/#sec-global-object
 */
function buildStdlibEnv(): TypeEnvironment {
  const stdlib = new Map<string, Type>()

  // ── Promise — ECMA-262 §27.2 ─────────────────────────────────────────────
  const T_T = T_PARAM('T')
  const withResolversReturn = T_OBJ({
    promise: T_PROMISE(T_T),
    resolve: T_FN([{ name: 'value', type: T_T }], T_VOID),
    reject: T_FN([{ name: 'reason', type: T_ANY }], T_VOID),
  })
  stdlib.set('Promise', T_OBJ({
    resolve: T_FN([{ name: 'value', type: T_ANY }], T_PROMISE(T_ANY)),
    reject: T_FN([{ name: 'reason', type: T_ANY }], T_PROMISE(T_NEVER)),
    all: T_FN([{ name: 'values', type: T_ARRAY(T_PROMISE(T_ANY)) }], T_PROMISE(T_ARRAY(T_ANY)), { typeParams: ['T'] }),
    allSettled: T_FN([{ name: 'values', type: T_ARRAY(T_PROMISE(T_ANY)) }], T_PROMISE(T_ARRAY(T_ANY))),
    race: T_FN([{ name: 'values', type: T_ARRAY(T_PROMISE(T_ANY)) }], T_PROMISE(T_ANY)),
    any: T_FN([{ name: 'values', type: T_ARRAY(T_PROMISE(T_ANY)) }], T_PROMISE(T_ANY)),
    withResolvers: T_FN([], withResolversReturn, { typeParams: ['T'] }),  // ES2024
    try: T_FN([{ name: 'fn', type: T_FN([], T_ANY) }], T_PROMISE(T_ANY), { typeParams: ['T'] }),  // ES2025
  }))

  // ── Array instance prototype (for getPropType lookups) ───────────────────
  stdlib.set('_ArrayInstance', T_OBJ({
    length: T_NUMBER,
    push: T_FN([{ name: 'item', type: T_T }], T_NUMBER),
    pop: T_FN([], T_UNION(T_T, T_UNDEFINED)),
    shift: T_FN([], T_UNION(T_T, T_UNDEFINED)),
    unshift: T_FN([{ name: 'item', type: T_T }], T_NUMBER),
    slice: T_FN([{ name: 'start', type: T_NUMBER, optional: true }, { name: 'end', type: T_NUMBER, optional: true }], T_ARRAY(T_T)),
    indexOf: T_FN([{ name: 'searchElement', type: T_T }], T_NUMBER),
    includes: T_FN([{ name: 'searchElement', type: T_T }], T_BOOLEAN),
    find: T_FN([{ name: 'predicate', type: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN) }], T_UNION(T_T, T_UNDEFINED)),
    findIndex: T_FN([{ name: 'predicate', type: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN) }], T_NUMBER),
    filter: T_FN([{ name: 'predicate', type: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN) }], T_ARRAY(T_T)),
    map: T_FN([{ name: 'callbackfn', type: T_FN([{ name: 'value', type: T_T }], T_ANY) }], T_ARRAY(T_ANY), { typeParams: ['U'] }),
    reduce: T_FN([{ name: 'callbackfn', type: T_FN([{ name: 'acc', type: T_ANY }, { name: 'curr', type: T_T }], T_ANY) }], T_ANY),
    forEach: T_FN([{ name: 'callbackfn', type: T_FN([{ name: 'value', type: T_T }], T_VOID) }], T_VOID),
    some: T_FN([{ name: 'predicate', type: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN) }], T_BOOLEAN),
    every: T_FN([{ name: 'predicate', type: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN) }], T_BOOLEAN),
    join: T_FN([{ name: 'separator', type: T_STRING, optional: true }], T_STRING),
    reverse: T_FN([], T_ARRAY(T_T)),
    sort: T_FN([{ name: 'compareFn', type: T_FN([{ name: 'a', type: T_T }, { name: 'b', type: T_T }], T_NUMBER), optional: true }], T_ARRAY(T_T)),
    flat: T_FN([{ name: 'depth', type: T_NUMBER, optional: true }], T_ARRAY(T_ANY)),
    flatMap: T_FN([{ name: 'callbackfn', type: T_FN([{ name: 'value', type: T_T }], T_ANY) }], T_ARRAY(T_ANY)),
    // ES2022: at() returns T | undefined
    at: T_FN([{ name: 'index', type: T_NUMBER }], T_UNION(T_T, T_UNDEFINED)),
    concat: T_FN([{ name: 'items', type: T_ARRAY(T_T), optional: true }], T_ARRAY(T_T)),
    fill: T_FN([{ name: 'value', type: T_T }], T_ARRAY(T_T)),
    keys: T_FN([], { kind: 'iterator', yieldType: T_NUMBER, returnType: T_UNDEFINED, nextType: T_ANY } as IteratorType),
    values: T_FN([], { kind: 'iterator', yieldType: T_T, returnType: T_UNDEFINED, nextType: T_ANY } as IteratorType),
    findLast: T_FN([{ name: 'predicate', type: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN) }], T_UNION(T_T, T_UNDEFINED)),
    findLastIndex: T_FN([{ name: 'predicate', type: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN) }], T_NUMBER),
    toReversed: T_FN([], T_ARRAY(T_T)),
    toSorted: T_FN([{ name: 'compareFn', type: T_FN([{ name: 'a', type: T_T }, { name: 'b', type: T_T }], T_NUMBER), optional: true }], T_ARRAY(T_T)),
    with: T_FN([{ name: 'index', type: T_NUMBER }, { name: 'value', type: T_T }], T_ARRAY(T_T)),
  }))

  stdlib.set('Array', T_OBJ({
    from: T_FN([{ name: 'arrayLike', type: T_ANY }], T_ARRAY(T_ANY), { typeParams: ['T'] }),
    isArray: T_FN([{ name: 'arg', type: T_ANY }], T_BOOLEAN),
    of: T_FN([{ name: 'items', type: T_ANY }], T_ARRAY(T_ANY)),
  }))

  // ── Map — ECMA-262 §24.1 + ES2024 Map.groupBy ────────────────────────────
  const T_K = T_PARAM('K')
  const T_V = T_PARAM('V')
  const mapInstanceProps = T_OBJ({
    get: T_FN([{ name: 'key', type: T_K }], T_UNION(T_V, T_UNDEFINED)),
    set: T_FN([{ name: 'key', type: T_K }, { name: 'value', type: T_V }], T_ANY),
    has: T_FN([{ name: 'key', type: T_K }], T_BOOLEAN),
    delete: T_FN([{ name: 'key', type: T_K }], T_BOOLEAN),
    clear: T_FN([], T_VOID),
    size: T_NUMBER,
    forEach: T_FN([{ name: 'callbackfn', type: T_FN([{ name: 'value', type: T_V }, { name: 'key', type: T_K }], T_VOID) }], T_VOID),
    keys: T_FN([], { kind: 'iterator', yieldType: T_K, returnType: T_UNDEFINED, nextType: T_ANY } as IteratorType),
    values: T_FN([], { kind: 'iterator', yieldType: T_V, returnType: T_UNDEFINED, nextType: T_ANY } as IteratorType),
    entries: T_FN([], { kind: 'iterator', yieldType: { kind: 'tuple', elements: [T_K, T_V] } as TupleType, returnType: T_UNDEFINED, nextType: T_ANY } as IteratorType),
  })
  stdlib.set('_MapInstance', mapInstanceProps)
  stdlib.set('Map', T_OBJ({
    groupBy: T_FN(  // ES2024
      [{ name: 'items', type: { kind: 'iterable', elementType: T_T } }, { name: 'keyFn', type: T_FN([{ name: 'item', type: T_T }], T_K) }],
      mapInstanceProps,
      { typeParams: ['K', 'T'] }
    ),
  }))

  // ── Object — ECMA-262 §20.1 + ES2024 Object.groupBy ─────────────────────
  stdlib.set('Object', T_OBJ({
    keys: T_FN([{ name: 'o', type: T_ANY }], T_ARRAY(T_STRING)),
    values: T_FN([{ name: 'o', type: T_ANY }], T_ARRAY(T_ANY)),
    entries: T_FN([{ name: 'o', type: T_ANY }], T_ARRAY({ kind: 'tuple', elements: [T_STRING, T_ANY] } as TupleType)),
    assign: T_FN([{ name: 'target', type: T_ANY }, { name: 'source', type: T_ANY }], T_ANY),
    freeze: T_FN([{ name: 'o', type: T_ANY }], T_ANY),
    create: T_FN([{ name: 'proto', type: T_UNION(T_ANY, T_NULL) }], T_ANY),
    defineProperty: T_FN([{ name: 'o', type: T_ANY }, { name: 'p', type: T_STRING }, { name: 'attrs', type: T_ANY }], T_ANY),
    getPrototypeOf: T_FN([{ name: 'o', type: T_ANY }], T_ANY),
    hasOwn: T_FN([{ name: 'obj', type: T_ANY }, { name: 'key', type: T_STRING }], T_BOOLEAN),
    fromEntries: T_FN([{ name: 'entries', type: T_ANY }], T_ANY),
    groupBy: T_FN(  // ES2024
      [{ name: 'items', type: { kind: 'iterable', elementType: T_T } }, { name: 'keyFn', type: T_FN([{ name: 'item', type: T_T }], T_STRING) }],
      T_ANY,
      { typeParams: ['T'] }
    ),
  }))

  // ── Set — ECMA-262 §24.2 + ES2025 Set methods ────────────────────────────
  stdlib.set('_SetInstance', T_OBJ({
    add: T_FN([{ name: 'value', type: T_T }], T_ANY),
    has: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN),
    delete: T_FN([{ name: 'value', type: T_T }], T_BOOLEAN),
    clear: T_FN([], T_VOID),
    size: T_NUMBER,
    forEach: T_FN([{ name: 'callbackfn', type: T_FN([{ name: 'value', type: T_T }], T_VOID) }], T_VOID),
    values: T_FN([], { kind: 'iterator', yieldType: T_T, returnType: T_UNDEFINED, nextType: T_ANY } as IteratorType),
    // ES2025 Set methods
    union: T_FN([{ name: 'other', type: T_ANY }], T_ANY, { typeParams: ['T'] }),
    intersection: T_FN([{ name: 'other', type: T_ANY }], T_ANY, { typeParams: ['T'] }),
    difference: T_FN([{ name: 'other', type: T_ANY }], T_ANY, { typeParams: ['T'] }),
    symmetricDifference: T_FN([{ name: 'other', type: T_ANY }], T_ANY, { typeParams: ['T'] }),
    isSubsetOf: T_FN([{ name: 'other', type: T_ANY }], T_BOOLEAN),
    isSupersetOf: T_FN([{ name: 'other', type: T_ANY }], T_BOOLEAN),
    isDisjointFrom: T_FN([{ name: 'other', type: T_ANY }], T_BOOLEAN),
  }))

  // ── WeakRef<T> — ES2021 ECMA-262 §26.1 ──────────────────────────────────
  stdlib.set('WeakRef', T_OBJ({
    new: T_FN([{ name: 'target', type: T_T }], T_OBJ({
      deref: T_FN([], T_UNION(T_T, T_UNDEFINED)),
    }), { typeParams: ['T'] }),
  }))

  // ── FinalizationRegistry<T> — ES2021 ECMA-262 §26.2 ─────────────────────
  stdlib.set('FinalizationRegistry', T_OBJ({
    new: T_FN(
      [{ name: 'callback', type: T_FN([{ name: 'heldValue', type: T_T }], T_VOID) }],
      T_OBJ({
        register: T_FN([{ name: 'target', type: T_ANY }, { name: 'heldValue', type: T_T }, { name: 'token', type: T_ANY, optional: true }], T_VOID),
        unregister: T_FN([{ name: 'token', type: T_ANY }], T_BOOLEAN),
      }),
      { typeParams: ['T'] }
    ),
  }))

  // ── Error — ECMA-262 §20.5 + ES2022 cause + ES2025 isError ─────────────
  stdlib.set('Error', T_OBJ({
    new: T_FN([
      { name: 'message', type: T_STRING, optional: true },
      { name: 'options', type: T_OBJ({ cause: T_ANY }), optional: true },
    ], T_OBJ({
      message: T_STRING,
      name: T_STRING,
      stack: T_UNION(T_STRING, T_UNDEFINED),
      cause: T_ANY,
    })),
    isError: T_FN([{ name: 'value', type: T_ANY }], T_BOOLEAN),  // ES2025
  }))

  // ── Math — ECMA-262 §21.3 + ES2025 Math.sumPrecise ───────────────────
  stdlib.set('Math', T_OBJ({
    abs: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    ceil: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    floor: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    round: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    max: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    min: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    pow: T_FN([{ name: 'x', type: T_NUMBER }, { name: 'y', type: T_NUMBER }], T_NUMBER),
    sqrt: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    log: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    random: T_FN([], T_NUMBER),
    trunc: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    sign: T_FN([{ name: 'x', type: T_NUMBER }], T_NUMBER),
    sumPrecise: T_FN([{ name: 'values', type: { kind: 'iterable', elementType: T_NUMBER } }], T_NUMBER),  // ES2025
  }))

  // ── Symbol — ECMA-262 §20.4 ─────────────────────────────────────────────
  stdlib.set('Symbol', T_OBJ({
    iterator: T_SYMBOL,
    asyncIterator: T_SYMBOL,
    toPrimitive: T_SYMBOL,
    toStringTag: T_SYMBOL,
    hasInstance: T_SYMBOL,
    for: T_FN([{ name: 'key', type: T_STRING }], T_SYMBOL),
    keyFor: T_FN([{ name: 'sym', type: T_SYMBOL }], T_UNION(T_STRING, T_UNDEFINED)),
  }))

  // ── Iterator<T> — ES2025 iterator helpers ─────────────────────────────────
  stdlib.set('Iterator', T_OBJ({
    from: T_FN([{ name: 'iterable', type: { kind: 'iterable', elementType: T_T } }],
      { kind: 'iterator', yieldType: T_T, returnType: T_ANY, nextType: T_ANY } as IteratorType,
      { typeParams: ['T'] }),
  }))

  // ── SharedArrayBuffer + Atomics — ES2017 ──────────────────────────────────
  stdlib.set('SharedArrayBuffer', T_OBJ({
    new: T_FN([{ name: 'length', type: T_NUMBER }], T_OBJ({ byteLength: T_NUMBER })),
  }))
  stdlib.set('Atomics', T_OBJ({
    add: T_FN([{ name: 'typedArray', type: T_ANY }, { name: 'index', type: T_NUMBER }, { name: 'value', type: T_NUMBER }], T_NUMBER),
    load: T_FN([{ name: 'typedArray', type: T_ANY }, { name: 'index', type: T_NUMBER }], T_NUMBER),
    store: T_FN([{ name: 'typedArray', type: T_ANY }, { name: 'index', type: T_NUMBER }, { name: 'value', type: T_NUMBER }], T_NUMBER),
    wait: T_FN([{ name: 'typedArray', type: T_ANY }, { name: 'index', type: T_NUMBER }, { name: 'value', type: T_NUMBER }], T_STRING),
    notify: T_FN([{ name: 'typedArray', type: T_ANY }, { name: 'index', type: T_NUMBER }], T_NUMBER),
  }))

  // ── Float16Array — ES2025 ──────────────────────────────────────────────────
  stdlib.set('Float16Array', T_OBJ({
    new: T_FN([{ name: 'length', type: T_NUMBER }], T_OBJ({ length: T_NUMBER, byteLength: T_NUMBER, BYTES_PER_ELEMENT: T_NUMBER })),
    BYTES_PER_ELEMENT: T_NUMBER,
  }))

  // ── Common built-ins ──────────────────────────────────────────────────────
  stdlib.set('Number', T_OBJ({
    isFinite: T_FN([{ name: 'value', type: T_ANY }], T_BOOLEAN),
    isInteger: T_FN([{ name: 'value', type: T_ANY }], T_BOOLEAN),
    isNaN: T_FN([{ name: 'value', type: T_ANY }], T_BOOLEAN),
    isSafeInteger: T_FN([{ name: 'value', type: T_ANY }], T_BOOLEAN),
    parseFloat: T_FN([{ name: 'string', type: T_STRING }], T_NUMBER),
    parseInt: T_FN([{ name: 'string', type: T_STRING }, { name: 'radix', type: T_NUMBER, optional: true }], T_NUMBER),
    MAX_SAFE_INTEGER: T_NUMBER,
    MIN_SAFE_INTEGER: T_NUMBER,
    NaN: T_NUMBER,
  }))
  stdlib.set('JSON', T_OBJ({
    parse: T_FN([{ name: 'text', type: T_STRING }], T_ANY),
    stringify: T_FN([{ name: 'value', type: T_ANY }], T_UNION(T_STRING, T_UNDEFINED)),
  }))
  stdlib.set('console', T_OBJ({
    log: T_FN([{ name: 'data', type: T_ANY }], T_VOID),
    error: T_FN([{ name: 'data', type: T_ANY }], T_VOID),
    warn: T_FN([{ name: 'data', type: T_ANY }], T_VOID),
    info: T_FN([{ name: 'data', type: T_ANY }], T_VOID),
  }))

  return stdlib
}

// ── Resolve: TSType node → Type ───────────────────────────────────────────────

/**
 * Converts a Babel TSType AST node to our internal Type representation.
 */
function resolveType(node: t.TSType | null | undefined): Type {
  if (!node) return T_ANY

  switch (node.type) {
    case 'TSNumberKeyword':    return T_NUMBER
    case 'TSStringKeyword':    return T_STRING
    case 'TSBooleanKeyword':   return T_BOOLEAN
    case 'TSUndefinedKeyword': return T_UNDEFINED
    case 'TSNullKeyword':      return T_NULL
    case 'TSVoidKeyword':      return T_VOID
    case 'TSAnyKeyword':       return T_ANY
    case 'TSNeverKeyword':     return T_NEVER
    case 'TSSymbolKeyword':    return T_SYMBOL
    case 'TSBigIntKeyword':    return T_BIGINT
    case 'TSObjectKeyword':    return { kind: 'object', properties: new Map() }
    case 'TSUnknownKeyword':   return T_ANY

    case 'TSUnionType': {
      const types = node.types.map(resolveType)
      return { kind: 'union', types } satisfies UnionType
    }

    case 'TSIntersectionType': {
      const types = node.types.map(resolveType)
      return { kind: 'intersection', types }
    }

    case 'TSArrayType':
      return { kind: 'array', elementType: resolveType(node.elementType) }

    case 'TSTupleType': {
      const elements = node.elementTypes.map(el => {
        if (el.type === 'TSNamedTupleMember') return resolveType(el.elementType)
        return resolveType(el as t.TSType)
      })
      return { kind: 'tuple', elements }
    }

    case 'TSFunctionType': {
      const params = node.parameters.map(p => ({
        name: t.isIdentifier(p) ? p.name : '_',
        type: resolveType(
          t.isIdentifier(p) && p.typeAnnotation
            ? (p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation
            : null
        ),
        optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
      }))
      const returnType = node.typeAnnotation
        ? resolveType(node.typeAnnotation.typeAnnotation)
        : T_ANY
      return { kind: 'function', params, returnType } satisfies FunctionType
    }

    case 'TSTypeReference': {
      const nameNode = node.typeName
      const name = t.isIdentifier(nameNode) ? nameNode.name : null
      if (!name) return T_ANY

      const typeArgs = node.typeParameters?.params ?? []
      const args = typeArgs.map(resolveType)

      switch (name) {
        case 'Promise':
          return { kind: 'promise', resolvedType: args[0] ?? T_ANY }
        case 'Array':
        case 'ReadonlyArray':
          return { kind: 'array', elementType: args[0] ?? T_ANY }
        case 'Map': {
          const mapTypeProps = new Map<string, Type>([
            ['get', T_FN([{ name: 'key', type: args[0] ?? T_ANY }], T_UNION(args[1] ?? T_ANY, T_UNDEFINED))],
            ['set', T_FN([{ name: 'key', type: args[0] ?? T_ANY }, { name: 'value', type: args[1] ?? T_ANY }], T_ANY)],
            ['has', T_FN([{ name: 'key', type: args[0] ?? T_ANY }], T_BOOLEAN)],
            ['delete', T_FN([{ name: 'key', type: args[0] ?? T_ANY }], T_BOOLEAN)],
            ['size', T_NUMBER],
          ])
          return { kind: 'object', properties: mapTypeProps }
        }
        case 'Set': {
          const setTypeProps = new Map<string, Type>([
            ['add', T_FN([{ name: 'value', type: args[0] ?? T_ANY }], T_ANY)],
            ['has', T_FN([{ name: 'value', type: args[0] ?? T_ANY }], T_BOOLEAN)],
            ['delete', T_FN([{ name: 'value', type: args[0] ?? T_ANY }], T_BOOLEAN)],
            ['size', T_NUMBER],
            ['union', T_FN([{ name: 'other', type: T_ANY }], T_ANY)],
            ['intersection', T_FN([{ name: 'other', type: T_ANY }], T_ANY)],
            ['difference', T_FN([{ name: 'other', type: T_ANY }], T_ANY)],
            ['symmetricDifference', T_FN([{ name: 'other', type: T_ANY }], T_ANY)],
            ['isSubsetOf', T_FN([{ name: 'other', type: T_ANY }], T_BOOLEAN)],
            ['isSupersetOf', T_FN([{ name: 'other', type: T_ANY }], T_BOOLEAN)],
            ['isDisjointFrom', T_FN([{ name: 'other', type: T_ANY }], T_BOOLEAN)],
          ])
          return { kind: 'object', properties: setTypeProps }
        }
        case 'WeakMap':
          return { kind: 'object', properties: new Map([
            ['get', T_FN([{ name: 'key', type: args[0] ?? T_ANY }], T_UNION(args[1] ?? T_ANY, T_UNDEFINED))],
            ['set', T_FN([{ name: 'key', type: args[0] ?? T_ANY }, { name: 'value', type: args[1] ?? T_ANY }], T_ANY)],
            ['has', T_FN([{ name: 'key', type: args[0] ?? T_ANY }], T_BOOLEAN)],
          ]) }
        case 'WeakSet':
          return { kind: 'object', properties: new Map([
            ['add', T_FN([{ name: 'value', type: args[0] ?? T_ANY }], T_ANY)],
            ['has', T_FN([{ name: 'value', type: args[0] ?? T_ANY }], T_BOOLEAN)],
            ['delete', T_FN([{ name: 'value', type: args[0] ?? T_ANY }], T_BOOLEAN)],
          ]) }
        case 'WeakRef':
          return { kind: 'object', properties: new Map([
            ['deref', T_FN([], T_UNION(args[0] ?? T_ANY, T_UNDEFINED))],
          ]) }
        case 'FinalizationRegistry':
          return { kind: 'object', properties: new Map([
            ['register', T_FN([{ name: 'target', type: T_ANY }, { name: 'heldValue', type: args[0] ?? T_ANY }, { name: 'token', type: T_ANY, optional: true }], T_VOID)],
            ['unregister', T_FN([{ name: 'token', type: T_ANY }], T_BOOLEAN)],
          ]) }
        case 'Generator':
          return { kind: 'generator', yieldType: args[0] ?? T_ANY, returnType: args[1] ?? T_ANY, nextType: args[2] ?? T_ANY }
        case 'AsyncGenerator':
          return { kind: 'asyncGenerator', yieldType: args[0] ?? T_ANY, returnType: args[1] ?? T_ANY, nextType: args[2] ?? T_ANY }
        case 'Iterator':
        case 'IterableIterator':
          return { kind: 'iterator', yieldType: args[0] ?? T_ANY, returnType: args[1] ?? T_ANY, nextType: args[2] ?? T_ANY }
        case 'Iterable':
          return { kind: 'iterable', elementType: args[0] ?? T_ANY }
        case 'AsyncIterator':
          return { kind: 'asyncIterator', yieldType: args[0] ?? T_ANY, returnType: args[1] ?? T_ANY, nextType: args[2] ?? T_ANY }
        case 'AsyncIterable':
          return { kind: 'asyncIterable', elementType: args[0] ?? T_ANY }
        case 'Awaited':
          if (args[0]?.kind === 'promise') return (args[0] as PromiseType).resolvedType
          return args[0] ?? T_ANY
        case 'ReturnType':
          if (args[0]?.kind === 'function') return (args[0] as FunctionType).returnType
          return T_ANY
        case 'Partial':
        case 'Required':
        case 'Readonly':
        case 'NonNullable':
          return args[0] ?? T_ANY
        case 'Omit':
        case 'Pick':
        case 'Record':
          return args[0] ?? T_ANY
        default:
          // Single uppercase letter → type parameter
          if (/^[A-Z]$/.test(name)) return { kind: 'typeParam', name } satisfies TypeParamType
          return T_ANY
      }
    }

    case 'TSParenthesizedType':
      return resolveType(node.typeAnnotation)

    case 'TSTypeLiteral': {
      const properties = new Map<string, Type>()
      for (const member of node.members) {
        if (t.isTSPropertySignature(member) && t.isIdentifier(member.key)) {
          const propType = member.typeAnnotation
            ? resolveType(member.typeAnnotation.typeAnnotation)
            : T_ANY
          properties.set(member.key.name, propType)
        }
        if (t.isTSMethodSignature(member) && t.isIdentifier(member.key)) {
          const params = (member.parameters ?? []).map(p => ({
            name: t.isIdentifier(p) ? p.name : '_',
            type: t.isIdentifier(p) && p.typeAnnotation
              ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
              : T_ANY,
            optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
          }))
          const returnType = member.typeAnnotation
            ? resolveType(member.typeAnnotation.typeAnnotation)
            : T_ANY
          properties.set(member.key.name, { kind: 'function', params, returnType })
        }
      }
      return { kind: 'object', properties }
    }

    default:
      return T_ANY
  }
}

// ── Infer: Expression → Type ──────────────────────────────────────────────────

function inferExprType(node: t.Expression | null | undefined, env: TypeEnvironment): Type {
  if (!node) return T_ANY

  switch (node.type) {
    case 'StringLiteral':
    case 'TemplateLiteral':
      return T_STRING

    case 'NumericLiteral':
      return T_NUMBER

    case 'BigIntLiteral':
      return T_BIGINT

    case 'BooleanLiteral':
      return T_BOOLEAN

    case 'NullLiteral':
      return T_NULL

    case 'Identifier': {
      if (node.name === 'undefined') return T_UNDEFINED
      return env.get(node.name) ?? T_ANY
    }

    // Arrow function — ECMA-262 §15.3
    case 'ArrowFunctionExpression': {
      const returnAnnotation = node.returnType
        ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
        : null
      const params = node.params.map(p => ({
        name: t.isIdentifier(p) ? p.name : '_',
        type: t.isIdentifier(p) && p.typeAnnotation
          ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
          : T_ANY,
        optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
      }))
      const rawReturn = resolveType(returnAnnotation)
      // Async arrow: wrap non-Promise return in Promise
      const returnType = node.async && rawReturn.kind !== 'promise' && rawReturn.kind !== 'any' && rawReturn.kind !== 'void'
        ? { kind: 'promise' as const, resolvedType: rawReturn }
        : rawReturn
      return { kind: 'function', params, returnType, async: node.async ?? false }
    }

    // Function expression
    case 'FunctionExpression': {
      const returnAnnotation = node.returnType
        ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
        : null
      const params = node.params.map(p => ({
        name: t.isIdentifier(p) ? p.name : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) ? p.left.name : '_'),
        type: t.isIdentifier(p) && p.typeAnnotation
          ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
          : T_ANY,
        optional: t.isIdentifier(p) ? (p.optional ?? false) : t.isAssignmentPattern(p),
      }))
      const rawReturn = resolveType(returnAnnotation)
      const returnType = node.async && rawReturn.kind !== 'promise' && rawReturn.kind !== 'any' && rawReturn.kind !== 'void'
        ? { kind: 'promise' as const, resolvedType: rawReturn }
        : rawReturn
      return { kind: 'function', params, returnType, async: node.async ?? false }
    }

    // await — ECMA-262 §15.10: unwrap Promise<T> → T
    case 'AwaitExpression': {
      const argType = inferExprType(node.argument, env)
      if (argType.kind === 'promise') return (argType as PromiseType).resolvedType
      return T_ANY
    }

    // new — ECMA-262 §13.3.2
    case 'NewExpression': {
      if (!t.isIdentifier(node.callee)) return T_ANY
      const ctorName = node.callee.name
      const ctorType = env.get(ctorName)
      if (ctorType?.kind === 'object') {
        const newMethod = (ctorType as ObjectType).properties.get('new')
        if (newMethod?.kind === 'function') return (newMethod as FunctionType).returnType
      }
      switch (ctorName) {
        case 'Error': case 'TypeError': case 'RangeError': case 'ReferenceError': case 'SyntaxError': {
          const errProps = new Map<string, Type>([
            ['message', T_STRING], ['name', T_STRING],
            ['stack', T_UNION(T_STRING, T_UNDEFINED)], ['cause', T_ANY],
          ])
          return { kind: 'object', properties: errProps }
        }
        case 'Promise': return { kind: 'promise', resolvedType: T_ANY }
        case 'Map': {
          const mapProps = new Map<string, Type>([
            ['get', T_FN([{ name: 'key', type: T_ANY }], T_ANY)],
            ['set', T_FN([{ name: 'key', type: T_ANY }, { name: 'value', type: T_ANY }], T_ANY)],
            ['has', T_FN([{ name: 'key', type: T_ANY }], T_BOOLEAN)],
            ['size', T_NUMBER],
          ])
          return { kind: 'object', properties: mapProps }
        }
        case 'Set': {
          const setProps = new Map<string, Type>([
            ['add', T_FN([{ name: 'value', type: T_ANY }], T_ANY)],
            ['has', T_FN([{ name: 'value', type: T_ANY }], T_BOOLEAN)],
            ['size', T_NUMBER],
          ])
          return { kind: 'object', properties: setProps }
        }
        case 'WeakRef': {
          const targetArg = node.arguments[0]
          const targetType = targetArg && t.isExpression(targetArg) ? inferExprType(targetArg, env) : T_ANY
          return { kind: 'object', properties: new Map([['deref', T_FN([], T_UNION(targetType, T_UNDEFINED))]]) }
        }
        case 'FinalizationRegistry':
          return { kind: 'object', properties: new Map([
            ['register', T_FN([{ name: 'target', type: T_ANY }, { name: 'heldValue', type: T_ANY }], T_VOID)],
            ['unregister', T_FN([{ name: 'token', type: T_ANY }], T_BOOLEAN)],
          ]) }
        default: return T_ANY
      }
    }

    // Object expression — with spread merging — ECMA-262 §13.2.5
    case 'ObjectExpression': {
      const properties = new Map<string, Type>()
      for (const prop of node.properties) {
        if (t.isObjectProperty(prop)) {
          const keyName = t.isIdentifier(prop.key) ? prop.key.name
            : t.isStringLiteral(prop.key) ? prop.key.value : null
          if (keyName && t.isExpression(prop.value)) {
            properties.set(keyName, inferExprType(prop.value as t.Expression, env))
          }
        } else if (t.isSpreadElement(prop) && t.isExpression(prop.argument)) {
          // Spread merge — later properties override earlier ones
          const spreadType = inferExprType(prop.argument as t.Expression, env)
          if (spreadType.kind === 'object') {
            for (const [k, v] of (spreadType as ObjectType).properties) {
              properties.set(k, v)
            }
          }
        }
      }
      return { kind: 'object', properties }
    }

    // Array expression — ECMA-262 §13.2.4
    case 'ArrayExpression': {
      if (node.elements.length === 0) return { kind: 'array', elementType: T_ANY }
      const elemTypes: Type[] = []
      for (const el of node.elements) {
        if (el && t.isExpression(el)) elemTypes.push(inferExprType(el, env))
      }
      const unique = dedupeKinds(elemTypes)
      const elemType = unique.length === 1 ? unique[0] : { kind: 'union' as const, types: unique }
      return { kind: 'array', elementType: elemType }
    }

    // Member expression — ECMA-262 §13.3.3
    case 'MemberExpression': {
      if (node.computed) return T_ANY
      const objType = inferExprType(node.object as t.Expression, env)
      if (!t.isIdentifier(node.property)) return T_ANY
      return getPropType(objType, node.property.name, env)
    }

    // Call expression — return type of callee
    case 'CallExpression': {
      if (t.isMemberExpression(node.callee) && !node.callee.computed) {
        const objType = inferExprType(node.callee.object as t.Expression, env)
        if (!t.isIdentifier(node.callee.property)) return T_ANY
        const methodType = getPropType(objType, node.callee.property.name, env)
        if (methodType.kind === 'function') return (methodType as FunctionType).returnType
      }
      if (t.isIdentifier(node.callee)) {
        const calleeType = env.get(node.callee.name)
        if (calleeType?.kind === 'function') return (calleeType as FunctionType).returnType
      }
      return T_ANY
    }

    // Binary expression — ECMA-262 §13.12
    case 'BinaryExpression': {
      const op = node.operator
      if (op === 'instanceof' || op === 'in' || ['===','!==','==','!=','<','>','<=','>='].includes(op)) return T_BOOLEAN
      const leftType = inferExprType(node.left as t.Expression, env)
      if (op === '+' && leftType.kind === 'string') return T_STRING
      return leftType.kind === 'bigint' ? T_BIGINT : T_NUMBER
    }

    // Logical expression
    case 'LogicalExpression': {
      const lt = inferExprType(node.left, env)
      const rt = inferExprType(node.right, env)
      return { kind: 'union', types: [lt, rt] }
    }

    // Unary expression
    case 'UnaryExpression': {
      if (node.operator === 'typeof') return T_STRING
      if (node.operator === '!') return T_BOOLEAN
      if (node.operator === 'void') return T_UNDEFINED
      if (node.operator === '-' || node.operator === '+') {
        const argType = inferExprType(node.argument, env)
        return argType.kind === 'bigint' ? T_BIGINT : T_NUMBER
      }
      return T_ANY
    }

    // Conditional expression
    case 'ConditionalExpression': {
      const cType = inferExprType(node.consequent, env)
      const aType = inferExprType(node.alternate, env)
      return { kind: 'union', types: [cType, aType] }
    }

    case 'AssignmentExpression':
      return inferExprType(node.right, env)

    case 'SequenceExpression':
      return inferExprType(node.expressions[node.expressions.length - 1], env)

    case 'TSAsExpression':
      return resolveType((node as t.TSAsExpression).typeAnnotation)

    case 'TSTypeAssertion':
      return resolveType((node as t.TSTypeAssertion).typeAnnotation)

    case 'TSNonNullExpression':
      return inferExprType((node as t.TSNonNullExpression).expression, env)

    default:
      return T_ANY
  }
}

// ── Helper: property access on a type ────────────────────────────────────────

function getPropType(objType: Type, propName: string, env: TypeEnvironment): Type {
  switch (objType.kind) {
    case 'object':
      return (objType as ObjectType).properties.get(propName) ?? T_ANY
    case 'array': {
      const arrayInstance = env.get('_ArrayInstance')
      if (arrayInstance?.kind === 'object') {
        const prop = (arrayInstance as ObjectType).properties.get(propName)
        if (prop) {
          const bindings = new Map<string, Type>([['T', (objType as ArrayType).elementType]])
          return instantiate(prop, bindings)
        }
      }
      if (propName === 'length') return T_NUMBER
      if (propName === 'at') return T_FN([{ name: 'index', type: T_NUMBER }], T_UNION((objType as ArrayType).elementType, T_UNDEFINED))
      return T_ANY
    }
    case 'string': {
      const strProps: Record<string, Type> = {
        length: T_NUMBER,
        charAt: T_FN([{ name: 'pos', type: T_NUMBER }], T_STRING),
        indexOf: T_FN([{ name: 'searchString', type: T_STRING }], T_NUMBER),
        includes: T_FN([{ name: 'searchString', type: T_STRING }], T_BOOLEAN),
        startsWith: T_FN([{ name: 'searchString', type: T_STRING }], T_BOOLEAN),
        endsWith: T_FN([{ name: 'searchString', type: T_STRING }], T_BOOLEAN),
        slice: T_FN([{ name: 'start', type: T_NUMBER, optional: true }], T_STRING),
        toUpperCase: T_FN([], T_STRING),
        toLowerCase: T_FN([], T_STRING),
        trim: T_FN([], T_STRING),
        split: T_FN([{ name: 'separator', type: T_STRING }], T_ARRAY(T_STRING)),
        replace: T_FN([{ name: 'searchValue', type: T_ANY }, { name: 'replaceValue', type: T_STRING }], T_STRING),
        replaceAll: T_FN([{ name: 'searchValue', type: T_STRING }, { name: 'replaceValue', type: T_STRING }], T_STRING),
        match: T_FN([{ name: 'regexp', type: T_ANY }], T_UNION({ kind: 'object', properties: new Map([['groups', T_ANY]]) }, T_NULL)),
        matchAll: T_FN([{ name: 'regexp', type: T_ANY }], { kind: 'iterator', yieldType: T_ANY, returnType: T_ANY, nextType: T_ANY } as IteratorType),
        padStart: T_FN([{ name: 'maxLength', type: T_NUMBER }], T_STRING),
        padEnd: T_FN([{ name: 'maxLength', type: T_NUMBER }], T_STRING),
        repeat: T_FN([{ name: 'count', type: T_NUMBER }], T_STRING),
        at: T_FN([{ name: 'index', type: T_NUMBER }], T_UNION(T_STRING, T_UNDEFINED)),
      }
      return strProps[propName] ?? T_ANY
    }
    case 'promise': {
      if (propName === 'then') return T_FN([{ name: 'onfulfilled', type: T_ANY, optional: true }], T_PROMISE((objType as PromiseType).resolvedType))
      if (propName === 'catch') return T_FN([{ name: 'onrejected', type: T_ANY, optional: true }], T_PROMISE(T_ANY))
      if (propName === 'finally') return T_FN([{ name: 'onfinally', type: T_ANY, optional: true }], T_PROMISE((objType as PromiseType).resolvedType))
      return T_ANY
    }
    case 'union': {
      const memberTypes = (objType as UnionType).types
        .filter(m => m.kind !== 'null' && m.kind !== 'undefined')
        .map(m => getPropType(m, propName, env))
      if (memberTypes.length === 0) return T_ANY
      if (memberTypes.length === 1) return memberTypes[0]
      return { kind: 'union', types: memberTypes }
    }
    default:
      return T_ANY
  }
}

function dedupeKinds(types: Type[]): Type[] {
  const seen = new Set<string>()
  return types.filter(t => {
    if (seen.has(t.kind)) return false
    seen.add(t.kind)
    return true
  })
}

// ── Consistency relation — gradual typing ─────────────────────────────────────

function isConsistent(a: Type, b: Type): boolean {
  if (a.kind === 'any' || b.kind === 'any') return true
  if (a.kind === 'dynamic' || b.kind === 'dynamic') return true
  if (a.kind === 'never' || b.kind === 'never') return false
  if (a.kind === 'typeParam' || b.kind === 'typeParam') return true

  if (a.kind === b.kind) {
    if (a.kind === 'promise' && b.kind === 'promise') {
      return isConsistent((a as PromiseType).resolvedType, (b as PromiseType).resolvedType)
    }
    if (a.kind === 'array' && b.kind === 'array') {
      return isConsistent((a as ArrayType).elementType, (b as ArrayType).elementType)
    }
    return true
  }

  if (b.kind === 'union') return (b as UnionType).types.some(bt => isConsistent(a, bt))
  if (a.kind === 'union') return (a as UnionType).types.every(at => isConsistent(at, b))

  // promise ~ object (Promise has object-like interface)
  if (a.kind === 'promise' && b.kind === 'object') return true
  if (a.kind === 'object' && b.kind === 'promise') return true

  // array ~ object, tuple ~ array
  if (a.kind === 'array' && b.kind === 'object') return true
  if (a.kind === 'tuple' && b.kind === 'array') return true
  if (a.kind === 'array' && b.kind === 'tuple') return true

  // iterator kinds are compatible
  if (['generator', 'asyncGenerator', 'iterator', 'asyncIterator'].includes(a.kind) &&
      ['generator', 'asyncGenerator', 'iterator', 'asyncIterator'].includes(b.kind)) return true

  // iterable ~ array
  if (a.kind === 'iterable' && b.kind === 'array') return true
  if (a.kind === 'array' && b.kind === 'iterable') return true

  return false
}

// ── Narrowing helpers ─────────────────────────────────────────────────────────

function extractNarrowings(test: t.Expression | null | undefined, env: TypeEnvironment): Map<string, Type> {
  const n = new Map<string, Type>()
  if (!test) return n

  if (t.isBinaryExpression(test) && (test.operator === '===' || test.operator === '==')) {
    const { left, right } = test
    // typeof x === "string"
    if (t.isUnaryExpression(left) && left.operator === 'typeof' && t.isIdentifier(left.argument)) {
      if (t.isStringLiteral(right)) {
        const narrowed = typeofStringToType(right.value)
        if (narrowed) n.set(left.argument.name, narrowed)
      }
    }
    // x === null → x is null
    if (t.isIdentifier(left) && t.isNullLiteral(right)) n.set(left.name, T_NULL)
  }

  if (t.isBinaryExpression(test) && (test.operator === '!==' || test.operator === '!=')) {
    const { left, right } = test
    // x !== null → remove null from x's type
    if (t.isIdentifier(left) && t.isNullLiteral(right)) {
      const existing = env.get(left.name)
      if (existing) n.set(left.name, test.operator === '!=' ? removeNullUndef(existing) : removeNull(existing))
    }
  }

  // x instanceof Foo → x is object
  if (t.isBinaryExpression(test) && test.operator === 'instanceof' && t.isIdentifier(test.left)) {
    n.set(test.left.name, { kind: 'object', properties: new Map() })
  }

  // truthy check: if (x) → remove null/undefined
  if (t.isIdentifier(test)) {
    const existing = env.get(test.name)
    if (existing) n.set(test.name, removeNullUndef(existing))
  }

  // "prop" in x
  if (t.isBinaryExpression(test) && test.operator === 'in' && t.isIdentifier(test.right) && t.isStringLiteral(test.left)) {
    const varName = test.right.name
    const propName = test.left.value
    const existing = env.get(varName)
    if (existing?.kind === 'object') {
      const newProps = new Map((existing as ObjectType).properties)
      if (!newProps.has(propName)) newProps.set(propName, T_ANY)
      n.set(varName, { kind: 'object', properties: newProps })
    }
  }

  // a && b → combine
  if (t.isLogicalExpression(test) && test.operator === '&&') {
    for (const [k, v] of extractNarrowings(test.left, env)) n.set(k, v)
    for (const [k, v] of extractNarrowings(test.right, env)) n.set(k, v)
  }

  return n
}

function typeofStringToType(s: string): Type | null {
  switch (s) {
    case 'string':    return T_STRING
    case 'number':    return T_NUMBER
    case 'boolean':   return T_BOOLEAN
    case 'bigint':    return T_BIGINT
    case 'symbol':    return T_SYMBOL
    case 'undefined': return T_UNDEFINED
    case 'object':    return { kind: 'object', properties: new Map() }
    case 'function':  return { kind: 'function', params: [], returnType: T_ANY }
    default:          return null
  }
}

function removeNull(type: Type): Type {
  if (type.kind === 'union') {
    const filtered = (type as UnionType).types.filter(t => t.kind !== 'null')
    return filtered.length === 1 ? filtered[0] : { kind: 'union', types: filtered }
  }
  return type
}

function removeNullUndef(type: Type): Type {
  if (type.kind === 'union') {
    const filtered = (type as UnionType).types.filter(t => t.kind !== 'null' && t.kind !== 'undefined')
    return filtered.length === 1 ? filtered[0] : { kind: 'union', types: filtered }
  }
  return type
}

function negateNarrowings(_narrowings: Map<string, Type>, test: t.Expression | null | undefined, env: TypeEnvironment): Map<string, Type> {
  const n = new Map<string, Type>()
  if (!test) return n

  if (t.isBinaryExpression(test) && (test.operator === '===' || test.operator === '==')) {
    const { left, right } = test
    if (t.isUnaryExpression(left) && left.operator === 'typeof' && t.isIdentifier(left.argument)) {
      const original = env.get(left.argument.name)
      if (original) n.set(left.argument.name, original)
    }
    if (t.isIdentifier(left) && t.isNullLiteral(right)) {
      const existing = env.get(left.name)
      if (existing) n.set(left.name, removeNull(existing))
    }
  }

  if (t.isBinaryExpression(test) && (test.operator === '!==' || test.operator === '!=')) {
    const { left } = test
    if (t.isIdentifier(left)) {
      const original = env.get(left.name)
      if (original) n.set(left.name, original)
    }
  }

  return n
}

// ── TypeCheckerOptions ────────────────────────────────────────────────────────

export interface TypeCheckerOptions {
  /**
   * When true, emit SJS-W001 for every unannotated variable or parameter
   * (implicit `any`). Mirrors TypeScript's `--noImplicitAny` flag.
   *
   * https://www.typescriptlang.org/tsconfig/#noImplicitAny
   */
  strict?: boolean
}

// ── TypeChecker ───────────────────────────────────────────────────────────────

export class TypeChecker {
  private diagnostics: PrototypeDiagnostic[] = []
  private env: TypeEnvironment = new Map()
  private readonly strict: boolean
  private sumTypeRegistry: Map<string, SumType> = new Map()
  private variantTagRegistry: Map<string, string> = new Map()

  constructor(options: TypeCheckerOptions = {}) {
    this.strict = options.strict ?? false
    const stdlib = buildStdlibEnv()
    for (const [name, type] of stdlib) {
      this.env.set(name, type)
    }
  }

  getDiagnostics(): PrototypeDiagnostic[] {
    return [...this.diagnostics]
  }

  reset(): void {
    this.diagnostics = []
    this.env = new Map()
    this.sumTypeRegistry = new Map()
    this.variantTagRegistry = new Map()
    const stdlib = buildStdlibEnv()
    for (const [name, type] of stdlib) {
      this.env.set(name, type)
    }
  }

  // ── Main entry point ──────────────────────────────────────────────────────

  check(path: NodePath): void {
    const { node } = path

    switch (node.type) {
      case 'VariableDeclaration':
        this.checkVariableDeclaration(path as NodePath<t.VariableDeclaration>)
        break
      case 'FunctionDeclaration':
        this.registerFunctionDeclaration(path as NodePath<t.FunctionDeclaration>)
        break
      case 'AssignmentExpression':
        this.checkAssignment(path as NodePath<t.AssignmentExpression>)
        break
      case 'ReturnStatement':
        this.checkReturnStatement(path as NodePath<t.ReturnStatement>)
        break
      case 'ArrowFunctionExpression':
        this.checkArrowConciseReturn(path as NodePath<t.ArrowFunctionExpression>)
        break
      case 'CallExpression':
        this.checkCallExpression(path as NodePath<t.CallExpression>)
        break
      case 'TSTypeAliasDeclaration':
        this.registerSumTypeAlias(path as NodePath<t.TSTypeAliasDeclaration>)
        break
      case 'VariableDeclarator':
        this.registerVariantConstructor(path as NodePath<t.VariableDeclarator>)
        break
      case 'SwitchStatement':
        this.checkSwitchExhaustiveness(path as NodePath<t.SwitchStatement>)
        break
      case 'BinaryExpression':
        this.checkBigIntMixing(path as NodePath<t.BinaryExpression>)
        break
      case 'IfStatement':
        this.checkIfNarrowing(path as NodePath<t.IfStatement>)
        break
      case 'AwaitExpression':
        this.checkAwaitExpression(path as NodePath<t.AwaitExpression>)
        break
    }
  }

  leave(_path: NodePath): void {
    // Reserved for future scope-based cleanup
  }

  // ── Variable declarations ─────────────────────────────────────────────────

  private checkVariableDeclaration(path: NodePath<t.VariableDeclaration>): void {
    for (const decl of path.node.declarations) {
      if (t.isIdentifier(decl.id)) {
        this.checkSimpleDeclarator(decl)
      } else if (t.isObjectPattern(decl.id)) {
        this.checkObjectPatternDeclarator(decl)
      } else if (t.isArrayPattern(decl.id)) {
        this.checkArrayPatternDeclarator(decl)
      }
    }
  }

  private checkSimpleDeclarator(decl: t.VariableDeclarator): void {
    const id = decl.id as t.Identifier
    const annotation = id.typeAnnotation
    const hasAnnotation = annotation && t.isTSTypeAnnotation(annotation)
    let declared: Type = hasAnnotation ? resolveType(annotation.typeAnnotation) : T_ANY

    if (
      hasAnnotation &&
      annotation.typeAnnotation.type === 'TSTypeReference' &&
      t.isIdentifier((annotation.typeAnnotation as t.TSTypeReference).typeName)
    ) {
      const refName = ((annotation.typeAnnotation as t.TSTypeReference).typeName as t.Identifier).name
      const knownSum = this.sumTypeRegistry.get(refName)
      if (knownSum) declared = knownSum
    }

    const name = id.name

    if (this.strict && !hasAnnotation) {
      this.report({
        code: 'SJS-W001',
        severity: 'warning',
        message: `'${name}' implicitly has type 'any' because it lacks a type annotation.`,
        node: id,
        specUrl: 'https://www.typescriptlang.org/tsconfig/#noImplicitAny',
      })
    }

    if (decl.init) {
      const inferred = inferExprType(decl.init, this.env)
      if (!isConsistent(inferred, declared)) {
        this.report({
          code: 'SJS-E001',
          severity: 'error',
          message: `I cannot assign a value of type '${inferred.kind}' to a variable declared as '${declared.kind}'.`,
          node: decl.init,
          specUrl: SPEC.LET_CONST,
        })
      }
    }
    this.env.set(name, declared)
  }

  /**
   * Handle `const { x, y }: T = init` — object destructuring.
   * ECMA-262 §14.3.3 Destructuring Binding Patterns
   */
  private checkObjectPatternDeclarator(decl: t.VariableDeclarator): void {
    const pattern = decl.id as t.ObjectPattern
    const annotation = pattern.typeAnnotation
    const hasAnnotation = annotation && t.isTSTypeAnnotation(annotation)
    const declaredType = hasAnnotation ? resolveType(annotation.typeAnnotation) : T_ANY
    const initType = decl.init ? inferExprType(decl.init, this.env) : T_ANY

    if (decl.init && hasAnnotation && !isConsistent(initType, declaredType)) {
      this.report({
        code: 'SJS-E001',
        severity: 'error',
        message: `Destructuring: cannot assign '${initType.kind}' to '${declaredType.kind}'.`,
        node: decl.init,
        specUrl: SPEC.LET_CONST,
      })
    }

    const sourceType = declaredType.kind !== 'any' ? declaredType : initType

    for (const prop of pattern.properties) {
      if (t.isRestElement(prop)) {
        if (t.isIdentifier(prop.argument)) this.env.set(prop.argument.name, T_ANY)
        continue
      }
      if (!t.isObjectProperty(prop)) continue
      const keyName = t.isIdentifier(prop.key) ? prop.key.name
        : t.isStringLiteral(prop.key) ? prop.key.value : null
      if (!keyName) continue

      const propType = getPropType(sourceType, keyName, this.env)
      if (t.isIdentifier(prop.value)) {
        this.env.set(prop.value.name, propType)
      } else if (t.isAssignmentPattern(prop.value) && t.isIdentifier(prop.value.left)) {
        this.env.set(prop.value.left.name, propType)
      }
    }
  }

  /**
   * Handle `const [a, b]: [T1, T2] = init` — array destructuring.
   * ECMA-262 §14.3.3 Destructuring Binding Patterns
   */
  private checkArrayPatternDeclarator(decl: t.VariableDeclarator): void {
    const pattern = decl.id as t.ArrayPattern
    const annotation = pattern.typeAnnotation
    const hasAnnotation = annotation && t.isTSTypeAnnotation(annotation)
    const declaredType = hasAnnotation ? resolveType(annotation.typeAnnotation) : T_ANY
    const initType = decl.init ? inferExprType(decl.init, this.env) : T_ANY
    const sourceType = declaredType.kind !== 'any' ? declaredType : initType

    for (let i = 0; i < pattern.elements.length; i++) {
      const elem = pattern.elements[i]
      if (!elem) continue

      let elemType: Type = T_ANY
      if (sourceType.kind === 'tuple') {
        elemType = (sourceType as TupleType).elements[i] ?? T_ANY
      } else if (sourceType.kind === 'array') {
        elemType = (sourceType as ArrayType).elementType
      }

      if (t.isIdentifier(elem)) {
        this.env.set(elem.name, elemType)
      } else if (t.isRestElement(elem) && t.isIdentifier(elem.argument)) {
        const restType: Type = sourceType.kind === 'tuple'
          ? { kind: 'array', elementType: { kind: 'union', types: (sourceType as TupleType).elements.slice(i) } }
          : sourceType
        this.env.set(elem.argument.name, restType)
      } else if (t.isAssignmentPattern(elem) && t.isIdentifier(elem.left)) {
        this.env.set(elem.left.name, elemType)
      }
    }
  }

  // ── Assignment ────────────────────────────────────────────────────────────

  private checkAssignment(path: NodePath<t.AssignmentExpression>): void {
    if (!t.isIdentifier(path.node.left)) return
    const name = (path.node.left as t.Identifier).name
    const declaredType = this.env.get(name)
    if (!declaredType || declaredType.kind === 'any') return
    const rhsType = inferExprType(path.node.right, this.env)
    if (!isConsistent(rhsType, declaredType)) {
      this.report({
        code: 'SJS-E001',
        severity: 'error',
        message: `I cannot assign a value of type '${rhsType.kind}' to '${name}' which is declared as '${declaredType.kind}'.`,
        node: path.node.right,
        specUrl: 'https://tc39.es/ecma262/#sec-assignment-operators',
      })
    }
  }

  // ── Return statements ─────────────────────────────────────────────────────

  private checkReturnStatement(path: NodePath<t.ReturnStatement>): void {
    const fnPath = path.getFunctionParent()
    if (!fnPath) return

    const fnNode = fnPath.node as t.Function
    const returnAnnotation = fnNode.returnType
      ? (fnNode.returnType as t.TSTypeAnnotation).typeAnnotation
      : null
    let declaredReturn = resolveType(returnAnnotation)

    if (declaredReturn.kind === 'any') return

    // Async: wrap non-void/non-any return in Promise
    if (fnNode.async && declaredReturn.kind !== 'promise' && declaredReturn.kind !== 'void') {
      declaredReturn = { kind: 'promise', resolvedType: declaredReturn }
    }

    // Unwrap for actual check (async fn returns T, declared as Promise<T>)
    let checkAgainst: Type = declaredReturn
    if (fnNode.async && declaredReturn.kind === 'promise') {
      checkAgainst = (declaredReturn as PromiseType).resolvedType
    }

    const returnArg = path.node.argument
    const actualType = inferExprType(returnArg ?? null, this.env)

    if (checkAgainst.kind === 'void' && returnArg) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I found a return value in a function declared as 'void'. A void function must not return a value.`,
        node: returnArg,
        specUrl: SPEC.FUNCTION_DEF,
      })
      return
    }

    if (checkAgainst.kind === 'any') return

    if (!isConsistent(actualType, checkAgainst)) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I expected this function to return '${checkAgainst.kind}' but found '${actualType.kind}'.`,
        node: returnArg ?? path.node,
        specUrl: SPEC.FUNCTION_DEF,
      })
    }
  }

  // ── Call expression ───────────────────────────────────────────────────────

  private checkCallExpression(path: NodePath<t.CallExpression>): void {
    if (!t.isIdentifier(path.node.callee)) return
    const calleeName = (path.node.callee as t.Identifier).name
    const calleeType = this.env.get(calleeName)
    if (!calleeType || calleeType.kind !== 'function') return

    const fnType = calleeType as FunctionType
    const requiredParams = fnType.params.filter(p => !p.optional)

    for (let i = 0; i < fnType.params.length; i++) {
      const param = fnType.params[i]
      const arg = path.node.arguments[i]
      if (!arg) {
        if (!param.optional) {
          this.report({
            code: 'SJS-E003',
            severity: 'error',
            message: `I expected ${requiredParams.length} argument(s) but only ${path.node.arguments.length} was provided. Missing argument '${param.name}' of type '${param.type.kind}'.`,
            node: path.node,
            specUrl: 'https://tc39.es/ecma262/#sec-evaluatecall',
          })
        }
        continue
      }
      if (!t.isExpression(arg)) continue
      const argType = inferExprType(arg, this.env)
      if (!isConsistent(argType, param.type)) {
        this.report({
          code: 'SJS-E003',
          severity: 'error',
          message: `I expected argument '${param.name}' to be of type '${param.type.kind}' but found '${argType.kind}'.`,
          node: arg,
          specUrl: 'https://tc39.es/ecma262/#sec-evaluatecall',
        })
      }
    }
  }

  // ── Function declaration registration ────────────────────────────────────

  private registerFunctionDeclaration(path: NodePath<t.FunctionDeclaration>): void {
    const { node } = path
    if (!node.id) return

    const returnAnnotation = node.returnType
      ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
      : null
    const rawReturn = resolveType(returnAnnotation)

    // Async: wrap non-Promise return type
    let returnType = rawReturn
    if (node.async && rawReturn.kind !== 'promise' && rawReturn.kind !== 'any' && rawReturn.kind !== 'void') {
      returnType = { kind: 'promise', resolvedType: rawReturn }
    }

    const params = node.params.map(p => {
      const paramName = t.isIdentifier(p) ? p.name
        : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) ? p.left.name : '_')
      const hasAnnotation = (t.isIdentifier(p) && p.typeAnnotation)
        || (t.isAssignmentPattern(p) && t.isIdentifier(p.left) && p.left.typeAnnotation)
      const paramType = t.isIdentifier(p) && p.typeAnnotation
        ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
        : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) && p.left.typeAnnotation
            ? resolveType((p.left.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
            : T_ANY)

      if (this.strict && !hasAnnotation && paramName !== '_') {
        this.report({
          code: 'SJS-W001',
          severity: 'warning',
          message: `Parameter '${paramName}' implicitly has type 'any' because it lacks a type annotation.`,
          node: p,
          specUrl: 'https://www.typescriptlang.org/tsconfig/#noImplicitAny',
        })
      }
      return { name: paramName, type: paramType, optional: t.isIdentifier(p) ? (p.optional ?? false) : t.isAssignmentPattern(p) }
    })

    this.env.set(node.id.name, { kind: 'function', params, returnType, async: node.async ?? false })
  }

  // ── Arrow concise return ──────────────────────────────────────────────────

  private checkArrowConciseReturn(path: NodePath<t.ArrowFunctionExpression>): void {
    const { node } = path

    if (this.strict) {
      for (const p of node.params) {
        const paramName = t.isIdentifier(p) ? p.name
          : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) ? p.left.name : '_')
        const hasAnnotation = (t.isIdentifier(p) && p.typeAnnotation)
          || (t.isAssignmentPattern(p) && t.isIdentifier(p.left) && p.left.typeAnnotation)
        if (!hasAnnotation && paramName !== '_') {
          this.report({
            code: 'SJS-W001',
            severity: 'warning',
            message: `Parameter '${paramName}' implicitly has type 'any' because it lacks a type annotation.`,
            node: p,
            specUrl: 'https://www.typescriptlang.org/tsconfig/#noImplicitAny',
          })
        }
      }
    }

    if (t.isBlockStatement(node.body)) return

    const returnAnnotation = node.returnType
      ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
      : null
    const rawReturn = resolveType(returnAnnotation)
    if (rawReturn.kind === 'any') return

    const checkAgainst = (node.async && rawReturn.kind === 'promise')
      ? (rawReturn as PromiseType).resolvedType
      : rawReturn
    if (checkAgainst.kind === 'any') return

    const actualType = inferExprType(node.body, this.env)
    if (!isConsistent(actualType, checkAgainst)) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I expected this arrow function to return '${checkAgainst.kind}' but found '${actualType.kind}'.`,
        node: node.body,
        specUrl: 'https://tc39.es/ecma262/#sec-arrow-function-definitions',
      })
    }
  }

  // ── SJS-E004: BigInt mixing enforcement — ECMA-262 §21.2.1.2 ─────────────

  /**
   * Rejects arithmetic operations mixing bigint and number.
   * ECMAScript throws TypeError at runtime for such operations.
   * https://tc39.es/ecma262/#sec-numeric-types-bigint-add
   */
  private checkBigIntMixing(path: NodePath<t.BinaryExpression>): void {
    const { node } = path
    const arithOps = new Set(['+', '-', '*', '/', '**', '%', '|', '&', '^', '<<', '>>', '>>>'])
    if (!arithOps.has(node.operator)) return

    const leftType = inferExprType(node.left as t.Expression, this.env)
    const rightType = inferExprType(node.right as t.Expression, this.env)

    const isBigInt = (ty: Type) => ty.kind === 'bigint' ||
      (ty.kind === 'union' && (ty as UnionType).types.some(t => t.kind === 'bigint'))
    const isNumber = (ty: Type) => ty.kind === 'number' ||
      (ty.kind === 'union' && (ty as UnionType).types.some(t => t.kind === 'number'))

    if ((isBigInt(leftType) && isNumber(rightType)) || (isNumber(leftType) && isBigInt(rightType))) {
      this.report({
        code: 'SJS-E004',
        severity: 'error',
        message: `Cannot mix BigInt and number in arithmetic operations. This would throw TypeError at runtime.`,
        node,
        specUrl: SPEC.BIGINT_MIXING,
      })
    }
  }

  // ── Type narrowing in if/else branches ────────────────────────────────────

  /**
   * Implements type narrowing inside if/else branches.
   * Uses env save/restore and path.skip() to apply correct narrowings per branch.
   * ECMA-262 §14.6 The if Statement
   */
  private checkIfNarrowing(path: NodePath<t.IfStatement>): void {
    const { node } = path
    const thenNarrowings = extractNarrowings(node.test, this.env)
    if (thenNarrowings.size === 0) return  // no narrowings — let default traversal handle

    const savedEnv = new Map(this.env)

    // Apply then-narrowings and traverse consequent
    for (const [name, type] of thenNarrowings) this.env.set(name, type)
    ;(path.get('consequent') as NodePath).traverse({
      enter: (p: NodePath) => { this.check(p) },
    })

    // Restore and apply else-narrowings
    this.env = savedEnv
    const elseNarrowings = negateNarrowings(thenNarrowings, node.test, savedEnv)
    for (const [name, type] of elseNarrowings) this.env.set(name, type)

    if (node.alternate) {
      ;(path.get('alternate') as NodePath).traverse({
        enter: (p: NodePath) => { this.check(p) },
      })
    }

    this.env = savedEnv
    path.skip()
  }

  // ── SJS-E009: await outside async ────────────────────────────────────────

  private checkAwaitExpression(path: NodePath<t.AwaitExpression>): void {
    const fnParent = path.getFunctionParent()
    if (!fnParent || !(fnParent.node as t.Function).async) {
      this.report({
        code: 'SJS-E009',
        severity: 'error',
        message: `'await' is only valid inside async functions.`,
        node: path.node,
        specUrl: SPEC.ASYNC_AWAIT,
      })
    }
  }

  // ── Sum type registration ─────────────────────────────────────────────────

  private registerSumTypeAlias(path: NodePath<t.TSTypeAliasDeclaration>): void {
    const { node } = path
    const aliasName = node.id.name
    const rhs = node.typeAnnotation
    if (rhs.type !== 'TSUnionType') return

    const memberNames: string[] = []
    for (const member of rhs.types) {
      if (member.type !== 'TSTypeReference') return
      const typeName = member.typeName
      if (!t.isIdentifier(typeName)) return
      memberNames.push(typeName.name)
    }

    this.sumTypeRegistry.set(aliasName, {
      kind: 'sum',
      name: aliasName,
      variants: memberNames.map(name => ({ kind: 'sumVariant' as const, tag: name, fields: [] })),
    })
  }

  private registerVariantConstructor(path: NodePath<t.VariableDeclarator>): void {
    const { node } = path
    if (!t.isIdentifier(node.id)) return
    if (!node.init || !t.isArrowFunctionExpression(node.init)) return
    const arrow = node.init
    if (!t.isObjectExpression(arrow.body)) return

    for (const prop of arrow.body.properties) {
      if (!t.isObjectProperty(prop)) continue
      if (!t.isIdentifier(prop.key, { name: '_tag' })) continue
      let tagValue: string | null = null
      if (t.isStringLiteral(prop.value)) {
        tagValue = prop.value.value
      } else if (t.isTSAsExpression(prop.value) && t.isStringLiteral(prop.value.expression)) {
        tagValue = (prop.value.expression as t.StringLiteral).value
      }
      if (tagValue) this.variantTagRegistry.set(tagValue, node.id.name)
      break
    }
  }

  // ── Switch exhaustiveness ─────────────────────────────────────────────────

  private checkSwitchExhaustiveness(path: NodePath<t.SwitchStatement>): void {
    const disc = path.node.discriminant
    if (!t.isMemberExpression(disc)) return
    if (!t.isIdentifier(disc.property, { name: '_tag' })) return
    if (!t.isIdentifier(disc.object)) return

    const varType = this.env.get(disc.object.name)
    if (!varType || varType.kind !== 'sum') return

    const sumType = varType as SumType
    const hasDefault = path.node.cases.some(c => c.test === null)
    if (hasDefault) return

    const covered = new Set(
      path.node.cases
        .filter(c => c.test !== null && t.isStringLiteral(c.test))
        .map(c => (c.test as t.StringLiteral).value)
    )
    const missing = sumType.variants.map(v => v.tag).filter(tag => !covered.has(tag))

    if (missing.length > 0) {
      this.diagnostics.push({
        code: 'SJS-E007',
        severity: 'error',
        message: `Non-exhaustive match: missing variant(s) ${missing.map(tag => `'${tag}'`).join(', ')}.`,
        line: path.node.loc?.start.line ?? 0,
        column: path.node.loc?.start.column ?? 0,
        specUrl: 'https://github.com/hbarve1/super-js/blob/master/specs/001-superjs-core-language/type-system-v2.md#45-pattern-matching',
      })
    }
  }

  // ── Diagnostic helper ─────────────────────────────────────────────────────

  private report(opts: {
    code: string
    severity: PrototypeDiagnostic['severity']
    message: string
    node: t.Node
    specUrl: string
  }): void {
    const loc = opts.node.loc?.start
    this.diagnostics.push({
      code: opts.code,
      severity: opts.severity,
      message: opts.message,
      line: loc?.line ?? 0,
      column: loc?.column ?? 0,
      specUrl: opts.specUrl,
    })
  }
}
