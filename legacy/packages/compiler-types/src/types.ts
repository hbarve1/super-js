/**
 * SuperJS type system — discriminated union of all SJS types.
 *
 * Primitive kinds map directly to ECMAScript Language Types (ECMA-262 §6.1):
 *   https://tc39.es/ecma262/#sec-ecmascript-language-types
 *
 * NOTE: `AnyType` from the prototype is intentionally absent — SJS uses
 * `DynamicType` as its runtime-checked escape hatch instead.
 * `IntersectionType` is also absent — SJS bans `A & B`.
 */

// ── Primitive types — ECMA-262 §6.1 ─────────────────────────────────────────

export interface UndefinedType { readonly kind: 'undefined' }  // §6.1.1
export interface NullType      { readonly kind: 'null' }       // §6.1.2
export interface BooleanType   { readonly kind: 'boolean' }    // §6.1.3
export interface StringType    { readonly kind: 'string' }     // §6.1.4
export interface SymbolType    { readonly kind: 'symbol' }     // §6.1.5
export interface NumberType    { readonly kind: 'number' }     // §6.1.6.1
export interface BigIntType    { readonly kind: 'bigint' }     // §6.1.6.2

// ── Special types ─────────────────────────────────────────────────────────────

/** Void — function returns nothing. ECMA-262 §15.8.3 step 3 (absent completion value). */
export interface VoidType  { readonly kind: 'void' }

/** `never` — the bottom type; no value inhabits it. */
export interface NeverType { readonly kind: 'never' }

/** `dynamic` — runtime-checked escape hatch. NOT `any`. */
export interface DynamicType { readonly kind: 'dynamic' }

// ── Object type — ECMA-262 §6.1.7 ────────────────────────────────────────────

export interface ObjectType {
  readonly kind: 'object';
  readonly name: string;
  readonly properties: ReadonlyMap<string, SJSType>;
}

// ── Composite types ───────────────────────────────────────────────────────────

export interface ArrayType {
  readonly kind: 'array';
  readonly elementType: SJSType;
}

export interface FunctionType {
  readonly kind: 'function';
  readonly typeParams: readonly TypeParam[];
  readonly params: readonly FunctionParam[];
  readonly returnType: SJSType;
}

export interface FunctionParam {
  readonly name: string;
  readonly type: SJSType;
  readonly optional: boolean;
}

// ── Nullable: T? desugars to T | null | undefined ────────────────────────────

export interface NullableType {
  readonly kind: 'nullable';
  readonly inner: SJSType;
}

// ── Sum types (SJS-specific): type Result<T,E> = Ok(T) | Err(E) ──────────────

export interface SumVariantField {
  readonly name: string;  // positional: _0, _1, … or named record fields
  readonly type: SJSType;
}

export interface SumVariantType {
  readonly kind: 'sumVariant';
  readonly tag: string;
  readonly fields: readonly SumVariantField[];
}

export interface SumType {
  readonly kind: 'sum';
  readonly name: string;
  readonly typeParams: readonly TypeParam[];
  readonly variants: readonly SumVariantType[];
}

// ── Generics ──────────────────────────────────────────────────────────────────

export interface TypeParam {
  readonly name: string;
  readonly constraint?: SJSType;  // T: Comparable
}

export interface GenericType {
  readonly kind: 'generic';
  readonly name: string;
  readonly args: readonly SJSType[];
}

export interface TypeParamRef {
  readonly kind: 'typeParamRef';
  readonly name: string;
}

// ── Interface type (structural) ───────────────────────────────────────────────

export interface InterfaceType {
  readonly kind: 'interface';
  readonly name: string;
  readonly typeParams: readonly TypeParam[];
  readonly members: ReadonlyMap<string, SJSType>;
}

// ── Union of all SJS types ────────────────────────────────────────────────────

export type SJSType =
  | UndefinedType
  | NullType
  | BooleanType
  | StringType
  | SymbolType
  | NumberType
  | BigIntType
  | VoidType
  | NeverType
  | DynamicType
  | ObjectType
  | ArrayType
  | FunctionType
  | NullableType
  | SumType
  | SumVariantType
  | GenericType
  | TypeParamRef
  | InterfaceType;
