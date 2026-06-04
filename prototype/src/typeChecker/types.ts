/**
 * Super.js type representation.
 *
 * Primitive kinds map directly to ECMAScript Language Types (ECMA-262 §6.1):
 *   https://tc39.es/ecma262/#sec-ecmascript-language-types
 *
 * `any` is the gradual type (consistent with every type) from:
 *   Siek & Taha, "Gradual Typing for Functional Languages" (2006)
 */

// ── Primitive types — ECMA-262 §6.1 ─────────────────────────────────────────

export interface UndefinedType { kind: 'undefined' }   // §6.1.1
export interface NullType      { kind: 'null' }        // §6.1.2
export interface BooleanType   { kind: 'boolean' }     // §6.1.3
export interface StringType    { kind: 'string' }      // §6.1.4
export interface SymbolType    { kind: 'symbol' }      // §6.1.5
export interface NumberType    { kind: 'number' }      // §6.1.6.1
export interface BigIntType    { kind: 'bigint' }      // §6.1.6.2

// ── Object type — ECMA-262 §6.1.7 ────────────────────────────────────────────

export interface ObjectType {
  kind: 'object'
  properties: Map<string, Type>
  typeParams?: string[]
  /** Identifies branded stdlib objects (Map, Set, WeakMap, WeakSet, WeakRef, Date, RegExp, Error). */
  brand?: string
  /** Map<K,V> / WeakMap<K,V> — key type */
  mapKeyType?: Type
  /** Map<K,V> / WeakMap<K,V> — value type */
  mapValueType?: Type
  /** Set<T> / WeakSet<T> — element type */
  setElementType?: Type
  /** WeakRef<T> — inner type */
  weakRefType?: Type
}

// ── Composite types ───────────────────────────────────────────────────────────

export interface ArrayType {
  kind: 'array'
  elementType: Type
}

export interface FunctionType {
  kind: 'function'
  params: Array<{ name: string; type: Type; optional: boolean }>
  returnType: Type
  typeParams?: string[]
}

// ── Generic type parameter placeholder ───────────────────────────────────────

/** Represents an unresolved generic type parameter, e.g. `T` in `identity<T>`. */
export interface TypeParamType {
  kind: 'typeParam'
  name: string
}

export interface TupleType {
  kind: 'tuple'
  elements: Type[]
}

export interface UnionType {
  kind: 'union'
  types: Type[]
}

export interface IntersectionType {
  kind: 'intersection'
  types: Type[]
}

// ── Sum types (SJS-specific — type Result<T> = Ok(T) | Err(string)) ──────────

export interface SumVariantType {
  kind: 'sumVariant'
  tag: string                                    // variant name, e.g. "Ok"
  fields: Array<{ name: string; type: Type }>   // positional: _0, _1, …
}

export interface SumType {
  kind: 'sum'
  name: string           // declared type name, e.g. "Result"
  variants: SumVariantType[]
}

/**
 * Promise<T> — the result of an async function or an awaitable value.
 * ECMA-262 §27.2 Promise Objects.
 */
export interface PromiseType {
  kind: 'promise'
  valueType: Type
}

/** `dynamic` — runtime-checked escape hatch (not `any`). Consistent with every type. */
export interface DynamicType { kind: 'dynamic' }

// ── Special types ─────────────────────────────────────────────────────────────

/** Void — function returns nothing. ECMA-262 §15.8.3 step 3 (absent completion value). */
export interface VoidType { kind: 'void' }

/**
 * `any` — the gradual/dynamic type. Consistent with every other type.
 * All unannotated positions receive `any`.
 * Consistency relation: `any ~ T` and `T ~ any` hold for all T.
 */
export interface AnyType { kind: 'any' }

/** `never` — the bottom type; no value inhabits it. */
export interface NeverType { kind: 'never' }

// ── Union of all type variants ────────────────────────────────────────────────

export type Type =
  | UndefinedType
  | NullType
  | BooleanType
  | StringType
  | SymbolType
  | NumberType
  | BigIntType
  | ObjectType
  | ArrayType
  | TupleType
  | FunctionType
  | UnionType
  | IntersectionType
  | VoidType
  | AnyType
  | NeverType
  | SumType
  | SumVariantType
  | DynamicType
  | TypeParamType
  | PromiseType

// ── Diagnostic ────────────────────────────────────────────────────────────────

/**
 * Prototype-internal diagnostic shape.
 *
 * Uses flat `line`/`column` fields (Babel AST coordinates) for Phase 1
 * compatibility.  The public `Diagnostic` type is the canonical shape from
 * `@superjs/compiler-types`; this local alias is intentionally kept until
 * Stage 1 wires up the full `SourceSpan`-based pipeline.
 */
export interface PrototypeDiagnostic {
  code: string          // e.g. "SJS-E001"
  severity: 'error' | 'warning' | 'info'
  message: string       // plain-English, names both types
  file?: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  specUrl: string       // authoritative spec anchor for this rule
}

// Re-export the canonical Diagnostic type from the shared package.
export type { Diagnostic, Severity, SourceSpan, SJSType } from '@superjs/compiler-types';

// ── Type environment ──────────────────────────────────────────────────────────

export type TypeEnvironment = Map<string, Type>
