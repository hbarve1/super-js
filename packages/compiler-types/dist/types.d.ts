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
export interface UndefinedType {
    readonly kind: 'undefined';
}
export interface NullType {
    readonly kind: 'null';
}
export interface BooleanType {
    readonly kind: 'boolean';
}
export interface StringType {
    readonly kind: 'string';
}
export interface SymbolType {
    readonly kind: 'symbol';
}
export interface NumberType {
    readonly kind: 'number';
}
export interface BigIntType {
    readonly kind: 'bigint';
}
/** Void — function returns nothing. ECMA-262 §15.8.3 step 3 (absent completion value). */
export interface VoidType {
    readonly kind: 'void';
}
/** `never` — the bottom type; no value inhabits it. */
export interface NeverType {
    readonly kind: 'never';
}
/** `dynamic` — runtime-checked escape hatch. NOT `any`. */
export interface DynamicType {
    readonly kind: 'dynamic';
}
export interface ObjectType {
    readonly kind: 'object';
    readonly name: string;
    readonly properties: ReadonlyMap<string, SJSType>;
}
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
export interface NullableType {
    readonly kind: 'nullable';
    readonly inner: SJSType;
}
export interface SumVariantField {
    readonly name: string;
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
export interface TypeParam {
    readonly name: string;
    readonly constraint?: SJSType;
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
export interface InterfaceType {
    readonly kind: 'interface';
    readonly name: string;
    readonly typeParams: readonly TypeParam[];
    readonly members: ReadonlyMap<string, SJSType>;
}
export type SJSType = UndefinedType | NullType | BooleanType | StringType | SymbolType | NumberType | BigIntType | VoidType | NeverType | DynamicType | ObjectType | ArrayType | FunctionType | NullableType | SumType | SumVariantType | GenericType | TypeParamRef | InterfaceType;
//# sourceMappingURL=types.d.ts.map