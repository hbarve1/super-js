/**
 * SJS type-system representation (the checker's internal type model).
 *
 * Differs from the legacy prototype model by SJS soundness rules:
 *   - No `any` — the gradual escape hatch is `dynamic` (ADR-001).
 *   - No intersection `A & B` (ADR-004, banned).
 *   - Nullability is explicit via {@link NullableType} (`T?`), not `T | null`
 *     in the surface — though it is consistent with `T | null` semantically
 *     (ADR-006).
 *
 * Primitive kinds map to ECMA-262 §6.1 ECMAScript Language Types.
 */

export type Type =
  | NumberType
  | StringType
  | BooleanType
  | BigIntType
  | SymbolType
  | NullType
  | UndefinedType
  | VoidType
  | NeverType
  | UnknownType
  | ObjectKeywordType
  | DynamicType
  | LiteralType
  | NullableType
  | ArrayType
  | TupleType
  | FunctionType
  | ObjectType
  | UnionType
  | SumType
  | SumVariantType
  | TypeRef
  | TypeParamType
  | PromiseType
  | GeneratorType;

export type TypeKind = Type['kind'];

// ── Primitives (ECMA-262 §6.1) ────────────────────────────────────────────────
export interface NumberType { readonly kind: 'number' }
export interface StringType { readonly kind: 'string' }
export interface BooleanType { readonly kind: 'boolean' }
export interface BigIntType { readonly kind: 'bigint' }
export interface SymbolType { readonly kind: 'symbol' }
export interface NullType { readonly kind: 'null' }
export interface UndefinedType { readonly kind: 'undefined' }
export interface VoidType { readonly kind: 'void' }
/** Bottom type; no value inhabits it. */
export interface NeverType { readonly kind: 'never' }
/** Top type; requires narrowing before use (unlike `dynamic`). */
export interface UnknownType { readonly kind: 'unknown' }
/** The `object` keyword type — any non-primitive. */
export interface ObjectKeywordType { readonly kind: 'object-keyword' }
/** Gradual escape hatch. Consistent with every type; replaces banned `any`. */
export interface DynamicType { readonly kind: 'dynamic' }

// ── Literal types (specs/language/literal-and-enum) ───────────────────────────
export interface LiteralType {
  readonly kind: 'literal';
  readonly value: string | number | boolean | bigint;
  readonly base: 'string' | 'number' | 'boolean' | 'bigint';
}

// ── Nullable (`T?`) ───────────────────────────────────────────────────────────
export interface NullableType {
  readonly kind: 'nullable';
  readonly inner: Type;
}

// ── Composite ─────────────────────────────────────────────────────────────────
export interface ArrayType {
  readonly kind: 'array';
  readonly element: Type;
  readonly readonly: boolean;
}

export interface TupleType {
  readonly kind: 'tuple';
  readonly elements: readonly Type[];
}

export interface ParamType {
  readonly name: string;
  readonly type: Type;
  readonly optional: boolean;
  readonly rest: boolean;
}

export interface FunctionType {
  readonly kind: 'function';
  readonly params: readonly ParamType[];
  readonly returnType: Type;
  readonly typeParams?: readonly string[];
  readonly async: boolean;
}

export interface PropertySignature {
  readonly name: string;
  readonly type: Type;
  readonly optional: boolean;
  readonly readonly: boolean;
}

export interface IndexSignatureType {
  readonly keyType: 'string' | 'number' | 'symbol';
  readonly valueType: Type;
}

/** Structural object/interface type. SJS interfaces are structural (ADR-002). */
export interface ObjectType {
  readonly kind: 'object';
  /** Declared name for interfaces/classes; undefined for object literals. */
  readonly name?: string;
  readonly properties: readonly PropertySignature[];
  readonly indexSignature?: IndexSignatureType;
  readonly typeParams?: readonly string[];
  /** True if this object type originates from a `class` (nominal identity). */
  readonly nominal?: boolean;
}

export interface UnionType {
  readonly kind: 'union';
  readonly types: readonly Type[];
}

// ── Sum types (SJS-specific — ADR-003) ────────────────────────────────────────
export interface SumVariantType {
  readonly kind: 'sum-variant';
  /** Owning sum type name, e.g. "Result". */
  readonly owner: string;
  /** Variant tag, e.g. "Ok". */
  readonly tag: string;
  /** Positional payload fields (`_0`, `_1`, …) or named record fields. */
  readonly fields: readonly { readonly name: string; readonly type: Type }[];
}

export interface SumType {
  readonly kind: 'sum';
  readonly name: string;
  readonly variants: readonly SumVariantType[];
  readonly typeParams?: readonly string[];
}

// ── References & generics ─────────────────────────────────────────────────────
/** A named type reference before resolution, with optional type arguments. */
export interface TypeRef {
  readonly kind: 'type-ref';
  readonly name: string;
  readonly typeArgs?: readonly Type[];
}

/** Unresolved generic parameter, e.g. `T` in `identity<T>`. */
export interface TypeParamType {
  readonly kind: 'type-param';
  readonly name: string;
}

// ── Branded library object types (ECMA-262 §27) ───────────────────────────────
export interface PromiseType {
  readonly kind: 'promise';
  readonly value: Type;
}

export interface GeneratorType {
  readonly kind: 'generator';
  readonly yield: Type;
  readonly return: Type;
  readonly next: Type;
  readonly async: boolean;
}
