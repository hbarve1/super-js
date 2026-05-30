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
  | FunctionType
  | UnionType
  | IntersectionType
  | VoidType
  | AnyType
  | NeverType
  | SumType
  | SumVariantType
  | DynamicType

// ── Diagnostic ────────────────────────────────────────────────────────────────

/**
 * A compiler diagnostic (error or warning).
 *
 * Follows the Rust-inspired model from research.md §3:
 *   - stable `SJS-Exxx` codes
 *   - precise source location
 *   - `specUrl` linking to the ECMAScript (or TypeScript) specification section
 *     that defines the rule being violated
 */
export interface Diagnostic {
  code: string          // e.g. "SJS-E001"
  severity: 'error' | 'warning' | 'note'
  message: string       // plain-English, names both types
  file?: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  specUrl: string       // authoritative spec anchor for this rule
}

// ── Type environment ──────────────────────────────────────────────────────────

export type TypeEnvironment = Map<string, Type>
