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
  UnionType, FunctionType, SumType, SumVariantType, ArrayType, ObjectType,
  PromiseType, DynamicType, GeneratorType, TupleType, NeverType,
} from './types'

// ── Singleton primitive types ─────────────────────────────────────────────────

const T_ANY:       AnyType       = { kind: 'any' }
const T_NUMBER:    NumberType    = { kind: 'number' }
const T_STRING:    StringType    = { kind: 'string' }
const T_BOOLEAN:   BooleanType   = { kind: 'boolean' }
const T_NULL:      NullType      = { kind: 'null' }
const T_UNDEFINED: UndefinedType = { kind: 'undefined' }
const T_VOID:      VoidType      = { kind: 'void' }
const T_DYNAMIC:   DynamicType   = { kind: 'dynamic' }
const _T_NEVER: NeverType = { kind: 'never' }
void _T_NEVER  // reserved for future use

// ── Class member visibility info ──────────────────────────────────────────────

// ── Nullable type helper ──────────────────────────────────────────────────────

function isNullableType(tp: Type): boolean {
  if (tp.kind === 'null' || tp.kind === 'undefined') return true
  if (tp.kind === 'union') {
    return (tp as UnionType).types.some(m => m.kind === 'null' || m.kind === 'undefined')
  }
  return false
}

// ── Spec URLs ─────────────────────────────────────────────────────────────────

const SPEC = {
  // ECMAScript Language Types — ECMA-262 §6.1
  LANGUAGE_TYPES: 'https://tc39.es/ecma262/#sec-ecmascript-language-types',
  UNDEFINED_TYPE: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type',
  NULL_TYPE:      'https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type',
  BOOLEAN_TYPE:   'https://tc39.es/ecma262/#sec-ecmascript-language-types-boolean-type',
  STRING_TYPE:    'https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type',
  NUMBER_TYPE:    'https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type',
  BIGINT_TYPE:    'https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type',
  SYMBOL_TYPE:    'https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type',
  OBJECT_TYPE:    'https://tc39.es/ecma262/#sec-object-type',
  // Declarations — ECMA-262 §14.3
  LET_CONST:      'https://tc39.es/ecma262/#sec-let-and-const-declarations',
  // Function definitions — ECMA-262 §15.2
  FUNCTION_DEF:   'https://tc39.es/ecma262/#sec-function-definitions',
  // Binary arithmetic operators — ECMA-262 §13.15
  BINARY_EXPR:    'https://tc39.es/ecma262/#sec-binary-arithmetic-operators',
  // Logical operators — ECMA-262 §13.13
  LOGICAL_OPS:    'https://tc39.es/ecma262/#sec-binary-logical-operators',
  // Conditional operator — ECMA-262 §13.14
  CONDITIONAL:    'https://tc39.es/ecma262/#sec-conditional-operator',
  // Array initializer — ECMA-262 §13.2.4
  ARRAY_INIT:     'https://tc39.es/ecma262/#sec-array-initializer',
  // Unary operators — ECMA-262 §13.5
  UNARY_OPS:      'https://tc39.es/ecma262/#sec-unary-operators',
  // Object initializer — ECMA-262 §13.2.5
  OBJECT_INIT:    'https://tc39.es/ecma262/#sec-object-initializer',
  // Property accessors — ECMA-262 §13.3.2
  PROP_ACCESS:    'https://tc39.es/ecma262/#sec-property-accessors',
} as const

// ── Resolve: TSType node → Type ───────────────────────────────────────────────

/**
 * Converts a Babel TSType AST node to our internal Type representation.
 *
 * Each keyword maps to its ECMAScript Language Type (ECMA-262 §6.1.*).
 * Unknown or unsupported annotations fall back to `any` (gradual escape).
 */
function resolveType(node: t.TSType | null | undefined): Type {
  if (!node) return T_ANY

  switch (node.type) {
    // Primitives — ECMA-262 §6.1.6.1 (number), §6.1.4 (string), §6.1.3 (boolean)
    case 'TSNumberKeyword':  return T_NUMBER
    case 'TSStringKeyword':  return T_STRING
    case 'TSBooleanKeyword': return T_BOOLEAN
    // Special — §6.1.1 (undefined), §6.1.2 (null)
    case 'TSUndefinedKeyword': return T_UNDEFINED
    case 'TSNullKeyword':      return T_NULL
    case 'TSVoidKeyword':      return T_VOID
    // Gradual — any is consistent with all types
    case 'TSAnyKeyword':    return T_ANY
    case 'TSNeverKeyword':  return { kind: 'never' }
    case 'TSSymbolKeyword': return { kind: 'symbol' }
    case 'TSBigIntKeyword': return { kind: 'bigint' }
    // Union — e.g. string | null
    case 'TSUnionType': {
      const types = node.types.map(resolveType)
      return { kind: 'union', types } satisfies UnionType
    }
    // Tuple type — e.g. [string, number] — ECMA-262 §23.1 (Array objects)
    case 'TSTupleType': {
      const elements = (node as t.TSTupleType).elementTypes.map(el => {
        // Handle rest elements and optional elements
        if (t.isTSRestType(el)) return resolveType(el.typeAnnotation)
        if (t.isTSOptionalType(el)) return resolveType(el.typeAnnotation)
        if (el.type === 'TSNamedTupleMember') return resolveType((el as t.TSNamedTupleMember).elementType)
        return resolveType(el as t.TSType)
      })
      return { kind: 'tuple', elements }
    }
    // Array — e.g. number[]
    case 'TSArrayType':
      return { kind: 'array', elementType: resolveType(node.elementType) }
    // Object type literal — e.g. { name: string; age: number }
    // Also handles index signatures: { [key: string]: number }
    case 'TSTypeLiteral': {
      const properties = new Map<string, Type>()
      let indexValueType: Type | null = null
      for (const member of node.members) {
        if (member.type === 'TSIndexSignature') {
          // Index signature — { [key: string]: number }
          const sig = member as t.TSIndexSignature
          indexValueType = sig.typeAnnotation
            ? resolveType((sig.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
            : T_ANY
          continue
        }
        if (member.type !== 'TSPropertySignature') continue
        const prop = member as t.TSPropertySignature
        const key = t.isIdentifier(prop.key) ? prop.key.name
          : t.isStringLiteral(prop.key) ? prop.key.value
          : null
        if (!key) continue
        const valueType = prop.typeAnnotation
          ? resolveType((prop.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
          : T_ANY
        properties.set(key, valueType)
      }
      const result: ObjectType = { kind: 'object', properties }
      if (indexValueType !== null) {
        // Store index signature info for computed access
        ;(result as any).__indexType = indexValueType
      }
      return result
    }
    // Function type — e.g. (x: number) => string
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
    // Generic type references — e.g. Promise<T>, Array<T>, Map<K,V>
    case 'TSTypeReference': {
      const nameNode = node.typeName
      const name = t.isIdentifier(nameNode) ? nameNode.name : null
      if (!name) return T_ANY
      const typeArgs = node.typeParameters?.params ?? []
      const args = typeArgs.map(resolveType)
      switch (name) {
        case 'dynamic':
          return T_DYNAMIC
        case 'Promise':
          return { kind: 'promise', valueType: args[0] ?? T_ANY }
        case 'Array':
        case 'ReadonlyArray':
          return { kind: 'array', elementType: args[0] ?? T_ANY }
        case 'Map':
          return { kind: 'object', brand: 'Map', mapKeyType: args[0] ?? T_ANY, mapValueType: args[1] ?? T_ANY, properties: new Map<string, Type>([['size', T_NUMBER]]) }
        case 'Set':
          return { kind: 'object', brand: 'Set', setElementType: args[0] ?? T_ANY, properties: new Map<string, Type>([['size', T_NUMBER]]) }
        case 'WeakMap':
          return { kind: 'object', brand: 'WeakMap', mapKeyType: args[0] ?? T_ANY, mapValueType: args[1] ?? T_ANY, properties: new Map() }
        case 'WeakSet':
          return { kind: 'object', brand: 'WeakSet', setElementType: args[0] ?? T_ANY, properties: new Map() }
        case 'WeakRef':
          return { kind: 'object', brand: 'WeakRef', weakRefType: args[0] ?? T_ANY, properties: new Map() }
        case 'Record':
          return { kind: 'object', properties: new Map() }
        case 'Partial':
        case 'Required':
        case 'Readonly':
        case 'Pick':
        case 'Omit':
        case 'Exclude':
        case 'Extract':
        case 'NonNullable':
        case 'ReturnType':
        case 'Parameters':
        case 'InstanceType':
        case 'ConstructorParameters':
          return T_ANY
        case 'Iterable':
        case 'AsyncIterable':
          return { kind: 'array', elementType: args[0] ?? T_ANY }
        case 'Generator':
          return { kind: 'generator', yieldType: args[0] ?? T_ANY, returnType: args[1] ?? T_ANY, nextType: args[2] ?? T_ANY, async: false } as GeneratorType
        case 'AsyncGenerator':
          return { kind: 'generator', yieldType: args[0] ?? T_ANY, returnType: args[1] ?? T_ANY, nextType: args[2] ?? T_ANY, async: true } as GeneratorType
        case 'IterableIterator':
        case 'Iterator':
          return { kind: 'generator', yieldType: args[0] ?? T_ANY, returnType: T_ANY, nextType: T_ANY, async: false } as GeneratorType
        case 'AsyncIterableIterator':
        case 'AsyncIterator':
          return { kind: 'generator', yieldType: args[0] ?? T_ANY, returnType: T_ANY, nextType: T_ANY, async: true } as GeneratorType
        // Typed arrays — ECMA-262 §23.2
        case 'Int8Array': case 'Uint8Array': case 'Int16Array': case 'Uint16Array':
        case 'Int32Array': case 'Uint32Array': case 'Uint8ClampedArray':
        case 'Float32Array': case 'Float64Array': case 'Float16Array':
          return { kind: 'object', brand: name, properties: new Map<string, Type>([
            ['length', T_NUMBER], ['byteLength', T_NUMBER], ['byteOffset', T_NUMBER],
            ['buffer', T_ANY],
          ]) }
        case 'BigInt64Array': case 'BigUint64Array':
          return { kind: 'object', brand: name, properties: new Map<string, Type>([
            ['length', T_NUMBER], ['byteLength', T_NUMBER], ['byteOffset', T_NUMBER],
            ['buffer', T_ANY],
          ]) }
        case 'DataView':
          return { kind: 'object', brand: 'DataView', properties: new Map<string, Type>([
            ['byteLength', T_NUMBER], ['byteOffset', T_NUMBER], ['buffer', T_ANY],
          ]) }
        case 'ArrayBuffer':
        case 'SharedArrayBuffer':
          return { kind: 'object', brand: name, properties: new Map<string, Type>([
            ['byteLength', T_NUMBER],
          ]) }
        case 'FinalizationRegistry':
          return { kind: 'object', brand: 'FinalizationRegistry', properties: new Map() }
        case 'AbortController':
          return { kind: 'object', brand: 'AbortController', properties: new Map<string, Type>([
            ['signal', { kind: 'object', brand: 'AbortSignal', properties: new Map<string, Type>([
              ['aborted', T_BOOLEAN], ['reason', T_ANY],
            ]) } as Type],
          ]) }
        case 'AbortSignal':
          return { kind: 'object', brand: 'AbortSignal', properties: new Map<string, Type>([
            ['aborted', T_BOOLEAN], ['reason', T_ANY],
          ]) }
        case 'URL':
          return { kind: 'object', brand: 'URL', properties: new Map<string, Type>([
            ['href', T_STRING], ['hostname', T_STRING], ['pathname', T_STRING],
            ['search', T_STRING], ['hash', T_STRING], ['origin', T_STRING],
            ['protocol', T_STRING], ['port', T_STRING], ['host', T_STRING],
            ['username', T_STRING], ['password', T_STRING],
            ['searchParams', T_ANY],
          ]) }
        case 'URLSearchParams':
          return { kind: 'object', brand: 'URLSearchParams', properties: new Map() }
        case 'Proxy':
          return T_ANY
        case 'ProxyHandler':
          return { kind: 'object', properties: new Map() }
        case 'PropertyDescriptor':
          return { kind: 'object', properties: new Map() }
        case 'RegExp': return { kind: 'object', brand: 'RegExp', properties: new Map<string, Type>([
          ['source', T_STRING], ['flags', T_STRING], ['global', T_BOOLEAN],
          ['ignoreCase', T_BOOLEAN], ['multiline', T_BOOLEAN], ['lastIndex', T_NUMBER],
        ]) }
        case 'Date': return { kind: 'object', brand: 'Date', properties: new Map() }
        case 'Error': case 'TypeError': case 'RangeError': case 'SyntaxError':
          return { kind: 'object', brand: 'Error', properties: new Map<string, Type>([
            ['message', T_STRING], ['stack', makeUnion(T_STRING, T_UNDEFINED)], ['cause', T_ANY]
          ]) }
        default:
          // Single uppercase letter → type parameter (gradual)
          if (/^[A-Z]$/.test(name)) return { kind: 'typeParam', name }
          // Multi-char generic type param (e.g., T2, TKey, TValue)
          if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return { kind: 'typeParam', name }
          return T_ANY
      }
    }
    // Intersection type — e.g. A & B
    case 'TSIntersectionType': {
      const types = node.types.map(resolveType)
      return { kind: 'intersection', types }
    }
    // Parenthesized type — e.g. (string | number)
    case 'TSParenthesizedType':
      return resolveType(node.typeAnnotation)

    // Type predicate — e.g. `x is string` (user-defined type guard)
    // Returns boolean; narrowing is handled separately.
    case 'TSTypePredicate':
      return T_BOOLEAN

    // Readonly modifier — e.g. `readonly T` or `Readonly<T>`
    case 'TSTypeOperator': {
      const inner = (node as t.TSTypeOperator).typeAnnotation
      return resolveType(inner)
    }

    // Indexed access type — e.g. `T[K]`
    case 'TSIndexedAccessType':
      return T_ANY

    // Mapped type — e.g. `{ [K in T]: V }`
    case 'TSMappedType':
      return { kind: 'object', properties: new Map() }

    // Template literal type — e.g. `${string}-${number}`
    case 'TSTemplateLiteralType':
      return T_STRING

    // Conditional type — e.g. `T extends U ? X : Y`
    case 'TSConditionalType':
      return T_ANY

    // Type query — e.g. `typeof x`
    case 'TSTypeQuery':
      return T_ANY

    // Infer type — e.g. `infer T`
    case 'TSInferType':
      return { kind: 'typeParam', name: 'infer' }

    default:
      return T_ANY  // gradual fallback — unknown annotation treated as any
  }
}

// ── Binary expression type inference helper — ECMA-262 §13.15 ────────────────

const ARITH_OPS  = new Set(['+', '-', '*', '/', '%', '**'])
const RELAT_OPS  = new Set(['<', '>', '<=', '>=', '===', '!==', '==', '!=', 'instanceof', 'in'])
const BITWISE_OPS = new Set(['&', '|', '^', '<<', '>>', '>>>'])

/**
 * Returns the result type of a binary operation without emitting diagnostics.
 * Callers that need error reporting (SJS-E004) must inspect operand types separately.
 *
 * ECMA-262 §13.15 Binary Arithmetic Operators:
 * https://tc39.es/ecma262/#sec-binary-arithmetic-operators
 */
function inferBinaryType(op: string, left: Type, right: Type): Type {
  if (ARITH_OPS.has(op)) {
    // String concatenation — ECMA-262 §13.15.4 step 1 (ApplyStringOrNumericBinaryOperator)
    if ((left.kind === 'string' || right.kind === 'string') && op === '+') return T_STRING
    if (left.kind === 'bigint' && right.kind === 'bigint') return { kind: 'bigint' }
    if (left.kind === 'number' && right.kind === 'number') return T_NUMBER
    // Mixed bigint/number or unknown — caller emits SJS-E004; return any here
    return T_ANY
  }
  if (RELAT_OPS.has(op)) return T_BOOLEAN
  if (BITWISE_OPS.has(op)) {
    if (left.kind === 'bigint' && right.kind === 'bigint') return { kind: 'bigint' }
    return T_NUMBER
  }
  return T_ANY
}

// ── Union construction helper ─────────────────────────────────────────────────

/**
 * Builds the smallest type that represents "either A or B":
 * - If either is `any`, return `any` (gradual absorbs everything).
 * - If both have the same kind (ignoring sub-structure), return one copy.
 * - Otherwise flatten nested unions and dedup by kind, returning a UnionType.
 *
 * ECMA-262 §13.13 / §13.14 — union result of logical/conditional operators.
 */
function makeUnion(a: Type, b: Type): Type {
  if (a.kind === 'any' || b.kind === 'any') return T_ANY

  // Collect members, flattening nested unions and deduplicating by kind.
  const seen = new Set<string>()
  const members: Type[] = []
  function add(t: Type): void {
    if (t.kind === 'union') {
      for (const m of (t as UnionType).types) add(m)
    } else if (!seen.has(t.kind)) {
      seen.add(t.kind)
      members.push(t)
    }
  }
  add(a)
  add(b)

  if (members.length === 1) return members[0]
  return { kind: 'union', types: members } satisfies UnionType
}

/**
 * Removes `null` and `undefined` from a union type.
 * Used for `??` nullish coalescing: the left operand's non-nullable portion.
 *
 * ECMA-262 §13.13 Nullish Coalescing Operator.
 */
function stripNullable(t: Type): Type {
  if (t.kind === 'null' || t.kind === 'undefined') return T_ANY
  if (t.kind !== 'union') return t
  const members = (t as UnionType).types.filter(
    m => m.kind !== 'null' && m.kind !== 'undefined'
  )
  if (members.length === 0) return T_ANY
  if (members.length === 1) return members[0]
  return { kind: 'union', types: members } satisfies UnionType
}

// ── Stdlib type inference ─────────────────────────────────────────────────────

/**
 * Infers the return type of a callback function arg when it is an inline arrow/function.
 * Used for Array.map, flatMap etc. to propagate element types through callbacks.
 * Falls back to T_ANY when the callback body is too complex to infer.
 */
function inferCallbackReturnType(
  callArgs: ReadonlyArray<t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder> | undefined,
  paramType: Type,
  env: TypeEnvironment,
): Type {
  const cb = callArgs?.[0]
  if (!cb || !t.isExpression(cb)) return T_ANY
  if (!t.isArrowFunctionExpression(cb) && !t.isFunctionExpression(cb)) return T_ANY
  const cbFn = cb as t.ArrowFunctionExpression | t.FunctionExpression

  // Build a child env with the first parameter bound to the element type
  const cbEnv = new Map(env)
  const firstParam = cbFn.params[0]
  if (t.isIdentifier(firstParam)) {
    cbEnv.set(firstParam.name, paramType)
  } else if (t.isAssignmentPattern(firstParam) && t.isIdentifier(firstParam.left)) {
    cbEnv.set(firstParam.left.name, paramType)
  }

  // Infer the body expression for concise arrow functions
  if (t.isExpression(cbFn.body)) return inferExprType(cbFn.body, cbEnv)

  // For block-body functions, use the declared return type if present
  if (cbFn.returnType) {
    return resolveType((cbFn.returnType as t.TSTypeAnnotation).typeAnnotation)
  }

  return T_ANY
}

/**
 * Infers the return type of a method call on a known stdlib type.
 * Returns null if the method is not recognized (caller falls through to generic handling).
 *
 * ECMA-262 §23 Indexed Collections, §24 Keyed Collections, §21 Text Processing
 */
function inferStdlibMethodCall(
  objType: Type,
  objNode: t.Expression | t.Super | null,
  methodName: string,
  env: TypeEnvironment,
  callArgs?: ReadonlyArray<t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder>,
): Type | null {
  // ── Array<T> methods — ECMA-262 §23.1 ──────────────────────────────────────
  if (objType.kind === 'array') {
    const elemType = (objType as ArrayType).elementType
    switch (methodName) {
      case 'push': return T_NUMBER
      case 'pop': return makeUnion(elemType, T_UNDEFINED)
      case 'shift': return makeUnion(elemType, T_UNDEFINED)
      case 'unshift': return T_NUMBER
      case 'map': {
        const cbReturnType = inferCallbackReturnType(callArgs, elemType, env)
        return { kind: 'array', elementType: cbReturnType }
      }
      case 'flatMap': {
        const cbReturnType = inferCallbackReturnType(callArgs, elemType, env)
        return { kind: 'array', elementType: cbReturnType }
      }
      case 'filter': return { kind: 'array', elementType: elemType }
      case 'reduce':
      case 'reduceRight': {
        // Infer accumulator type from initial value (second arg) if present
        const initArg = callArgs?.[1]
        if (initArg && t.isExpression(initArg)) return inferExprType(initArg, env)
        return T_ANY
      }
      case 'find': return makeUnion(elemType, T_UNDEFINED)
      case 'findIndex': return T_NUMBER
      case 'findLast': return makeUnion(elemType, T_UNDEFINED)
      case 'findLastIndex': return T_NUMBER
      case 'flat': {
        // flat() with default depth=1: unwrap one level of array nesting
        const innerType = elemType.kind === 'array' ? (elemType as ArrayType).elementType : elemType
        return { kind: 'array', elementType: innerType }
      }
      case 'at': return makeUnion(elemType, T_UNDEFINED)
      case 'includes': return T_BOOLEAN
      case 'indexOf': return T_NUMBER
      case 'lastIndexOf': return T_NUMBER
      case 'slice': return { kind: 'array', elementType: elemType }
      case 'splice': return { kind: 'array', elementType: elemType }
      case 'forEach': return T_VOID
      case 'some': return T_BOOLEAN
      case 'every': return T_BOOLEAN
      case 'sort': return { kind: 'array', elementType: elemType }
      case 'reverse': return { kind: 'array', elementType: elemType }
      case 'toSorted': return { kind: 'array', elementType: elemType }
      case 'toReversed': return { kind: 'array', elementType: elemType }
      case 'toSpliced': return { kind: 'array', elementType: elemType }
      case 'with': return { kind: 'array', elementType: elemType }
      case 'join': return T_STRING
      case 'concat': return { kind: 'array', elementType: elemType }
      case 'keys': return { kind: 'array', elementType: T_NUMBER }
      case 'values': return { kind: 'array', elementType: elemType }
      case 'entries': return { kind: 'array', elementType: { kind: 'tuple', elements: [T_NUMBER, elemType] } as TupleType }
      case 'fill': return { kind: 'array', elementType: elemType }
      case 'copyWithin': return { kind: 'array', elementType: elemType }
    }
  }

  // ── String methods — ECMA-262 §21.1 ────────────────────────────────────────
  if (objType.kind === 'string') {
    switch (methodName) {
      case 'includes':
      case 'startsWith':
      case 'endsWith': return T_BOOLEAN
      case 'indexOf':
      case 'lastIndexOf': return T_NUMBER
      case 'slice':
      case 'substring':
      case 'toLowerCase':
      case 'toUpperCase':
      case 'toLocaleLowerCase':
      case 'toLocaleUpperCase':
      case 'trim':
      case 'trimStart':
      case 'trimEnd':
      case 'padStart':
      case 'padEnd':
      case 'repeat':
      case 'replace':
      case 'replaceAll':
      case 'normalize': return T_STRING
      case 'split': return { kind: 'array', elementType: T_STRING }
      case 'match': return makeUnion({ kind: 'array', elementType: T_STRING } as ArrayType, T_NULL)
      case 'matchAll': return { kind: 'array', elementType: { kind: 'array', elementType: T_STRING } as ArrayType } as ArrayType
      case 'search': return T_NUMBER
      case 'at': return makeUnion(T_STRING, T_UNDEFINED)
      case 'charCodeAt':
      case 'codePointAt': return T_NUMBER
      case 'charAt': return T_STRING
      // ES2024 §22.1.3 — well-formed string methods
      case 'isWellFormed': return T_BOOLEAN
      case 'toWellFormed': return T_STRING
      // String.prototype.concat
      case 'concat': return T_STRING
      case 'localeCompare': return T_NUMBER
    }
  }

  // ── Promise<T> instance methods — ECMA-262 §27.2 ───────────────────────────
  if (objType.kind === 'promise') {
    switch (methodName) {
      case 'then': {
        // p.then(cb) → Promise<ReturnType of cb (from annotation or concise body)>
        const cb = callArgs?.[0]
        if (cb && t.isExpression(cb)) {
          const cbType = inferExprType(cb as t.Expression, env)
          if (cbType.kind === 'function') {
            const ret = (cbType as import('./types').FunctionType).returnType
            if (ret.kind === 'promise') return ret
            return { kind: 'promise', valueType: ret }
          }
          if ((t.isArrowFunctionExpression(cb) || t.isFunctionExpression(cb)) && (cb as t.ArrowFunctionExpression).returnType) {
            const fn = cb as t.ArrowFunctionExpression | t.FunctionExpression
            const retType = resolveType((fn.returnType as t.TSTypeAnnotation).typeAnnotation)
            if (retType.kind === 'promise') return retType
            return { kind: 'promise', valueType: retType }
          }
          // Concise arrow body: p.then(x => expr) → Promise<typeof expr>
          if (t.isArrowFunctionExpression(cb) && t.isExpression((cb as t.ArrowFunctionExpression).body)) {
            const bodyType = inferExprType((cb as t.ArrowFunctionExpression).body as t.Expression, env)
            if (bodyType.kind === 'promise') return bodyType
            return { kind: 'promise', valueType: bodyType }
          }
        }
        return { kind: 'promise', valueType: T_ANY }
      }
      case 'catch': return { kind: 'promise', valueType: T_ANY }
      case 'finally': return { kind: 'promise', valueType: (objType as PromiseType).valueType }
    }
  }

  // ── Static methods: check if obj is a known global ─────────────────────────
  if (t.isIdentifier(objNode)) {
    const globalName = (objNode as t.Identifier).name

    // Object static methods — ECMA-262 §20.1
    if (globalName === 'Object') {
      switch (methodName) {
        case 'keys': return { kind: 'array', elementType: T_STRING }
        case 'values': {
          // Object.values(obj) — infer value type from object properties if known
          const arg = callArgs?.[0]
          if (arg && t.isExpression(arg)) {
            const argType = inferExprType(arg, env)
            if (argType.kind === 'object' && (argType as ObjectType).properties.size > 0) {
              const valTypes = [...(argType as ObjectType).properties.values()]
              if (valTypes.length > 0) {
                const unified = valTypes.reduce<Type>((acc, v) => makeUnion(acc, v), valTypes[0])
                return { kind: 'array', elementType: unified }
              }
            }
          }
          return { kind: 'array', elementType: T_ANY }
        }
        case 'entries': {
          // Object.entries(obj) — return [string, V][] where V is inferred
          const arg = callArgs?.[0]
          if (arg && t.isExpression(arg)) {
            const argType = inferExprType(arg, env)
            if (argType.kind === 'object' && (argType as ObjectType).properties.size > 0) {
              const valTypes = [...(argType as ObjectType).properties.values()]
              if (valTypes.length > 0) {
                const unified = valTypes.reduce<Type>((acc, v) => makeUnion(acc, v), valTypes[0])
                return { kind: 'array', elementType: { kind: 'tuple', elements: [T_STRING, unified] } as TupleType }
              }
            }
          }
          return { kind: 'array', elementType: T_ANY }
        }
        case 'fromEntries': {
          // Object.fromEntries(entries) — infer value type from entries array
          const arg = callArgs?.[0]
          if (arg && t.isExpression(arg)) {
            const argType = inferExprType(arg as t.Expression, env)
            if (argType.kind === 'array') {
              const elemType = (argType as ArrayType).elementType
              // If entries are [string, V][] tuples, extract V
              if (elemType.kind === 'tuple' && (elemType as TupleType).elements.length >= 2) {
                const valType = (elemType as TupleType).elements[1]
                return { kind: 'object', properties: new Map(), __indexType: valType } as ObjectType & { __indexType: Type }
              }
            }
          }
          return { kind: 'object', properties: new Map() }
        }
        case 'assign': {
          // Object.assign(target, ...sources) — merge all source properties into target
          if (!callArgs || callArgs.length === 0) return T_ANY
          const targetArg = callArgs[0]
          if (!t.isExpression(targetArg)) return T_ANY
          const targetType = inferExprType(targetArg, env)
          if (targetType.kind !== 'object') return targetType
          const merged = new Map<string, Type>((targetType as ObjectType).properties)
          for (let i = 1; i < callArgs.length; i++) {
            const src = callArgs[i]
            if (!t.isExpression(src)) continue
            const srcType = inferExprType(src as t.Expression, env)
            if (srcType.kind === 'object') {
              for (const [k, v] of (srcType as ObjectType).properties) merged.set(k, v)
            }
          }
          return { kind: 'object', properties: merged } as ObjectType
        }
        case 'hasOwn': return T_BOOLEAN
        case 'create': return { kind: 'object', properties: new Map() }
        case 'freeze': {
          // Object.freeze(obj) returns the same type as its argument (Readonly<T>)
          const arg = callArgs?.[0]
          if (arg && t.isExpression(arg)) return inferExprType(arg, env)
          return T_ANY
        }
        case 'isFrozen': return T_BOOLEAN
        case 'keys_': return { kind: 'array', elementType: T_STRING }
        case 'groupBy': return { kind: 'object', properties: new Map() }
        case 'is': return T_BOOLEAN
        case 'defineProperty': return { kind: 'object', properties: new Map() }
        case 'getOwnPropertyNames': return { kind: 'array', elementType: T_STRING }
        case 'getPrototypeOf': return T_ANY
        case 'setPrototypeOf': return T_ANY
        case 'getOwnPropertyDescriptor': return T_ANY
        case 'getOwnPropertyDescriptors': return { kind: 'object', properties: new Map() }
      }
    }

    // Number static methods — ECMA-262 §21.1
    if (globalName === 'Number') {
      switch (methodName) {
        case 'isNaN':
        case 'isFinite':
        case 'isInteger':
        case 'isSafeInteger': return T_BOOLEAN
        case 'parseFloat':
        case 'parseInt': return T_NUMBER
      }
    }

    // BigInt static methods — ECMA-262 §21.2
    if (globalName === 'BigInt') {
      switch (methodName) {
        case 'asIntN': case 'asUintN': return { kind: 'bigint' }
      }
    }

    // Math static methods — ECMA-262 §21.3
    if (globalName === 'Math') {
      switch (methodName) {
        case 'abs': case 'floor': case 'ceil': case 'round': case 'trunc':
        case 'min': case 'max': case 'sqrt': case 'pow': case 'log':
        case 'log2': case 'log10': case 'exp': case 'sin': case 'cos':
        case 'tan': case 'asin': case 'acos': case 'atan': case 'atan2':
        case 'sign': case 'clz32': case 'imul': case 'fround': case 'cbrt':
        case 'hypot': case 'sinh': case 'cosh': case 'tanh': case 'expm1':
        case 'log1p': case 'random': case 'sumPrecise': case 'f16round': return T_NUMBER
      }
    }

    // Promise static methods — ECMA-262 §27.2
    if (globalName === 'Promise') {
      switch (methodName) {
        case 'resolve': {
          // Promise.resolve(v) — infer valueType from argument
          const arg = callArgs?.[0]
          if (arg && t.isExpression(arg)) {
            const argType = inferExprType(arg as t.Expression, env)
            if (argType.kind === 'promise') return argType
            return { kind: 'promise', valueType: argType }
          }
          return { kind: 'promise', valueType: T_UNDEFINED }
        }
        case 'reject': return { kind: 'promise', valueType: { kind: 'never' } }
        case 'all': {
          // Promise.all([p1, p2]) — infer array element type from input
          const arg = callArgs?.[0]
          if (arg && t.isExpression(arg)) {
            const arrType = inferExprType(arg as t.Expression, env)
            if (arrType.kind === 'array') {
              const elemType = (arrType as ArrayType).elementType
              if (elemType.kind === 'promise') return { kind: 'promise', valueType: { kind: 'array', elementType: (elemType as PromiseType).valueType } }
            }
          }
          return { kind: 'promise', valueType: { kind: 'array', elementType: T_ANY } }
        }
        case 'allSettled': {
          // Promise.allSettled([p1,p2]) → Promise<Array<{status,value,reason}>>
          const settledResult: ObjectType = { kind: 'object', properties: new Map<string, Type>([
            ['status', T_STRING], ['value', T_ANY], ['reason', T_ANY]
          ]) }
          return { kind: 'promise', valueType: { kind: 'array', elementType: settledResult } }
        }
        case 'race':
        case 'any': {
          // Promise.race/any([p1,p2]) → infer value type from first promise element
          const arg0 = callArgs?.[0]
          if (arg0 && t.isExpression(arg0)) {
            const arrType = inferExprType(arg0 as t.Expression, env)
            if (arrType.kind === 'array') {
              const elem = (arrType as ArrayType).elementType
              if (elem.kind === 'promise') return { kind: 'promise', valueType: (elem as PromiseType).valueType }
            }
          }
          return { kind: 'promise', valueType: T_ANY }
        }
        case 'withResolvers': return { kind: 'object', properties: new Map([
          ['promise', { kind: 'promise', valueType: T_ANY } as Type],
          ['resolve', { kind: 'function', params: [], returnType: T_VOID } as Type],
          ['reject', { kind: 'function', params: [], returnType: T_VOID } as Type],
        ]) }
        case 'try': return { kind: 'promise', valueType: T_ANY }
      }
    }

    // Array static methods — ECMA-262 §23.1
    if (globalName === 'Array') {
      switch (methodName) {
        case 'isArray': return T_BOOLEAN
        case 'from': {
          // Array.from(iterable, mapper?) — infer element type from mapper if present
          if (callArgs && callArgs.length >= 2) {
            const sourceArg = callArgs[0]
            const mapperArg = callArgs[1]
            let elemType: Type = T_ANY
            if (sourceArg && t.isExpression(sourceArg)) {
              const srcType = inferExprType(sourceArg as t.Expression, env)
              if (srcType.kind === 'array') elemType = (srcType as ArrayType).elementType
              else if (srcType.kind === 'generator') elemType = (srcType as GeneratorType).yieldType
              else if (srcType.kind === 'string') elemType = T_STRING
            }
            const cbRet = inferCallbackReturnType([mapperArg as any], elemType, env)
            return { kind: 'array', elementType: cbRet }
          }
          // Array.from with single iterable arg — infer element type from source
          if (callArgs && callArgs.length >= 1) {
            const sourceArg = callArgs[0]
            if (sourceArg && t.isExpression(sourceArg)) {
              const srcType = inferExprType(sourceArg as t.Expression, env)
              if (srcType.kind === 'array') return srcType
              if (srcType.kind === 'generator') return { kind: 'array', elementType: (srcType as GeneratorType).yieldType }
              if (srcType.kind === 'string') return { kind: 'array', elementType: T_STRING }
            }
          }
          return { kind: 'array', elementType: T_ANY }
        }
        case 'of': {
          // Array.of(1, 2, 3) → infer element type from arguments
          if (callArgs && callArgs.length > 0) {
            const types = callArgs
              .filter(a => t.isExpression(a))
              .map(a => inferExprType(a as t.Expression, env))
            if (types.length > 0) {
              const elemType = types.reduce<Type>((acc, v) => makeUnion(acc, v), types[0])
              return { kind: 'array', elementType: elemType }
            }
          }
          return { kind: 'array', elementType: T_ANY }
        }
        case 'fromAsync': {
          // Array.fromAsync(asyncIterable, mapFn?) → Promise<T[]> — ECMA-262 ES2024 §23.1
          if (callArgs && callArgs.length >= 1) {
            const sourceArg = callArgs[0]
            if (sourceArg && t.isExpression(sourceArg)) {
              const srcType = inferExprType(sourceArg as t.Expression, env)
              let elemType: Type = T_ANY
              if (srcType.kind === 'array') elemType = (srcType as ArrayType).elementType
              else if (srcType.kind === 'generator') elemType = (srcType as GeneratorType).yieldType
              else if (srcType.kind === 'promise') elemType = (srcType as import('./types').PromiseType).valueType
              if (callArgs.length >= 2) {
                const cbRet = inferCallbackReturnType([callArgs[1] as any], elemType, env)
                return { kind: 'promise', valueType: { kind: 'array', elementType: cbRet } }
              }
              if (elemType.kind !== 'any') return { kind: 'promise', valueType: { kind: 'array', elementType: elemType } }
            }
          }
          return { kind: 'promise', valueType: { kind: 'array', elementType: T_ANY } }
        }
      }
    }

    // String static methods — ECMA-262 §22.1
    if (globalName === 'String') {
      switch (methodName) {
        case 'raw': return T_STRING
        case 'fromCharCode': case 'fromCodePoint': return T_STRING
      }
    }

    // JSON static methods — ECMA-262 §25.5
    if (globalName === 'JSON') {
      switch (methodName) {
        case 'parse': return T_ANY
        case 'stringify': return T_STRING
        case 'rawJSON': return T_ANY        // ES2024 §25.5.x
        case 'isRawJSON': return T_BOOLEAN  // ES2024 §25.5.x
      }
    }

    // console methods — not in ECMA-262, but universally available
    if (globalName === 'console') {
      switch (methodName) {
        case 'log': case 'error': case 'warn': case 'info': case 'debug':
        case 'table': case 'dir': case 'trace': case 'group': case 'groupEnd':
        case 'groupCollapsed': case 'time': case 'timeEnd': case 'timeLog':
        case 'count': case 'countReset': case 'clear': case 'assert': return T_VOID
      }
    }

    // Error static methods — ES2025
    if (globalName === 'Error') {
      if (methodName === 'isError') return T_BOOLEAN
    }

    // RegExp static methods — ES2025 §22.2
    if (globalName === 'RegExp') {
      if (methodName === 'escape') return T_STRING
    }

    // Symbol static methods — ECMA-262 §20.4
    if (globalName === 'Symbol') {
      if (methodName === 'for' || methodName === 'keyFor') return { kind: 'symbol' }
    }

    // Date static methods — ECMA-262 §21.4
    if (globalName === 'Date') {
      if (methodName === 'now') return T_NUMBER
      if (methodName === 'parse') return T_NUMBER
      if (methodName === 'UTC') return T_NUMBER
    }

    // Map static methods
    if (globalName === 'Map') {
      if (methodName === 'groupBy') return { kind: 'object', properties: new Map() }
    }

    // Iterator static methods — ES2025
    if (globalName === 'Iterator') {
      if (methodName === 'from') {
        // Iterator.from(iterable) → Iterator<T> — infer yield type from source
        if (callArgs && callArgs.length >= 1) {
          const sourceArg = callArgs[0]
          if (sourceArg && t.isExpression(sourceArg)) {
            const srcType = inferExprType(sourceArg as t.Expression, env)
            let yieldType: Type = T_ANY
            if (srcType.kind === 'array') yieldType = (srcType as ArrayType).elementType
            else if (srcType.kind === 'generator') yieldType = (srcType as GeneratorType).yieldType
            return { kind: 'generator', yieldType, returnType: T_VOID, nextType: T_ANY, async: false } as GeneratorType
          }
        }
        return T_ANY
      }
    }

    // Reflect static methods — ECMA-262 §28.1
    if (globalName === 'Reflect') {
      switch (methodName) {
        case 'apply': return T_ANY
        case 'construct': return T_ANY
        case 'has': case 'isExtensible': case 'preventExtensions':
        case 'deleteProperty': case 'defineProperty': case 'setPrototypeOf': return T_BOOLEAN
        case 'get': return T_ANY
        case 'set': return T_BOOLEAN
        case 'ownKeys': return { kind: 'array', elementType: T_STRING }
        case 'getOwnPropertyDescriptor': return T_ANY
        case 'getPrototypeOf': return T_ANY
      }
    }

    // Atomics static methods — ECMA-262 §25.4
    if (globalName === 'Atomics') {
      switch (methodName) {
        case 'load': case 'store': case 'add': case 'sub': case 'and':
        case 'or': case 'xor': case 'exchange': case 'compareExchange': return T_NUMBER
        case 'isLockFree': return T_BOOLEAN
        case 'wait': return T_STRING
        case 'waitAsync': return { kind: 'promise', valueType: T_STRING }
        case 'notify': return T_NUMBER
        case 'pause': return T_VOID
      }
    }

    // Proxy static methods — ECMA-262 §28.2
    if (globalName === 'Proxy') {
      if (methodName === 'revocable') return { kind: 'object', properties: new Map<string, Type>([
        ['proxy', T_ANY], ['revoke', { kind: 'function', params: [], returnType: T_VOID } as Type],
      ]) }
    }

    // URL static methods
    if (globalName === 'URL') {
      if (methodName === 'canParse') return T_BOOLEAN
      if (methodName === 'parse') return makeUnion({ kind: 'object', brand: 'URL', properties: new Map() }, T_NULL)
    }

    // ArrayBuffer static methods
    if (globalName === 'ArrayBuffer') {
      if (methodName === 'isView') return T_BOOLEAN
    }

    // TextEncoder / TextDecoder static
    if (globalName === 'TextEncoder' || globalName === 'TextDecoder') {
      // No common static methods
    }
  }

  // ── Map<K,V> instance methods — ECMA-262 §24.1 ─────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'Map') {
    const o = objType as ObjectType
    const K = o.mapKeyType ?? T_ANY
    const V = o.mapValueType ?? T_ANY
    switch (methodName) {
      case 'get':    return makeUnion(V, T_UNDEFINED)
      case 'set':    return objType
      case 'has':    return T_BOOLEAN
      case 'delete': return T_BOOLEAN
      case 'clear':  return T_VOID
      case 'forEach': return T_VOID
      case 'keys':    return { kind: 'array', elementType: K }
      case 'values':  return { kind: 'array', elementType: V }
      case 'entries': return { kind: 'array', elementType: { kind: 'tuple', elements: [K, V] } as TupleType }
    }
  }

  // ── Set<T> instance methods — ECMA-262 §24.2 ───────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'Set') {
    const SE = (objType as ObjectType & { setElementType?: Type }).setElementType ?? T_ANY
    switch (methodName) {
      case 'add':    return objType
      case 'has':    return T_BOOLEAN
      case 'delete': return T_BOOLEAN
      case 'clear':  return T_VOID
      case 'forEach': return T_VOID
      case 'keys':    return { kind: 'array', elementType: SE }
      case 'values':  return { kind: 'array', elementType: SE }
      case 'entries': return { kind: 'array', elementType: { kind: 'tuple', elements: [SE, SE] } as TupleType }
      // ES2025 Set methods
      case 'union': case 'intersection': case 'difference': case 'symmetricDifference': return objType
      case 'isSubsetOf': case 'isSupersetOf': case 'isDisjointFrom': return T_BOOLEAN
    }
  }

  // ── WeakMap<K,V> instance methods — ECMA-262 §24.3 ─────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'WeakMap') {
    const o = objType as ObjectType
    const V = o.mapValueType ?? T_ANY
    switch (methodName) {
      case 'get':    return makeUnion(V, T_UNDEFINED)
      case 'set':    return objType
      case 'has':    return T_BOOLEAN
      case 'delete': return T_BOOLEAN
    }
  }

  // ── WeakSet<T> instance methods — ECMA-262 §24.4 ───────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'WeakSet') {
    switch (methodName) {
      case 'add':    return objType
      case 'has':    return T_BOOLEAN
      case 'delete': return T_BOOLEAN
    }
  }

  // ── WeakRef<T> instance method — ECMA-262 §26.1 ────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'WeakRef') {
    const o = objType as ObjectType
    if (methodName === 'deref') return makeUnion(o.weakRefType ?? T_ANY, T_UNDEFINED)
  }

  // ── Date instance methods — ECMA-262 §21.4 ─────────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'Date') {
    switch (methodName) {
      case 'getFullYear': case 'getMonth': case 'getDate': case 'getDay':
      case 'getHours': case 'getMinutes': case 'getSeconds': case 'getMilliseconds':
      case 'getTime': case 'getTimezoneOffset':
      case 'getUTCFullYear': case 'getUTCMonth': case 'getUTCDate': case 'getUTCDay':
      case 'getUTCHours': case 'getUTCMinutes': case 'getUTCSeconds': case 'getUTCMilliseconds':
      case 'setTime': case 'setFullYear': case 'setMonth': case 'setDate':
      case 'setHours': case 'setMinutes': case 'setSeconds': case 'setMilliseconds':
        return T_NUMBER
      case 'toString': case 'toDateString': case 'toTimeString':
      case 'toISOString': case 'toUTCString': case 'toLocaleDateString':
      case 'toLocaleTimeString': case 'toLocaleString': case 'toJSON':
        return T_STRING
      case 'valueOf': return T_NUMBER
    }
  }

  // ── RegExp instance methods — ECMA-262 §22.2 ───────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'RegExp') {
    switch (methodName) {
      case 'test': return T_BOOLEAN
      case 'exec': return makeUnion(
        { kind: 'array', elementType: T_STRING } as ArrayType,  // RegExpExecArray (string[] with extra props)
        T_NULL
      )
      case 'toString': return T_STRING
    }
  }

  // ── Typed Array instance methods — ECMA-262 §23.2 ──────────────────────────
  const TYPED_ARRAY_BRANDS = new Set([
    'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
    'Uint8ClampedArray', 'Float32Array', 'Float64Array', 'Float16Array',
    'BigInt64Array', 'BigUint64Array',
  ])
  if (objType.kind === 'object' && TYPED_ARRAY_BRANDS.has((objType as ObjectType).brand ?? '')) {
    const isBigInt = (objType as ObjectType).brand?.startsWith('BigInt') || (objType as ObjectType).brand?.startsWith('BigUint')
    const elemType: Type = isBigInt ? { kind: 'bigint' } : T_NUMBER
    switch (methodName) {
      case 'set': return T_VOID
      case 'slice': case 'subarray': return objType
      case 'fill': return objType
      case 'copyWithin': return objType
      case 'indexOf': case 'lastIndexOf': return T_NUMBER
      case 'includes': return T_BOOLEAN
      case 'join': return T_STRING
      case 'reverse': return objType
      case 'sort': return objType
      case 'map': return { kind: 'object', brand: (objType as ObjectType).brand, properties: (objType as ObjectType).properties }
      case 'filter': return objType
      case 'forEach': return T_VOID
      case 'find': return makeUnion(elemType, T_UNDEFINED)
      case 'findIndex': return T_NUMBER
      case 'findLast': return makeUnion(elemType, T_UNDEFINED)
      case 'findLastIndex': return T_NUMBER
      case 'some': case 'every': return T_BOOLEAN
      case 'reduce': case 'reduceRight': return T_ANY
      case 'keys': case 'values': case 'entries': return T_ANY
      case 'at': return makeUnion(elemType, T_UNDEFINED)
      case 'toReversed': case 'toSorted': return objType
      case 'with': return objType
    }
  }

  // ── FinalizationRegistry methods ─────────────────────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'FinalizationRegistry') {
    switch (methodName) {
      case 'register': return T_VOID
      case 'unregister': return T_BOOLEAN
    }
  }

  // ── AbortController / AbortSignal methods ────────────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'AbortController') {
    if (methodName === 'abort') return T_VOID
  }
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'AbortSignal') {
    if (methodName === 'throwIfAborted') return T_VOID
    if (methodName === 'addEventListener' || methodName === 'removeEventListener') return T_VOID
  }

  // ── DataView methods — ECMA-262 §25.3 ────────────────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'DataView') {
    if (methodName.startsWith('get')) return T_NUMBER
    if (methodName.startsWith('set')) return T_VOID
  }

  // ── ArrayBuffer / SharedArrayBuffer methods ─────────────────────────────────
  if (objType.kind === 'object' && ((objType as ObjectType).brand === 'ArrayBuffer' || (objType as ObjectType).brand === 'SharedArrayBuffer')) {
    switch (methodName) {
      case 'slice': return objType
      case 'transfer': case 'transferToFixedLength': return objType
      case 'resize': return T_VOID
    }
  }

  // ── TextEncoder / TextDecoder methods ────────────────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'TextEncoder') {
    if (methodName === 'encode') return { kind: 'object', brand: 'Uint8Array', properties: new Map<string, Type>([['length', T_NUMBER]]) }
    if (methodName === 'encodeInto') return { kind: 'object', properties: new Map<string, Type>([['read', T_NUMBER], ['written', T_NUMBER]]) }
  }
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'TextDecoder') {
    if (methodName === 'decode') return T_STRING
  }

  // ── URLSearchParams methods ───────────────────────────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'URLSearchParams') {
    switch (methodName) {
      case 'get': return makeUnion(T_STRING, T_NULL)
      case 'getAll': return { kind: 'array', elementType: T_STRING }
      case 'has': return T_BOOLEAN
      case 'set': case 'append': case 'delete': return T_VOID
      case 'toString': return T_STRING
      case 'keys': return { kind: 'array', elementType: T_STRING }
      case 'values': return { kind: 'array', elementType: T_STRING }
      case 'entries': return { kind: 'array', elementType: { kind: 'tuple', elements: [T_STRING, T_STRING] } as TupleType }
      case 'forEach': return T_VOID
    }
  }

  // ── URL instance methods ──────────────────────────────────────────────────────
  if (objType.kind === 'object' && (objType as ObjectType).brand === 'URL') {
    if (methodName === 'toString' || methodName === 'toJSON') return T_STRING
  }

  // ── Generator/Iterator instance methods — ECMA-262 §27.5, ES2025 Iterator helpers ──
  if (objType.kind === 'generator') {
    const gen = objType as GeneratorType
    switch (methodName) {
      case 'next': return { kind: 'object', properties: new Map<string, Type>([
        ['value', makeUnion(gen.yieldType, gen.returnType)],
        ['done', T_BOOLEAN],
      ]) }
      case 'return': return { kind: 'object', properties: new Map<string, Type>([
        ['value', T_ANY], ['done', T_BOOLEAN],
      ]) }
      case 'throw': return { kind: 'object', properties: new Map<string, Type>([
        ['value', T_ANY], ['done', T_BOOLEAN],
      ]) }
      // ES2025 Iterator helpers
      case 'map': {
        const cbRet = inferCallbackReturnType(callArgs, gen.yieldType, env)
        return { kind: 'generator', yieldType: cbRet, returnType: T_VOID, nextType: T_ANY, async: gen.async } as GeneratorType
      }
      case 'filter': return { kind: 'generator', yieldType: gen.yieldType, returnType: T_VOID, nextType: T_ANY, async: gen.async } as GeneratorType
      case 'take': case 'drop': return { kind: 'generator', yieldType: gen.yieldType, returnType: T_VOID, nextType: T_ANY, async: gen.async } as GeneratorType
      case 'flatMap': return { kind: 'generator', yieldType: T_ANY, returnType: T_VOID, nextType: T_ANY, async: gen.async } as GeneratorType
      case 'toArray': return { kind: 'array', elementType: gen.yieldType }
      case 'forEach': return T_VOID
      case 'some': case 'every': return T_BOOLEAN
      case 'find': return makeUnion(gen.yieldType, T_UNDEFINED)
      case 'reduce': return T_ANY
    }
  }

  // ── Number instance methods — ECMA-262 §21.1 ─────────────────────────────────
  if (objType.kind === 'number') {
    switch (methodName) {
      case 'toFixed': case 'toPrecision': case 'toExponential':
      case 'toString': case 'toLocaleString': return T_STRING
      case 'valueOf': return T_NUMBER
    }
  }

  // ── BigInt instance methods — ECMA-262 §21.2 ─────────────────────────────────
  if (objType.kind === 'bigint') {
    switch (methodName) {
      case 'toString': case 'toLocaleString': return T_STRING
      case 'valueOf': return { kind: 'bigint' }
    }
  }

  // ── Function instance methods — ECMA-262 §20.2 ───────────────────────────────
  if (objType.kind === 'function') {
    switch (methodName) {
      case 'call': case 'apply': return T_ANY
      case 'bind': return { kind: 'function', params: [], returnType: T_ANY } as import('./types').FunctionType
      case 'toString': return T_STRING
    }
  }

  // ── Object-type method resolution ───────────────────────────────────────────
  if (objType.kind === 'object') {
    const methodType = (objType as ObjectType).properties.get(methodName)
    if (methodType?.kind === 'function') return (methodType as FunctionType).returnType
    // Object.prototype methods available on all objects — ECMA-262 §20.1.3
    switch (methodName) {
      case 'hasOwnProperty': case 'isPrototypeOf': case 'propertyIsEnumerable': return T_BOOLEAN
      case 'toString': case 'toLocaleString': return T_STRING
      case 'valueOf': return T_ANY
    }
  }

  return null
}

/**
 * Infers the type of a static property access on a known stdlib object.
 * Returns null if not recognized.
 */
function inferStdlibProp(objType: Type, objNode: t.Expression | t.Super | null, propName: string): Type | null {
  // Array.length, String.length
  if (propName === 'length' && (objType.kind === 'array' || objType.kind === 'string')) return T_NUMBER
  // Symbol.prototype.description — ES2019 §20.4.3.2
  if (propName === 'description' && objType.kind === 'symbol') return makeUnion(T_STRING, T_UNDEFINED)
  // Array.at() — property access (not call)
  if (propName === 'at' && objType.kind === 'array') {
    return makeUnion((objType as ArrayType).elementType, T_UNDEFINED)
  }

  // Map/Set instance properties
  if (propName === 'size' && t.isIdentifier(objNode)) return T_NUMBER

  // Static properties on globals
  if (t.isIdentifier(objNode)) {
    const globalName = (objNode as t.Identifier).name

    if (globalName === 'Math') {
      if (propName === 'PI' || propName === 'E' || propName === 'LN2' ||
          propName === 'LN10' || propName === 'LOG2E' || propName === 'LOG10E' ||
          propName === 'SQRT2') return T_NUMBER
    }

    if (globalName === 'Number') {
      if (propName === 'MAX_VALUE' || propName === 'MIN_VALUE' ||
          propName === 'POSITIVE_INFINITY' || propName === 'NEGATIVE_INFINITY' ||
          propName === 'NaN' || propName === 'EPSILON' ||
          propName === 'MAX_SAFE_INTEGER' || propName === 'MIN_SAFE_INTEGER') return T_NUMBER
      if (propName === 'isNaN' || propName === 'isFinite' || propName === 'isInteger' ||
          propName === 'isSafeInteger') return { kind: 'function', params: [], returnType: T_BOOLEAN }
    }

    if (globalName === 'Symbol') {
      if (propName === 'iterator' || propName === 'asyncIterator' ||
          propName === 'toPrimitive' || propName === 'toStringTag' ||
          propName === 'species' || propName === 'hasInstance') return { kind: 'symbol' }
    }
  }

  // Typed array length/buffer properties
  const TYPED_ARRAY_BRANDS_2 = new Set([
    'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
    'Uint8ClampedArray', 'Float32Array', 'Float64Array', 'Float16Array',
    'BigInt64Array', 'BigUint64Array',
  ])
  if (objType.kind === 'object' && TYPED_ARRAY_BRANDS_2.has((objType as ObjectType).brand ?? '')) {
    if (propName === 'length' || propName === 'byteLength' || propName === 'byteOffset' || propName === 'BYTES_PER_ELEMENT') return T_NUMBER
    if (propName === 'buffer') return T_ANY
  }

  return null
}

// ── Infer: Expression → Type (synthesis / bottom-up) ─────────────────────────

/**
 * Infers the type of a value-producing expression.
 *
 * Literal types follow ECMAScript §6.1.* classification of primitive values.
 * Unannotated/unknown expressions return `any` (gradual typing).
 *
 * ECMA-262 §12 — ECMAScript Language: Expressions
 * https://tc39.es/ecma262/#sec-ecmascript-language-expressions
 */
function inferExprType(node: t.Expression | null | undefined, env: TypeEnvironment): Type {
  if (!node) return T_ANY

  switch (node.type) {
    // String literal — ECMA-262 §6.1.4
    case 'StringLiteral':
    case 'TemplateLiteral':
      return T_STRING

    // Numeric literal — ECMA-262 §6.1.6.1
    case 'NumericLiteral':
      return T_NUMBER

    // BigInt literal — ECMA-262 §6.1.6.2
    case 'BigIntLiteral':
      return { kind: 'bigint' }

    // Boolean literal — ECMA-262 §6.1.3
    case 'BooleanLiteral':
      return T_BOOLEAN

    // null literal — ECMA-262 §6.1.2
    case 'NullLiteral':
      return T_NULL

    // RegExp literal — /pattern/flags — ECMA-262 §13.2.8
    case 'RegExpLiteral':
      return { kind: 'object', brand: 'RegExp', properties: new Map([
        ['source', T_STRING as Type], ['flags', T_STRING as Type],
        ['global', T_BOOLEAN as Type], ['ignoreCase', T_BOOLEAN as Type],
        ['multiline', T_BOOLEAN as Type], ['lastIndex', T_NUMBER as Type],
      ]) }

    // Identifier — look up in type environment
    case 'Identifier': {
      if (node.name === 'undefined') return T_UNDEFINED
      return env.get(node.name) ?? T_ANY
    }

    // ThisExpression — return the class's field object type if inside a method
    case 'ThisExpression':
      return env.get('this') ?? T_ANY

    // Super expression — parent class reference — ECMA-262 §13.3.7
    case 'Super':
      return T_ANY

    // Binary expression — ECMA-262 §13.15
    case 'BinaryExpression': {
      // #field in obj — ES2022 brand check — ECMA-262 §13.5.6
      // PrivateName left operand means this is a brand check; result is boolean.
      if ((node as t.BinaryExpression).operator === 'in' && t.isPrivateName((node as t.BinaryExpression).left)) {
        return T_BOOLEAN
      }
      if (!t.isExpression(node.left)) return T_ANY
      const left  = inferExprType(node.left,  env)
      const right = inferExprType(node.right, env)
      return inferBinaryType(node.operator, left, right)
    }

    // Logical expression — ECMA-262 §13.13
    // &&  : short-circuits on falsy left — result is left-or-right union (conservative)
    // ||  : short-circuits on truthy left — result is left-or-right union
    // ??  : nullish coalescing — strips null/undefined from left, unions with right
    case 'LogicalExpression': {
      const left  = inferExprType(node.left,  env)
      const right = inferExprType(node.right, env)
      if (node.operator === '??') {
        // `a ?? b`: when a is null/undefined use b, otherwise a
        // Result type: non-nullable part of a, unioned with b's type
        return makeUnion(stripNullable(left), right)
      }
      // `a && b` and `a || b`: either side may be returned
      return makeUnion(left, right)
    }

    // Conditional (ternary) expression — ECMA-262 §13.14
    // `cond ? a : b` → union of types of a and b
    case 'ConditionalExpression': {
      const consequent = inferExprType(node.consequent, env)
      const alternate  = inferExprType(node.alternate,  env)
      return makeUnion(consequent, alternate)
    }

    // Array literal — ECMA-262 §13.2.4 Array Initializer
    // If all elements share the same type T, infer Array<T>; otherwise Array<any>.
    case 'ArrayExpression': {
      if (node.elements.length === 0) return { kind: 'array', elementType: T_ANY }
      const elTypes = node.elements.map(el => {
        if (!el) return T_ANY
        if (t.isSpreadElement(el)) {
          // Spread in array: [...arr] — element type comes from the spread source
          const spreadType = inferExprType(el.argument as t.Expression, env)
          if (spreadType.kind === 'array') return (spreadType as ArrayType).elementType
          if (spreadType.kind === 'string') return T_STRING
          return T_ANY
        }
        return t.isExpression(el) ? inferExprType(el, env) : T_ANY
      })
      const firstKind = elTypes[0].kind
      const allSame = elTypes.every(et => et.kind === firstKind)
      return { kind: 'array', elementType: allSame ? elTypes[0] : T_ANY } satisfies ArrayType
    }

    // Unary expression — ECMA-262 §13.5 Unary Operators
    case 'UnaryExpression': {
      const operand = inferExprType(node.argument as t.Expression, env)
      switch (node.operator) {
        case 'typeof': return T_STRING
        case '!':      return T_BOOLEAN
        case 'void':   return T_UNDEFINED
        case '-':
        case '+':
          if (operand.kind === 'bigint') return { kind: 'bigint' }
          return T_NUMBER
        case '~':      return T_NUMBER
        case 'delete': return T_BOOLEAN  // §13.5.1 delete operator always returns boolean
        default:       return T_ANY
      }
    }

    // Optional member expression — ECMA-262 §13.5.1 Optional Chains
    // `obj?.prop` → T | undefined where T is the property type on non-null obj.
    // When obj is `any`, the result is `any` (gradual).
    case 'OptionalMemberExpression': {
      const objType = inferExprType(
        t.isExpression(node.object) ? node.object : null, env
      )
      if (objType.kind === 'any') return T_ANY  // gradual: any?.x is any

      const propName = !node.computed && t.isIdentifier(node.property)
        ? node.property.name
        : null

      let propType: Type = T_ANY
      if (propName && objType.kind === 'object') {
        propType = (objType as ObjectType).properties.get(propName) ?? T_ANY
      }
      // `?.` always adds undefined to the result (short-circuits to undefined when nullish)
      return makeUnion(propType, T_UNDEFINED)
    }

    // Object literal — ECMA-262 §13.2.5 Object Initializer
    // Build ObjectType with properties map from key → inferred value type.
    // Spread elements ({ ...src }) merge source properties into this object.
    case 'ObjectExpression': {
      const properties = new Map<string, Type>()
      for (const prop of node.properties) {
        // Spread element: { ...src } — merge src's properties
        if (t.isSpreadElement(prop)) {
          const spreadType = inferExprType(prop.argument as t.Expression, env)
          if (spreadType.kind === 'object') {
            for (const [k, v] of (spreadType as ObjectType).properties) {
              properties.set(k, v)
            }
          }
          continue
        }
        // Shorthand method: { foo() {}, get bar() {} } — ECMA-262 §13.2.5
        if (t.isObjectMethod(prop)) {
          let key: string | null = null
          // For computed keys [expr], only resolve literal expressions
          if (prop.computed) {
            if (t.isStringLiteral(prop.key)) key = (prop.key as t.StringLiteral).value
            else if (t.isNumericLiteral(prop.key)) key = String((prop.key as t.NumericLiteral).value)
          } else {
            if (t.isIdentifier(prop.key)) key = (prop.key as t.Identifier).name
            else if (t.isStringLiteral(prop.key)) key = (prop.key as t.StringLiteral).value
          }
          if (!key) continue
          const retAnn = prop.returnType
          const retType = retAnn ? resolveType((retAnn as t.TSTypeAnnotation).typeAnnotation) : T_ANY
          const params = prop.params.map(p => ({
            name: t.isIdentifier(p) ? p.name : '_',
            type: t.isIdentifier(p) && p.typeAnnotation
              ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation) : T_ANY,
            optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
          }))
          if (prop.kind === 'get') {
            properties.set(key, retType)
          } else {
            properties.set(key, { kind: 'function', params, returnType: retType } as import('./types').FunctionType)
          }
          continue
        }
        if (!t.isObjectProperty(prop)) continue
        const op = prop as t.ObjectProperty
        let key: string | null = null
        if (op.computed) {
          // Computed key [expr] — only resolvable when expr is a literal
          if (t.isStringLiteral(op.key)) key = (op.key as t.StringLiteral).value
          else if (t.isNumericLiteral(op.key)) key = String((op.key as t.NumericLiteral).value)
          else if (t.isTemplateLiteral(op.key) && (op.key as t.TemplateLiteral).expressions.length === 0)
            key = (op.key as t.TemplateLiteral).quasis[0].value.cooked ?? null
          // Dynamic computed key: set __indexType on the result object
          if (!key) {
            const dynValType = t.isExpression(op.value) ? inferExprType(op.value as t.Expression, env) : T_ANY
            ;(properties as any).__indexType = dynValType
            continue
          }
        } else {
          if (t.isIdentifier(op.key)) key = (op.key as t.Identifier).name
          else if (t.isStringLiteral(op.key)) key = (op.key as t.StringLiteral).value
          else if (t.isNumericLiteral(op.key)) key = String((op.key as t.NumericLiteral).value)
        }
        if (!key) continue
        const valType = t.isExpression(prop.value)
          ? inferExprType(prop.value, env)
          : T_ANY
        properties.set(key, valType)
      }
      return { kind: 'object', properties } satisfies ObjectType
    }

    // Member expression — ECMA-262 §13.3.2 Property Accessors
    // Computed access (arr[i]): if object is ArrayType, return elementType.
    // Static access (obj.prop): look up property in ObjectType; `length` on arrays.
    case 'MemberExpression': {
      const objType = inferExprType(
        t.isExpression(node.object) ? node.object : null, env
      )
      if (node.computed) {
        // Tuple index access: tuple[0] → element type at index 0
        if (objType.kind === 'tuple') {
          if (t.isNumericLiteral(node.property)) {
            const idx = node.property.value
            return (objType as import('./types').TupleType).elements[idx] ?? T_ANY
          }
          return T_ANY
        }
        if (objType.kind === 'array') return (objType as ArrayType).elementType
        if (objType.kind === 'string') return T_STRING
        // Computed string literal key: obj['propName'] → look up property
        if (objType.kind === 'object') {
          if (t.isStringLiteral(node.property)) {
            const key = (node.property as t.StringLiteral).value
            const propType = (objType as ObjectType).properties.get(key)
            if (propType !== undefined) return propType
          }
          // Index signature lookup
          if ((objType as any).__indexType) return (objType as any).__indexType as Type
          return T_ANY
        }
        return T_ANY
      }
      // Static property access — including private names (#field)
      const propName = t.isIdentifier(node.property) ? node.property.name
        : t.isPrivateName(node.property) ? '#' + (node.property as t.PrivateName).id.name
        : null
      if (!propName) return T_ANY

      // Tuple length
      if (propName === 'length' && objType.kind === 'tuple') return T_NUMBER

      // Stdlib property inference
      const stdlibProp = inferStdlibProp(objType, node.object, propName)
      if (stdlibProp !== null) return stdlibProp

      if (objType.kind === 'object') {
        const propType = (objType as ObjectType).properties.get(propName)
        if (propType !== undefined) return propType
        // Try index signature
        if ((objType as any).__indexType) return (objType as any).__indexType as Type
        return T_ANY
      }
      return T_ANY
    }

    // Arrow function — ECMA-262 §15.3 (arrow function definitions)
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
      return {
        kind: 'function',
        params,
        returnType: resolveType(returnAnnotation),
      } satisfies FunctionType
    }

    // Call expression — infer return type of callee — ECMA-262 §13.3.5
    // For method calls (obj.method()), look up the method type on the object.
    // For direct calls (fn()), look up in env. Falls back to `any` (gradual).
    case 'CallExpression': {
      if (t.isMemberExpression(node.callee) && !node.callee.computed) {
        const callee = node.callee
        const objNode = t.isExpression(callee.object) ? callee.object : null
        const objType = inferExprType(objNode, env)
        const propName = t.isIdentifier(callee.property) ? callee.property.name : null
        if (propName) {
          const stdlibResult = inferStdlibMethodCall(objType, callee.object, propName, env, node.arguments)
          if (stdlibResult !== null) return stdlibResult
        }
      }
      // Computed method call: obj[Symbol.iterator]() / obj[Symbol.asyncIterator]()
      // ECMA-262 §27.1 — well-known symbols §6.1.5.1
      if (t.isMemberExpression(node.callee) && node.callee.computed) {
        const callee = node.callee as t.MemberExpression
        const prop = callee.property
        if (t.isMemberExpression(prop) && !prop.computed
            && t.isIdentifier(prop.object) && (prop.object as t.Identifier).name === 'Symbol'
            && t.isIdentifier(prop.property)) {
          const symName = (prop.property as t.Identifier).name
          if (symName === 'iterator' || symName === 'asyncIterator') {
            const isAsync = symName === 'asyncIterator'
            const objType = inferExprType(t.isExpression(callee.object) ? callee.object as t.Expression : null, env)
            if (objType.kind === 'array') {
              return { kind: 'generator', yieldType: (objType as ArrayType).elementType, returnType: T_VOID, nextType: T_ANY, async: isAsync } as GeneratorType
            }
            if (objType.kind === 'generator') return objType
            if (objType.kind === 'string') {
              return { kind: 'generator', yieldType: T_STRING, returnType: T_VOID, nextType: T_ANY, async: false } as GeneratorType
            }
            if (objType.kind === 'object') {
              const brand = (objType as any).brand
              if (brand === 'Map') {
                const kT = (objType as any).mapKeyType as Type ?? T_ANY
                const vT = (objType as any).mapValueType as Type ?? T_ANY
                return { kind: 'generator', yieldType: { kind: 'tuple', elements: [kT, vT] } as TupleType, returnType: T_VOID, nextType: T_ANY, async: isAsync } as GeneratorType
              }
              if (brand === 'Set') {
                const eT = (objType as any).setElementType as Type ?? T_ANY
                return { kind: 'generator', yieldType: eT, returnType: T_VOID, nextType: T_ANY, async: isAsync } as GeneratorType
              }
              if (brand === 'URLSearchParams') {
                return { kind: 'generator', yieldType: { kind: 'tuple', elements: [T_STRING, T_STRING] } as TupleType, returnType: T_VOID, nextType: T_ANY, async: false } as GeneratorType
              }
            }
          }
        }
      }
      if (t.isIdentifier(node.callee)) {
        const fnType = env.get(node.callee.name)
        if (fnType?.kind === 'function') {
          const ft = fnType as FunctionType
          // Generic type parameter instantiation: match arg types against param types
          if (ft.returnType.kind === 'typeParam') {
            const subst = new Map<string, Type>()
            for (let i = 0; i < ft.params.length; i++) {
              const param = ft.params[i]
              const arg = node.arguments[i]
              if (!arg || !t.isExpression(arg)) continue
              if (param.type.kind === 'typeParam') {
                const argType = inferExprType(arg as t.Expression, env)
                if (argType.kind !== 'any') subst.set((param.type as import('./types').TypeParamType).name, argType)
              }
            }
            if (subst.size > 0) {
              const tpName = (ft.returnType as import('./types').TypeParamType).name
              const resolved = subst.get(tpName)
              if (resolved) return resolved
            }
          }
          return ft.returnType
        }
        // Known global functions — ECMA-262 §19.2
        switch (node.callee.name) {
          case 'decodeURI': case 'encodeURI':
          case 'decodeURIComponent': case 'encodeURIComponent': return T_STRING
          case 'structuredClone': return T_ANY
          case 'queueMicrotask': return T_VOID
          case 'parseInt': case 'parseFloat': return T_NUMBER
          case 'isNaN': case 'isFinite': return T_BOOLEAN
          case 'String': return T_STRING
          case 'Number': return T_NUMBER
          case 'Boolean': return T_BOOLEAN
        }
      }
      // AwaitExpression unwraps Promise<T> — handled separately but also here for nested calls
      return T_ANY
    }

    // OptionalCallExpression — obj?.method() — ECMA-262 §13.5.1
    case 'OptionalCallExpression': {
      const oce = node as t.OptionalCallExpression
      if (t.isMemberExpression(oce.callee) && !oce.callee.computed) {
        const callee = oce.callee as t.MemberExpression
        const objType = inferExprType(t.isExpression(callee.object) ? callee.object : null, env)
        const propName = t.isIdentifier(callee.property) ? callee.property.name : null
        if (propName) {
          const result = inferStdlibMethodCall(objType, callee.object, propName, env, oce.arguments)
          if (result !== null) return makeUnion(result, T_UNDEFINED)
        }
      }
      if (t.isIdentifier(oce.callee)) {
        const fnType = env.get((oce.callee as t.Identifier).name)
        if (fnType?.kind === 'function') return makeUnion((fnType as import('./types').FunctionType).returnType, T_UNDEFINED)
      }
      return T_ANY
    }

    // Await expression — ECMA-262 §15.10.4 Await
    case 'AwaitExpression': {
      const argType = inferExprType(node.argument, env)
      if (argType.kind === 'promise') return (argType as PromiseType).valueType
      return argType  // non-promise await returns the value as-is
    }

    // Update expression (++/--) — ECMA-262 §13.4
    case 'UpdateExpression': {
      const operandType = inferExprType(node.argument as t.Expression, env)
      if (operandType.kind === 'bigint') return { kind: 'bigint' }
      return T_NUMBER
    }

    // New expression — ECMA-262 §13.3.5.1
    case 'NewExpression': {
      if (t.isIdentifier(node.callee)) {
        const name = (node.callee as t.Identifier).name
        switch (name) {
          case 'Map': {
            // new Map(entries?) — infer key/value types from entries array if provided
            const mapArg = node.arguments?.[0]
            if (mapArg && t.isExpression(mapArg)) {
              const argType = inferExprType(mapArg as t.Expression, env)
              if (argType.kind === 'array') {
                const elem = (argType as ArrayType).elementType
                if (elem.kind === 'tuple' && (elem as TupleType).elements.length >= 2) {
                  const K = (elem as TupleType).elements[0]
                  const V = (elem as TupleType).elements[1]
                  return { kind: 'object', brand: 'Map', mapKeyType: K, mapValueType: V, properties: new Map([['size', T_NUMBER as Type]]) }
                }
              }
            }
            return { kind: 'object', brand: 'Map', mapKeyType: T_ANY, mapValueType: T_ANY, properties: new Map([['size', T_NUMBER as Type]]) }
          }
          case 'Set': {
            // new Set(values?) — infer element type from values array if provided
            const setArg = node.arguments?.[0]
            if (setArg && t.isExpression(setArg)) {
              const argType = inferExprType(setArg as t.Expression, env)
              if (argType.kind === 'array') {
                const elemType = (argType as ArrayType).elementType
                return { kind: 'object', brand: 'Set', setElementType: elemType, properties: new Map([['size', T_NUMBER as Type]]) }
              }
            }
            return { kind: 'object', brand: 'Set', setElementType: T_ANY, properties: new Map([['size', T_NUMBER as Type]]) }
          }
          case 'WeakMap': return { kind: 'object', brand: 'WeakMap', mapKeyType: T_ANY, mapValueType: T_ANY, properties: new Map() }
          case 'WeakSet': return { kind: 'object', brand: 'WeakSet', setElementType: T_ANY, properties: new Map() }
          case 'WeakRef': {
            const refArg = node.arguments?.[0]
            const refType = (refArg && t.isExpression(refArg)) ? inferExprType(refArg as t.Expression, env) : T_ANY
            return { kind: 'object', brand: 'WeakRef', weakRefType: refType, properties: new Map() }
          }
          case 'Error': case 'TypeError': case 'RangeError':
          case 'SyntaxError': case 'ReferenceError':
          case 'EvalError': case 'URIError':
          case 'AggregateError': case 'SuppressedError':
            return { kind: 'object', brand: 'Error', properties: new Map([
              ['message', T_STRING as Type],
              ['stack', makeUnion(T_STRING, T_UNDEFINED) as Type],
              ['cause', T_ANY as Type],
            ]) }
          case 'Promise': {
            // new Promise<T>() — use type argument if present
            const typeArgs = (node as t.NewExpression).typeParameters?.params
            if (typeArgs && typeArgs.length > 0) {
              const resolvedT = resolveType(typeArgs[0])
              return { kind: 'promise', valueType: resolvedT }
            }
            // new Promise((resolve) => resolve(expr)) — infer from resolve argument type
            const execArg = node.arguments?.[0]
            if (execArg && (t.isArrowFunctionExpression(execArg) || t.isFunctionExpression(execArg))) {
              const fn = execArg as t.ArrowFunctionExpression | t.FunctionExpression
              const resolveParam = fn.params?.[0]
              if (resolveParam && t.isIdentifier(resolveParam) && (resolveParam as t.Identifier).typeAnnotation) {
                const paramType = resolveType(((resolveParam as t.Identifier).typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
                if (paramType.kind === 'function') {
                  const innerType = (paramType as import('./types').FunctionType).params[0]?.type ?? T_ANY
                  return { kind: 'promise', valueType: innerType }
                }
              }
            }
            return { kind: 'promise', valueType: T_ANY }
          }
          case 'Date': return { kind: 'object', brand: 'Date', properties: new Map() }
          case 'RegExp': return { kind: 'object', brand: 'RegExp', properties: new Map([
            ['source', T_STRING as Type], ['flags', T_STRING as Type],
            ['global', T_BOOLEAN as Type], ['ignoreCase', T_BOOLEAN as Type],
            ['multiline', T_BOOLEAN as Type], ['lastIndex', T_NUMBER as Type],
          ]) }
          case 'URL': return { kind: 'object', brand: 'URL', properties: new Map<string, Type>([
            ['href', T_STRING], ['hostname', T_STRING], ['pathname', T_STRING],
            ['search', T_STRING], ['hash', T_STRING], ['origin', T_STRING],
            ['protocol', T_STRING], ['port', T_STRING], ['host', T_STRING],
            ['username', T_STRING], ['password', T_STRING],
            ['searchParams', T_ANY],
          ]) }
          // Typed arrays — ECMA-262 §23.2
          case 'Int8Array': case 'Uint8Array': case 'Int16Array': case 'Uint16Array':
          case 'Int32Array': case 'Uint32Array': case 'Uint8ClampedArray':
          case 'Float32Array': case 'Float64Array': case 'Float16Array':
          case 'BigInt64Array': case 'BigUint64Array':
            return { kind: 'object', brand: name, properties: new Map<string, Type>([
              ['length', T_NUMBER], ['byteLength', T_NUMBER], ['byteOffset', T_NUMBER],
              ['buffer', T_ANY],
            ]) }
          case 'DataView':
            return { kind: 'object', brand: 'DataView', properties: new Map<string, Type>([
              ['byteLength', T_NUMBER], ['byteOffset', T_NUMBER], ['buffer', T_ANY],
            ]) }
          case 'ArrayBuffer':
          case 'SharedArrayBuffer':
            return { kind: 'object', brand: name, properties: new Map<string, Type>([['byteLength', T_NUMBER]]) }
          case 'FinalizationRegistry':
            return { kind: 'object', brand: 'FinalizationRegistry', properties: new Map<string, Type>([
              ['register', { kind: 'function', params: [], returnType: T_VOID } as Type],
              ['unregister', { kind: 'function', params: [], returnType: T_BOOLEAN } as Type],
            ]) }
          case 'AbortController':
            return { kind: 'object', brand: 'AbortController', properties: new Map<string, Type>([
              ['signal', { kind: 'object', brand: 'AbortSignal', properties: new Map<string, Type>([
                ['aborted', T_BOOLEAN], ['reason', T_ANY],
              ]) } as Type],
              ['abort', { kind: 'function', params: [], returnType: T_VOID } as Type],
            ]) }
          case 'Proxy':
            return T_ANY
          case 'TextEncoder':
            return { kind: 'object', brand: 'TextEncoder', properties: new Map<string, Type>([
              ['encoding', T_STRING],
            ]) }
          case 'TextDecoder':
            return { kind: 'object', brand: 'TextDecoder', properties: new Map<string, Type>([
              ['encoding', T_STRING],
            ]) }
          case 'URLSearchParams':
            return { kind: 'object', brand: 'URLSearchParams', properties: new Map() }
        }
        // Look up constructor in env — for user-defined classes
        // First check for registered instance type (set when class was visited)
        const instanceType = env.get(`__instance__${name}`)
        if (instanceType) return instanceType
        const ctorType = env.get(name)
        if (ctorType?.kind === 'function') {
          const obj: ObjectType = { kind: 'object', brand: name, properties: new Map() }
          return obj
        }
      }
      return T_ANY
    }

    // MetaProperty — import.meta, new.target — ECMA-262 §13.3.12, §15.5
    case 'MetaProperty': {
      const meta = (node as t.MetaProperty).meta.name
      const prop = (node as t.MetaProperty).property.name
      if (meta === 'import' && prop === 'meta') {
        // import.meta → { url: string; [key: string]: unknown }
        const properties = new Map<string, Type>([['url', T_STRING]])
        return { kind: 'object', properties }
      }
      if (meta === 'new' && prop === 'target') {
        // new.target → function type or undefined
        return makeUnion({ kind: 'function', params: [], returnType: T_ANY }, T_UNDEFINED)
      }
      return T_ANY
    }

    // YieldExpression — ECMA-262 §15.5.1
    // The *result* of a yield expression is the value passed to generator.next(value)
    // which is the generator's nextType. We return any for now (gradual).
    case 'YieldExpression':
      return T_ANY

    // SequenceExpression — `a, b, c` → type of last expression
    case 'SequenceExpression': {
      const exprs = (node as t.SequenceExpression).expressions
      if (exprs.length === 0) return T_ANY
      return inferExprType(exprs[exprs.length - 1], env)
    }

    // TaggedTemplateExpression — `tag\`template\`` — ECMA-262 §13.2.9
    // Return type comes from the tag function. String.raw returns string.
    case 'TaggedTemplateExpression': {
      const tte = node as t.TaggedTemplateExpression
      // Direct identifier tag: fn`...` — infer from fn's type
      if (t.isIdentifier(tte.tag)) {
        const tagType = env.get((tte.tag as t.Identifier).name)
        if (tagType?.kind === 'function') return (tagType as import('./types').FunctionType).returnType
      }
      // Member expression tag: String.raw`...`, css`...`
      if (t.isMemberExpression(tte.tag)) {
        const obj = (tte.tag as t.MemberExpression).object
        const prop = (tte.tag as t.MemberExpression).property
        if (t.isIdentifier(obj) && t.isIdentifier(prop)) {
          if (obj.name === 'String' && prop.name === 'raw') return T_STRING
          // Look up the method's return type
          const objType = inferExprType(obj, env)
          const result = inferStdlibMethodCall(objType, obj, prop.name, env)
          if (result !== null) return result
        }
      }
      return T_ANY
    }

    // AssignmentExpression — result type is the RHS type
    case 'AssignmentExpression': {
      return inferExprType((node as t.AssignmentExpression).right, env)
    }

    // TSNonNullExpression (x!) — same type as inner (non-null assertion)
    case 'TSNonNullExpression':
      return inferExprType((node as t.TSNonNullExpression).expression, env)

    // TSAsExpression (x as T) — the cast target type
    case 'TSAsExpression':
      return resolveType((node as t.TSAsExpression).typeAnnotation)

    // TSSatisfiesExpression (x satisfies T) — the expression type
    case 'TSSatisfiesExpression':
      return inferExprType((node as any).expression, env)

    // TSTypeAssertion (<T>x) — the cast target type
    case 'TSTypeAssertion':
      return resolveType((node as t.TSTypeAssertion).typeAnnotation)

    // FunctionExpression — infer return type from annotation
    case 'FunctionExpression': {
      const fe = node as t.FunctionExpression
      const returnAnnotation = fe.returnType
        ? (fe.returnType as t.TSTypeAnnotation).typeAnnotation
        : null
      const params = fe.params.map(p => ({
        name: t.isIdentifier(p) ? p.name : '_',
        type: t.isIdentifier(p) && p.typeAnnotation
          ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
          : T_ANY,
        optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
      }))
      // Generator function expression: function*() {}
      if (fe.generator) {
        const resolvedReturn = resolveType(returnAnnotation)
        // If annotated as Generator<Y,R,N>, use that
        if (resolvedReturn.kind === 'generator') return resolvedReturn as GeneratorType
        // Otherwise yield type is the declared return (or any), wrapped in Generator
        return { kind: 'generator', yieldType: resolvedReturn.kind !== 'any' ? resolvedReturn : T_ANY, returnType: T_VOID, nextType: T_ANY, async: false } as GeneratorType
      }
      return {
        kind: 'function',
        params,
        returnType: resolveType(returnAnnotation),
      }
    }

    default:
      return T_ANY
  }
}

// ── Consistency relation — gradual typing ─────────────────────────────────────

/**
 * Returns true if type `a` is *consistent* with type `b` (written a ~ b).
 *
 * Consistency extends structural subtyping with the `any` escape hatch:
 *   - any ~ T  and  T ~ any  hold for all T         (gradual rules)
 *   - T ~ T    holds                                  (reflexivity)
 *   - string ~ number  is false                       (no coercion)
 *   - T ~ (A | B)  iff  T ~ A  or  T ~ B            (union right)
 *
 * Reference: Siek & Taha (2006) "Gradual Typing for Functional Languages"
 * TypeScript structural typing: https://www.typescriptlang.org/docs/handbook/type-compatibility.html
 */
function isConsistent(a: Type, b: Type): boolean {
  if (a.kind === 'any' || b.kind === 'any') return true
  // dynamic ~ T and T ~ dynamic for all T (runtime-checked escape hatch)
  if (a.kind === 'dynamic' || b.kind === 'dynamic') return true
  // never is only inconsistent with non-never types; never ~ never is trivially true
  if (a.kind === 'never' && b.kind === 'never') return true
  if (a.kind === 'never' || b.kind === 'never') return false
  // Type parameters are consistent with any type (gradual generic instantiation)
  if (a.kind === 'typeParam' || b.kind === 'typeParam') return true

  // Tuple is consistent with array (tuple is a subtype of array)
  if (a.kind === 'tuple' && b.kind === 'array') return true
  if (a.kind === 'array' && b.kind === 'tuple') return true

  // Generator is consistent with array (generators are iterable)
  if (a.kind === 'generator' && b.kind === 'array') return true
  if (a.kind === 'array' && b.kind === 'generator') return true
  // Generator is consistent with any iterable-like type
  if (a.kind === 'generator' && b.kind === 'object') return true

  // Exact match
  if (a.kind === b.kind) {
    // For promise types, check the inner resolved type too
    if (a.kind === 'promise' && b.kind === 'promise') {
      return isConsistent((a as PromiseType).valueType, (b as PromiseType).valueType)
    }
    if (a.kind === 'union' && b.kind === 'union') return true  // simplification
    return true
  }

  // a ~ (B1 | B2 | …)  iff  a ~ Bi for some i
  if (b.kind === 'union') {
    return (b as UnionType).types.some(bt => isConsistent(a, bt))
  }

  // (A1 | A2 | …) ~ b  iff  Ai ~ b for all i
  if (a.kind === 'union') {
    return (a as UnionType).types.every(at => isConsistent(at, b))
  }

  // Intersection type — gradual fallback: any concrete type satisfies an intersection annotation
  if (b.kind === 'intersection') return true
  if (a.kind === 'intersection') return true

  return false
}

// ── typeof string → Type helper ──────────────────────────────────────────────

function typeNameToType(name: string): Type | null {
  switch (name) {
    case 'string':    return T_STRING
    case 'number':    return T_NUMBER
    case 'boolean':   return T_BOOLEAN
    case 'bigint':    return { kind: 'bigint' }
    case 'symbol':    return { kind: 'symbol' }
    case 'undefined': return T_UNDEFINED
    case 'function':  return { kind: 'function', params: [], returnType: T_ANY }
    case 'object':    return T_NULL  // typeof null === 'object' edge case — use null
    default:          return null
  }
}

// ── TypeChecker class ─────────────────────────────────────────────────────────

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
  // maps type alias name → SumType (built from TSTypeAliasDeclaration with TSUnionType RHS)
  private sumTypeRegistry: Map<string, SumType> = new Map()
  // maps variant tag string → variant type name (e.g. "Ok" → "Ok")
  private variantTagRegistry: Map<string, string> = new Map()
  // Block scoping: track which names are block-scoped at each nesting level
  private blockVarStack: Set<string>[] = []
  // Narrowing stack: saved types to restore when exiting narrowed scope
  private narrowingStack: Array<Map<string, Type>> = []
  // Async function nesting depth (for SJS-E008)
  private asyncDepth: number = 0
  // Type-only import bindings (for SJS-E009)
  private typeOnlyBindings: Set<string> = new Set()
  // Class context stack: names of classes we're currently inside (for method context)
  private classContextStack: string[] = []
  // Persistent registry of class member visibility: className → memberName → accessibility
  private classRegistry: Map<string, Map<string, string>> = new Map()
  // Map from variable name → class name for `const x = new MyClass()` bindings
  private classInstanceBindings: Map<string, string> = new Map()
  // Name of the class whose method we're currently inside (for this.field access checks)
  private currentClassMethodName: string | null = null
  // Interface registry: interfaceName → Set of required member names (SJS5)
  private interfaceRegistry: Map<string, Set<string>> = new Map()
  // Class field types: className → fieldName → Type (for this.field inference)
  private classFieldTypes: Map<string, Map<string, Type>> = new Map()
  // Function parameter scope stack: saves previous env bindings to restore on exit
  private paramScopeStack: Array<Map<string, Type | undefined>> = []
  // Type guard registry: fnName → { paramIndex, narrowedType }
  private typeGuardRegistry: Map<string, { paramIndex: number; narrowedType: Type }> = new Map()
  // Generator yield type stack: tracks declared yieldType of enclosing generator functions
  private generatorYieldStack: Type[] = []

  constructor(options: TypeCheckerOptions = {}) {
    this.strict = options.strict ?? false
  }

  getDiagnostics(): PrototypeDiagnostic[] {
    return [...this.diagnostics]
  }

  reset(): void {
    this.diagnostics = []
    this.env = new Map()
    this.sumTypeRegistry = new Map()
    this.variantTagRegistry = new Map()
    this.blockVarStack = []
    this.narrowingStack = []
    this.asyncDepth = 0
    this.typeOnlyBindings = new Set()
    this.classContextStack = []
    this.classRegistry = new Map()
    this.classInstanceBindings = new Map()
    this.currentClassMethodName = null
    this.interfaceRegistry = new Map()
    this.classFieldTypes = new Map()
    this.paramScopeStack = []
    this.generatorYieldStack = []
  }

  // ── Exit handler — called on node exit for scope cleanup ─────────────────────

  /**
   * Called on `exit` of each AST node.
   * Pops block scope variables and narrowing overlays.
   */
  exit(path: NodePath): void {
    const { node } = path
    switch (node.type) {
      case 'BlockStatement':
        this.exitBlockStatement()
        break
      case 'IfStatement':
        // Restore narrowings applied for this if statement
        this.popNarrowing()
        break
      case 'ArrowFunctionExpression':
        if ((node as t.ArrowFunctionExpression).async) this.asyncDepth--
        this.exitFunctionParams()
        break
      case 'FunctionDeclaration':
        if ((node as t.FunctionDeclaration).async) this.asyncDepth--
        if ((node as t.FunctionDeclaration).generator) this.generatorYieldStack.pop()
        this.exitFunctionParams()
        break
      case 'FunctionExpression':
        if ((node as t.FunctionExpression).async) this.asyncDepth--
        if ((node as t.FunctionExpression).generator) this.generatorYieldStack.pop()
        this.exitFunctionParams()
        break
      case 'ClassMethod':
        if ((node as t.ClassMethod).async) this.asyncDepth--
        if ((node as t.ClassMethod).generator) this.generatorYieldStack.pop()
        this.exitFunctionParams()
        this.currentClassMethodName = null
        this.env.delete('this')
        break
      case 'ObjectMethod':
        if ((node as t.ObjectMethod).async) this.asyncDepth--
        if ((node as t.ObjectMethod).generator) this.generatorYieldStack.pop()
        this.exitFunctionParams()
        break
      case 'ClassDeclaration':
      case 'ClassExpression':
        this.classContextStack.pop()
        // Reset method context if we just left the outermost class
        if (this.classContextStack.length === 0) this.currentClassMethodName = null
        break
    }
  }

  private exitBlockStatement(): void {
    const blockVars = this.blockVarStack.pop()
    if (blockVars) {
      for (const name of blockVars) {
        this.env.delete(name)
      }
    }
  }

  private popNarrowing(): void {
    const saved = this.narrowingStack.pop()
    if (saved) {
      for (const [name, type] of saved) {
        this.env.set(name, type)
      }
    }
  }

  /**
   * Registers function parameters in the type environment.
   * Saves previous bindings for restore on exit.
   */
  private enterFunctionParams(params: ReadonlyArray<t.Identifier | t.Pattern | t.RestElement | t.TSParameterProperty>): void {
    const saved = new Map<string, Type | undefined>()
    for (const p of params) {
      let name: string | null = null
      let type: Type = T_ANY

      if (t.isIdentifier(p)) {
        name = p.name
        type = p.typeAnnotation
          ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
          : T_ANY
      } else if (t.isAssignmentPattern(p) && t.isIdentifier(p.left)) {
        name = p.left.name
        type = p.left.typeAnnotation
          ? resolveType((p.left.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
          : T_ANY
      } else if (t.isRestElement(p) && t.isIdentifier(p.argument)) {
        name = p.argument.name
        const annot = (p.argument as t.Identifier).typeAnnotation
        type = annot
          ? resolveType((annot as t.TSTypeAnnotation).typeAnnotation)
          : { kind: 'array', elementType: T_ANY } as ArrayType
      } else if (t.isObjectPattern(p)) {
        // Destructured object param: use type annotation if present
        const patAnnot = (p as t.ObjectPattern).typeAnnotation
        const patType = patAnnot ? resolveType((patAnnot as t.TSTypeAnnotation).typeAnnotation) : null
        const props = (patType && patType.kind === 'object') ? (patType as ObjectType).properties : null
        for (const prop of p.properties) {
          if (t.isObjectProperty(prop)) {
            const key = t.isIdentifier(prop.key) ? (prop.key as t.Identifier).name : null
            let bindName: string | null = null
            if (t.isIdentifier(prop.value)) bindName = (prop.value as t.Identifier).name
            else if (t.isAssignmentPattern(prop.value) && t.isIdentifier((prop.value as t.AssignmentPattern).left))
              bindName = ((prop.value as t.AssignmentPattern).left as t.Identifier).name
            if (bindName) {
              saved.set(bindName, this.env.get(bindName))
              this.env.set(bindName, (key != null ? props?.get(key) : undefined) ?? T_ANY)
            }
          } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
            const bindName = (prop.argument as t.Identifier).name
            saved.set(bindName, this.env.get(bindName))
            this.env.set(bindName, T_ANY)
          }
        }
        continue
      } else if (t.isArrayPattern(p)) {
        // Destructured array param: use type annotation if present
        const patAnnot = (p as t.ArrayPattern).typeAnnotation
        const patType = patAnnot ? resolveType((patAnnot as t.TSTypeAnnotation).typeAnnotation) : null
        const elemType = (patType && patType.kind === 'array') ? (patType as ArrayType).elementType : T_ANY
        const tupleElems = (patType && patType.kind === 'tuple') ? (patType as TupleType).elements : null
        p.elements.forEach((elem, idx) => {
          if (!elem) return
          let bindName: string | null = null
          if (t.isIdentifier(elem)) bindName = (elem as t.Identifier).name
          else if (t.isAssignmentPattern(elem) && t.isIdentifier((elem as t.AssignmentPattern).left))
            bindName = ((elem as t.AssignmentPattern).left as t.Identifier).name
          else if (t.isRestElement(elem) && t.isIdentifier(elem.argument))
            bindName = (elem.argument as t.Identifier).name
          if (bindName) {
            saved.set(bindName, this.env.get(bindName))
            this.env.set(bindName, (tupleElems && tupleElems[idx]) ?? elemType)
          }
        })
        continue
      } else if (t.isTSParameterProperty(p)) {
        // constructor(private x: T) shorthand — register the inner param
        const inner = p.parameter
        if (t.isIdentifier(inner)) {
          name = inner.name
          type = inner.typeAnnotation
            ? resolveType((inner.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
            : T_ANY
        }
      }

      if (name) {
        saved.set(name, this.env.get(name))
        this.env.set(name, type)
      }
    }
    this.paramScopeStack.push(saved)
  }

  private exitFunctionParams(): void {
    const saved = this.paramScopeStack.pop()
    if (saved) {
      for (const [name, prev] of saved) {
        if (prev === undefined) this.env.delete(name)
        else this.env.set(name, prev)
      }
    }
  }

  // ── Main entry point — called for every AST node ────────────────────────────

  check(path: NodePath): void {
    const { node } = path

    switch (node.type) {
      case 'VariableDeclaration':
        // Skip for-of/for-in loop variables — their types are set by checkForOfStatement/checkForInStatement
        if (path.parent?.type === 'ForOfStatement' || path.parent?.type === 'ForInStatement') break
        this.checkVariableDeclaration(path as NodePath<t.VariableDeclaration>)
        break
      case 'FunctionDeclaration': {
        const fd = path.node as t.FunctionDeclaration
        if (fd.async) this.asyncDepth++
        this.registerFunctionDeclaration(path as NodePath<t.FunctionDeclaration>)
        this.enterFunctionParams(fd.params)
        if (fd.generator && fd.id) {
          const genType = this.env.get(fd.id.name)
          const yieldType = genType?.kind === 'generator' ? (genType as GeneratorType).yieldType : T_ANY
          this.generatorYieldStack.push(yieldType)
        }
        break
      }
      case 'AssignmentExpression':
        this.checkAssignment(path as NodePath<t.AssignmentExpression>)
        break
      case 'ReturnStatement':
        this.checkReturnStatement(path as NodePath<t.ReturnStatement>)
        break
      case 'ArrowFunctionExpression': {
        const afe = path.node as t.ArrowFunctionExpression
        if (afe.async) this.asyncDepth++
        this.enterFunctionParams(afe.params)
        this.checkArrowConciseReturn(path as NodePath<t.ArrowFunctionExpression>)
        break
      }
      case 'FunctionExpression': {
        const fex = path.node as t.FunctionExpression
        if (fex.async) this.asyncDepth++
        this.enterFunctionParams(fex.params)
        if (fex.generator) {
          const ann = fex.returnType ? (fex.returnType as t.TSTypeAnnotation).typeAnnotation : null
          const resolvedRet = ann ? resolveType(ann) : T_ANY
          const yieldType = resolvedRet.kind === 'generator' ? (resolvedRet as GeneratorType).yieldType : T_ANY
          this.generatorYieldStack.push(yieldType)
        }
        break
      }
      case 'ClassMethod': {
        const cm = path.node as t.ClassMethod
        if (cm.async) this.asyncDepth++
        this.enterFunctionParams(cm.params)
        if (this.classContextStack.length > 0) {
          const className = this.classContextStack[this.classContextStack.length - 1]
          this.currentClassMethodName = className
          // Register 'this' type for field inference inside method bodies
          const fieldTypes = this.classFieldTypes.get(className)
          if (fieldTypes && fieldTypes.size > 0) {
            this.env.set('this', { kind: 'object', properties: new Map(fieldTypes) } as ObjectType)
          }
        }
        if (cm.generator) {
          const ann = cm.returnType ? (cm.returnType as t.TSTypeAnnotation).typeAnnotation : null
          const resolvedRet = ann ? resolveType(ann) : T_ANY
          const yieldType = resolvedRet.kind === 'generator' ? (resolvedRet as GeneratorType).yieldType : T_ANY
          this.generatorYieldStack.push(yieldType)
        }
        break
      }
      case 'ObjectMethod': {
        const om = path.node as t.ObjectMethod
        if (om.async) this.asyncDepth++
        this.enterFunctionParams(om.params)
        if (om.generator) {
          const ann = om.returnType ? (om.returnType as t.TSTypeAnnotation).typeAnnotation : null
          const resolvedRet = ann ? resolveType(ann) : T_ANY
          const yieldType = resolvedRet.kind === 'generator' ? (resolvedRet as GeneratorType).yieldType : T_ANY
          this.generatorYieldStack.push(yieldType)
        }
        break
      }
      case 'TSInterfaceDeclaration': {
        // SJS5: register interface members for implements checking
        const iface = path.node as t.TSInterfaceDeclaration
        const ifaceName = iface.id.name
        if (!this.interfaceRegistry.has(ifaceName)) {
          const members = new Set<string>()
          for (const member of iface.body.body) {
            if ((t.isTSPropertySignature(member) || t.isTSMethodSignature(member)) && t.isIdentifier(member.key)) {
              members.add(member.key.name)
            }
          }
          this.interfaceRegistry.set(ifaceName, members)
        }
        break
      }
      case 'ClassDeclaration':
      case 'ClassExpression': {
        const cls = path.node as t.ClassDeclaration | t.ClassExpression
        const className = cls.id?.name ?? '__anonymous__'
        if (!this.classRegistry.has(className)) {
          const members = new Map<string, string>()
          const fieldTypes = new Map<string, Type>()
          const staticFieldTypes = new Map<string, Type>()
          for (const member of cls.body.body) {
            const isStatic = (member as any).static === true
            const targetMap = isStatic ? staticFieldTypes : fieldTypes

            if ((t.isClassMethod(member) || t.isClassProperty(member)) && t.isIdentifier(member.key)) {
              const mKey = (member.key as t.Identifier).name
              members.set(mKey, (member as any).accessibility ?? 'public')
              if (t.isClassProperty(member)) {
                const ann = (member as t.ClassProperty).typeAnnotation
                const init = (member as t.ClassProperty).value
                targetMap.set(mKey, ann && t.isTSTypeAnnotation(ann)
                  ? resolveType((ann as t.TSTypeAnnotation).typeAnnotation)
                  : (init && t.isExpression(init) ? inferExprType(init as t.Expression, this.env) : T_ANY))
              }
              if (t.isClassMethod(member)) {
                const meth = member as t.ClassMethod
                const retAnn = meth.returnType
                const retType = retAnn ? resolveType((retAnn as t.TSTypeAnnotation).typeAnnotation) : T_ANY
                const params = meth.params.map(p => ({
                  name: t.isIdentifier(p) ? p.name : '_',
                  type: t.isIdentifier(p) && p.typeAnnotation
                    ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation) : T_ANY,
                  optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
                }))
                // Getter: property type is the return type; setter: param type; method: function
                if (meth.kind === 'get') {
                  targetMap.set(mKey, retType)
                } else if (meth.kind === 'set') {
                  const setParam = meth.params[0]
                  const setParamType = setParam && t.isIdentifier(setParam) && setParam.typeAnnotation
                    ? resolveType((setParam.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
                    : T_ANY
                  targetMap.set(mKey, setParamType)
                } else {
                  targetMap.set(mKey, {
                    kind: 'function', params,
                    returnType: retType,
                  } as import('./types').FunctionType)
                }
              }
            }
            // Private fields — ECMA-262 §15.7.1
            if (t.isClassPrivateProperty(member)) {
              const privateName = '#' + (member.key as t.PrivateName).id.name
              members.set(privateName, 'private')
              const ann = (member as t.ClassPrivateProperty).typeAnnotation
              const init = (member as t.ClassPrivateProperty).value
              fieldTypes.set(privateName, ann && t.isTSTypeAnnotation(ann)
                ? resolveType((ann as t.TSTypeAnnotation).typeAnnotation)
                : (init && t.isExpression(init) ? inferExprType(init as t.Expression, this.env) : T_ANY))
            }
            if (t.isClassPrivateMethod(member)) {
              const privateName = '#' + (member.key as t.PrivateName).id.name
              members.set(privateName, 'private')
            }
            // Constructor parameter properties: constructor(private x: T) — register as instance fields
            if (t.isClassMethod(member) && (member as t.ClassMethod).kind === 'constructor') {
              for (const p of (member as t.ClassMethod).params) {
                if (t.isTSParameterProperty(p)) {
                  const inner = (p as t.TSParameterProperty).parameter
                  if (t.isIdentifier(inner)) {
                    const acc = (p as t.TSParameterProperty).accessibility ?? 'public'
                    members.set(inner.name, acc)
                    const paramType = inner.typeAnnotation
                      ? resolveType((inner.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
                      : T_ANY
                    fieldTypes.set(inner.name, paramType)
                  }
                }
              }
            }
            // Abstract methods (TSDeclareMethod) — ECMA-262 §15.7.2 / TS abstract
            if (t.isTSDeclareMethod(member) && t.isIdentifier(member.key)) {
              const mKey = (member.key as t.Identifier).name
              members.set(mKey, (member as any).accessibility ?? 'public')
              const meth = member as t.TSDeclareMethod
              const retAnn = meth.returnType
              const params = meth.params.map(p => ({
                name: t.isIdentifier(p) ? p.name : '_',
                type: t.isIdentifier(p) && p.typeAnnotation
                  ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation) : T_ANY,
                optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
              }))
              fieldTypes.set(mKey, {
                kind: 'function', params,
                returnType: retAnn ? resolveType((retAnn as t.TSTypeAnnotation).typeAnnotation) : T_ANY,
              } as import('./types').FunctionType)
            }
          }
          // Inherit members from superclass (extends clause) — ECMA-262 §15.7.14
          if (cls.superClass && t.isIdentifier(cls.superClass)) {
            const superName = (cls.superClass as t.Identifier).name
            const superFields = this.classFieldTypes.get(superName)
            if (superFields) {
              for (const [k, v] of superFields) {
                if (!fieldTypes.has(k)) fieldTypes.set(k, v)
              }
            }
            const superMembers = this.classRegistry.get(superName)
            if (superMembers) {
              for (const [k, v] of superMembers) {
                if (!members.has(k)) members.set(k, v)
              }
            }
          }
          this.classRegistry.set(className, members)
          this.classFieldTypes.set(className, fieldTypes)
          const instanceType = { kind: 'object', brand: className, properties: new Map(fieldTypes) } as import('./types').ObjectType
          // Register class instance type in env under __instance__ClassName for new expressions
          this.env.set(`__instance__${className}`, instanceType)
          // Register class name in env so ClassName.staticMethod() resolves — §15.7
          if (staticFieldTypes.size > 0) {
            this.env.set(className, { kind: 'object', properties: staticFieldTypes } as import('./types').ObjectType)
          }
          // For class expressions: if parent is `const Foo = class { ... }`, register
          // __instance__Foo and update Foo's binding so `new Foo()` resolves correctly.
          if (cls.type === 'ClassExpression') {
            const parentDeclarator = path.parent
            if (t.isVariableDeclarator(parentDeclarator) && t.isIdentifier(parentDeclarator.id)) {
              const varName = (parentDeclarator.id as t.Identifier).name
              this.env.set(`__instance__${varName}`, instanceType)
              this.env.set(varName, instanceType)
            }
          }
        }
        this.classContextStack.push(className)
        this.checkImplementsClauses(path as NodePath<t.ClassDeclaration | t.ClassExpression>)
        break
      }
      case 'AwaitExpression':
        // SJS-E008: await used outside an async function
        if (this.asyncDepth === 0) {
          this.report({
            code: 'SJS-E008',
            severity: 'error',
            message: `'await' can only be used inside an async function.`,
            node: path.node,
            specUrl: 'https://tc39.es/ecma262/#sec-await',
          })
        }
        break
      case 'MemberExpression':
        this.checkMemberAccess(path as NodePath<t.MemberExpression>)
        this.checkNullableMemberAccess(path as NodePath<t.MemberExpression>)
        break
      case 'Identifier':
        // SJS-E009: type-only import binding used at runtime
        if (this.typeOnlyBindings.has((path.node as t.Identifier).name)) {
          const p = path as NodePath<t.Identifier>
          if (p.isReferencedIdentifier()) {
            this.report({
              code: 'SJS-E009',
              severity: 'error',
              message: `'${(path.node as t.Identifier).name}' is a type-only import and cannot be used as a value.`,
              node: path.node,
              specUrl: 'https://tc39.es/ecma262/#sec-imports',
            })
          }
        }
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
        this.checkBinaryExpression(path as NodePath<t.BinaryExpression>)
        break
      case 'BlockStatement':
        this.enterBlockStatement()
        break
      case 'IfStatement':
        this.checkIfStatement(path as NodePath<t.IfStatement>)
        break
      case 'ForStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        // No variable registration needed — just let body be traversed
        break
      case 'ForOfStatement':
        this.checkForOfStatement(path as NodePath<t.ForOfStatement>)
        break
      case 'ForInStatement':
        this.checkForInStatement(path as NodePath<t.ForInStatement>)
        break
      case 'TryStatement':
        this.checkTryStatement(path as NodePath<t.TryStatement>)
        break
      case 'ThrowStatement':
        // ThrowStatement — check thrown expression (currently just ensures it's visited)
        break
      case 'ImportDeclaration':
        this.checkImportDeclaration(path as NodePath<t.ImportDeclaration>)
        break
      case 'ExportNamedDeclaration':
        this.checkExportNamedDeclaration(path as NodePath<t.ExportNamedDeclaration>)
        break
      case 'ExportDefaultDeclaration':
        // Default exports don't need special handling in the type env
        break
      case 'ExportAllDeclaration':
        // `export * from 'mod'` — re-exports all bindings; cross-module types not tracked in single-file mode
        break
      case 'WithStatement':
        // `with (obj) { ... }` — legacy syntax; banned in strict mode; silently traversed
        break
      case 'TSNonNullExpression':
        this.checkNonNullAssertion(path as NodePath<t.TSNonNullExpression>)
        break
      case 'YieldExpression':
        this.checkYieldExpression(path as NodePath<t.YieldExpression>)
        break
    }
  }

  private enterBlockStatement(): void {
    this.blockVarStack.push(new Set())
  }

  // ── Rule TC-001 / TC-004: Variable declarations — ECMA-262 §14.3.1 ──────────

  /**
   * Checks `const/let/var x: T = expr`.
   *
   * If a type annotation is present, verify the initializer is consistent with T.
   * Registers the binding in `env` for later reference.
   *
   * ECMA-262 §14.3.1 Let and Const Declarations:
   * https://tc39.es/ecma262/#sec-let-and-const-declarations
   */
  private checkVariableDeclaration(path: NodePath<t.VariableDeclaration>): void {
    for (const decl of path.node.declarations) {
      // ── Array destructuring — ECMA-262 §14.3.3 ─────────────────────────────
      if (t.isArrayPattern(decl.id)) {
        this.checkArrayDestructuring(decl)
        continue
      }

      // ── Object destructuring — ECMA-262 §14.3.3 ────────────────────────────
      if (t.isObjectPattern(decl.id)) {
        this.checkObjectDestructuring(decl)
        continue
      }

      if (!t.isIdentifier(decl.id)) continue

      const annotation = decl.id.typeAnnotation
      const hasAnnotation = annotation && t.isTSTypeAnnotation(annotation)
      let declared: Type = hasAnnotation
        ? resolveType(annotation.typeAnnotation)
        : T_ANY

      // If the annotation is a TSTypeReference to a known sum type alias,
      // resolve it to the registered SumType so the env has the full type.
      if (
        hasAnnotation &&
        annotation.typeAnnotation.type === 'TSTypeReference' &&
        t.isIdentifier((annotation.typeAnnotation as t.TSTypeReference).typeName)
      ) {
        const refName = ((annotation.typeAnnotation as t.TSTypeReference).typeName as t.Identifier).name
        const knownSum = this.sumTypeRegistry.get(refName)
        if (knownSum) declared = knownSum
      }

      const name = decl.id.name

      // SJS-W001: implicit any — ECMA-262 §6.1 / TypeScript noImplicitAny
      if (this.strict && !hasAnnotation) {
        this.report({
          code: 'SJS-W001',
          severity: 'warning',
          message: `'${name}' implicitly has type 'any' because it lacks a type annotation.`,
          node: decl.id,
          specUrl: 'https://www.typescriptlang.org/tsconfig/#noImplicitAny',
        })
      }
      // SJS-W001: explicit dynamic in strict mode — warns that dynamic bypasses type safety
      if (this.strict && declared.kind === 'dynamic') {
        this.report({
          code: 'SJS-W001',
          severity: 'warning',
          message: `'${name}' is typed as 'dynamic' which bypasses type safety. Prefer a precise type annotation in strict mode.`,
          node: decl.id,
          specUrl: 'https://www.typescriptlang.org/tsconfig/#noImplicitAny',
        })
      }

      if (decl.init) {
        const inferred = inferExprType(decl.init, this.env)

        // Check assignment — ECMA-262 §14.3.1 step 4 (InitialiseBinding)
        if (!isConsistent(inferred, declared)) {
          this.report({
            code: 'SJS-E001',
            severity: 'error',
            message: `I cannot assign a value of type '${inferred.kind}' to a variable declared as '${declared.kind}'.`,
            node: decl.init,
            specUrl: SPEC.LET_CONST,
          })
        }
        // Register binding. Annotated variables get the declared type.
        // Unannotated variables get the INFERRED type so that downstream property
        // access and member expressions can resolve property types (e.g. obj.name).
        // If inference yields `any` (unknown initializer), the binding stays gradual.
        this.registerVar(name, hasAnnotation ? declared : inferred, path.node.kind)
        // SJS-E011: track `const x = new MyClass()` for member visibility checks
        if (t.isNewExpression(decl.init) && t.isIdentifier(decl.init.callee)) {
          this.classInstanceBindings.set(name, (decl.init.callee as t.Identifier).name)
        }
      } else {
        this.registerVar(name, declared, path.node.kind)
      }
    }
  }

  /** Register a variable binding, tracking block scope if let/const. */
  private registerVar(name: string, type: Type, kind: string): void {
    this.env.set(name, type)
    // let/const are block-scoped — track for removal when block exits
    if ((kind === 'let' || kind === 'const') && this.blockVarStack.length > 0) {
      this.blockVarStack[this.blockVarStack.length - 1].add(name)
    }
  }

  // ── Array destructuring — ECMA-262 §14.3.3 ───────────────────────────────────

  /**
   * Checks `const [a, b, ...rest]: T[] = expr` array destructuring patterns.
   *
   * Resolves the element type from the declared annotation (if any) or from the
   * inferred initializer type.  Registers each element binding in `env`.
   *
   * ECMA-262 §14.3.3 Destructuring Binding Patterns:
   * https://tc39.es/ecma262/#sec-destructuring-binding-patterns
   */
  private checkArrayDestructuring(decl: t.VariableDeclarator): void {
    const pattern = decl.id as t.ArrayPattern
    const annotation = pattern.typeAnnotation
    const hasAnnotation = annotation && t.isTSTypeAnnotation(annotation)
    const declared: Type = hasAnnotation ? resolveType(annotation.typeAnnotation) : T_ANY

    const inferred: Type = decl.init ? inferExprType(decl.init, this.env) : T_ANY

    // Determine element type or tuple elements
    const sourceType = declared.kind !== 'any' ? declared : inferred
    const isTuple = sourceType.kind === 'tuple'
    const tupleElements = isTuple ? (sourceType as import('./types').TupleType).elements : null
    let elementType: Type = T_ANY
    if (!isTuple) {
      if (sourceType.kind === 'array') {
        elementType = (sourceType as import('./types').ArrayType).elementType
      }
    }

    // Check overall initializer consistency when we have a declared type.
    if (hasAnnotation && !isConsistent(inferred, declared)) {
      if (decl.init) {
        this.report({
          code: 'SJS-E001',
          severity: 'error',
          message: `I cannot destructure a value of type '${inferred.kind}' using an array pattern declared as '${declared.kind}'.`,
          node: decl.init,
          specUrl: SPEC.LET_CONST,
        })
      }
    }

    // Register each element identifier in env.
    for (let i = 0; i < pattern.elements.length; i++) {
      const elem = pattern.elements[i]
      if (!elem) continue
      if (t.isIdentifier(elem)) {
        // For tuples, each position has its own type
        const elemT = tupleElements ? (tupleElements[i] ?? T_ANY) : elementType
        this.env.set(elem.name, elemT)
      } else if (t.isAssignmentPattern(elem) && t.isIdentifier(elem.left)) {
        const elemT = tupleElements ? (tupleElements[i] ?? T_ANY) : elementType
        this.env.set(elem.left.name, elemT)
      } else if (t.isRestElement(elem) && t.isIdentifier(elem.argument)) {
        // rest element gets the same array type as the source
        const restType: Type = sourceType.kind === 'array' ? sourceType
          : sourceType.kind === 'tuple' ? { kind: 'array', elementType: T_ANY }
          : T_ANY
        this.env.set(elem.argument.name, restType)
      }
    }
  }

  // ── Object destructuring — ECMA-262 §14.3.3 ──────────────────────────────────

  /**
   * Checks `const { x, y }: T = expr` object destructuring patterns.
   *
   * Resolves property types from the declared annotation (TSTypeLiteral) or from
   * the inferred initializer ObjectType.  Registers each binding in `env`.
   *
   * ECMA-262 §14.3.3 Destructuring Binding Patterns:
   * https://tc39.es/ecma262/#sec-destructuring-binding-patterns
   */
  private checkObjectDestructuring(decl: t.VariableDeclarator): void {
    const pattern = decl.id as t.ObjectPattern
    const annotation = pattern.typeAnnotation
    const hasAnnotation = annotation && t.isTSTypeAnnotation(annotation)
    const declared: Type = hasAnnotation ? resolveType(annotation.typeAnnotation) : T_ANY

    const inferred: Type = decl.init ? inferExprType(decl.init, this.env) : T_ANY

    // Check that the initializer is consistent with the declared type when annotated.
    if (hasAnnotation && declared.kind !== 'any' && decl.init && !isConsistent(inferred, declared)) {
      this.report({
        code: 'SJS-E001',
        severity: 'error',
        message: `I cannot destructure a value of type '${inferred.kind}' using an object pattern declared as '${declared.kind}'.`,
        node: decl.init,
        specUrl: SPEC.LET_CONST,
      })
    }

    // Prefer declared annotation's object type; fall back to inferred ObjectType.
    const objType: Type = declared.kind === 'object' ? declared
      : inferred.kind === 'object' ? inferred
      : T_ANY

    // Collect non-rest property keys for building the rest type
    const extractedKeys = new Set(
      pattern.properties
        .filter(p => t.isObjectProperty(p))
        .map(p => {
          if (!t.isObjectProperty(p)) return null
          return t.isIdentifier(p.key) ? (p.key as t.Identifier).name
            : t.isStringLiteral(p.key) ? (p.key as t.StringLiteral).value
            : null
        })
        .filter((k): k is string => k !== null)
    )

    for (const prop of pattern.properties) {
      if (t.isRestElement(prop)) {
        if (t.isIdentifier(prop.argument)) {
          // Rest type: source ObjectType minus already-extracted properties
          if (objType.kind === 'object') {
            const restProps = new Map<string, Type>()
            for (const [k, v] of (objType as ObjectType).properties) {
              if (!extractedKeys.has(k)) restProps.set(k, v)
            }
            this.env.set((prop.argument as t.Identifier).name, { kind: 'object', properties: restProps } as ObjectType)
          } else {
            this.env.set((prop.argument as t.Identifier).name, T_ANY)
          }
        }
        continue
      }
      if (!t.isObjectProperty(prop)) continue

      const key = t.isIdentifier(prop.key) ? prop.key.name
        : t.isStringLiteral(prop.key) ? prop.key.value
        : null
      if (!key) continue

      const propType = objType.kind === 'object'
        ? (objType as ObjectType).properties.get(key) ?? T_ANY
        : T_ANY

      const val = prop.value
      if (t.isIdentifier(val)) {
        // { x } or { x: y }
        this.env.set(val.name, propType)
      } else if (t.isAssignmentPattern(val) && t.isIdentifier(val.left)) {
        // { x = default } or { x: y = default }
        this.env.set(val.left.name, propType)
      } else if (t.isObjectPattern(val)) {
        // Nested object destructuring: { x: { y, z } }
        this.checkObjectDestructuring({
          id: val,
          init: null,
          type: 'VariableDeclarator',
        } as unknown as t.VariableDeclarator)
        // Override env to use the actual propType
        const nestedEnv = propType.kind === 'object' ? propType : T_ANY
        for (const nestedProp of val.properties) {
          if (!t.isObjectProperty(nestedProp)) continue
          const nestedKey = t.isIdentifier(nestedProp.key) ? nestedProp.key.name : null
          if (!nestedKey) continue
          const nestedBinding = t.isIdentifier(nestedProp.value) ? nestedProp.value.name
            : (t.isAssignmentPattern(nestedProp.value) && t.isIdentifier((nestedProp.value as t.AssignmentPattern).left))
              ? ((nestedProp.value as t.AssignmentPattern).left as t.Identifier).name
              : null
          if (!nestedBinding) continue
          const nestedType = nestedEnv.kind === 'object'
            ? (nestedEnv as ObjectType).properties.get(nestedKey) ?? T_ANY
            : T_ANY
          this.env.set(nestedBinding, nestedType)
        }
      } else if (t.isArrayPattern(val)) {
        // Nested array destructuring: { x: [a, b] }
        const elemType = propType.kind === 'array' ? (propType as ArrayType).elementType : T_ANY
        if (t.isArrayPattern(val)) {
          for (let i = 0; i < val.elements.length; i++) {
            const elem = val.elements[i]
            if (!elem) continue
            const elemT = propType.kind === 'tuple'
              ? ((propType as TupleType).elements[i] ?? T_ANY)
              : elemType
            if (t.isIdentifier(elem)) this.env.set(elem.name, elemT)
            else if (t.isAssignmentPattern(elem) && t.isIdentifier(elem.left)) this.env.set(elem.left.name, elemT)
          }
        }
      }
    }
  }

  // ── Rule TC-004: Re-assignment — ECMA-262 §14.3.1 ────────────────────────────

  /**
   * Checks `x = expr` assignments.
   *
   * If `x` is in the environment with a declared type, the RHS must be consistent.
   *
   * ECMA-262 §13.15 Assignment Operators:
   * https://tc39.es/ecma262/#sec-assignment-operators
   */
  private checkAssignment(path: NodePath<t.AssignmentExpression>): void {
    // Object destructuring assignment: { a, b, ...rest } = obj
    if (t.isObjectPattern(path.node.left)) {
      const rhsType = inferExprType(path.node.right, this.env)
      const extractedObjKeys = new Set<string>()
      for (const prop of (path.node.left as t.ObjectPattern).properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          extractedObjKeys.add((prop.key as t.Identifier).name)
        }
      }
      if (rhsType.kind === 'object') {
        for (const prop of (path.node.left as t.ObjectPattern).properties) {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key) && t.isIdentifier(prop.value)) {
            const key = (prop.key as t.Identifier).name
            const bindName = (prop.value as t.Identifier).name
            const propType = (rhsType as ObjectType).properties.get(key)
            if (propType) this.env.set(bindName, propType)
          } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
            // ...rest gets remaining properties from the source ObjectType
            const restProps = new Map<string, Type>()
            for (const [k, v] of (rhsType as ObjectType).properties) {
              if (!extractedObjKeys.has(k)) restProps.set(k, v)
            }
            this.env.set((prop.argument as t.Identifier).name, { kind: 'object', properties: restProps } as ObjectType)
          }
        }
      } else {
        // Source is not a known ObjectType — give rest binding T_ANY
        for (const prop of (path.node.left as t.ObjectPattern).properties) {
          if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
            this.env.set((prop.argument as t.Identifier).name, T_ANY)
          }
        }
      }
      return
    }
    // Array destructuring assignment: [a, b, ...rest] = arr
    if (t.isArrayPattern(path.node.left)) {
      const rhsType = inferExprType(path.node.right, this.env)
      const elemType = rhsType.kind === 'array' ? (rhsType as ArrayType).elementType
        : rhsType.kind === 'tuple' ? T_ANY
        : T_ANY
      ;(path.node.left as t.ArrayPattern).elements.forEach((elem, idx) => {
        if (!elem) return
        let bindName: string | null = null
        if (t.isIdentifier(elem)) bindName = (elem as t.Identifier).name
        else if (t.isAssignmentPattern(elem) && t.isIdentifier((elem as t.AssignmentPattern).left))
          bindName = ((elem as t.AssignmentPattern).left as t.Identifier).name
        else if (t.isRestElement(elem) && t.isIdentifier((elem as t.RestElement).argument)) {
          // ...rest gets the same array type as the source
          const restArrType: Type = rhsType.kind === 'array' ? rhsType
            : elemType.kind !== 'any' ? { kind: 'array', elementType: elemType } as ArrayType
            : T_ANY
          this.env.set(((elem as t.RestElement).argument as t.Identifier).name, restArrType)
          return
        }
        if (bindName) {
          const elemT = rhsType.kind === 'tuple' ? ((rhsType as TupleType).elements[idx] ?? elemType) : elemType
          this.env.set(bindName, elemT)
        }
      })
      return
    }
    if (!t.isIdentifier(path.node.left)) return

    const op = path.node.operator
    const name = (path.node.left as t.Identifier).name
    const declaredType = this.env.get(name)
    if (!declaredType || declaredType.kind === 'any') return

    // Logical assignment (&&=, ||=, ??=) and compound assignment (+=, -=, etc.)
    // treat the RHS as if computing `a = a OP b`. For type checking purposes,
    // the RHS type must still be consistent with the declared variable type.
    const rhsType = inferExprType(path.node.right, this.env)

    // For compound arithmetic ops, check operand type compatibility
    const COMPOUND_ARITH = new Set(['+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^='])
    if (COMPOUND_ARITH.has(op)) {
      // The declared type must support arithmetic
      if (!isConsistent(rhsType, declaredType)) {
        this.report({
          code: 'SJS-E001',
          severity: 'error',
          message: `I cannot apply '${op}' with a value of type '${rhsType.kind}' to '${name}' declared as '${declaredType.kind}'.`,
          node: path.node.right,
          specUrl: 'https://tc39.es/ecma262/#sec-assignment-operators',
        })
      }
      return
    }

    // Logical assignment (&&=, ||=, ??=) — RHS type must be consistent with declared
    if (op === '&&=' || op === '||=' || op === '??=') {
      if (!isConsistent(rhsType, declaredType)) {
        this.report({
          code: 'SJS-E001',
          severity: 'error',
          message: `I cannot use '${op}' to assign a value of type '${rhsType.kind}' to '${name}' declared as '${declaredType.kind}'.`,
          node: path.node.right,
          specUrl: 'https://tc39.es/ecma262/#sec-assignment-operators',
        })
      }
      return
    }

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

  // ── Rule TC-005: Return types — ECMA-262 §15.2 ───────────────────────────────

  /**
   * Checks `return expr` against the enclosing function's declared return type.
   *
   * Walks up the scope chain to find the nearest function/arrow, then resolves
   * its declared return type annotation.
   *
   * ECMA-262 §15.2 Function Definitions (Runtime Semantics):
   * https://tc39.es/ecma262/#sec-function-definitions
   */
  private checkReturnStatement(path: NodePath<t.ReturnStatement>): void {
    const fnPath = path.getFunctionParent()
    if (!fnPath) return

    const fnNode = fnPath.node as t.Function
    const returnAnnotation = fnNode.returnType
      ? (fnNode.returnType as t.TSTypeAnnotation).typeAnnotation
      : null
    let declaredReturn = resolveType(returnAnnotation)

    if (declaredReturn.kind === 'any') return  // no annotation — nothing to check

    // Async functions: wrap non-Promise declared return in Promise for async check,
    // then unwrap to check the actual return value against the inner type.
    // ECMA-262 §27.2.5.4: async functions always return a Promise.
    if (fnNode.async && declaredReturn.kind !== 'promise' && declaredReturn.kind !== 'void') {
      declaredReturn = { kind: 'promise', valueType: declaredReturn }
    }

    // For async functions declared as Promise<T>, check the actual return against T.
    let checkAgainst: Type = declaredReturn
    if (fnNode.async && declaredReturn.kind === 'promise') {
      checkAgainst = (declaredReturn as PromiseType).valueType
    }

    const returnArg = path.node.argument
    let actualType = inferExprType(returnArg ?? null, this.env)

    // Async functions flatten Promise-returning expressions (Promise resolution procedure).
    // ECMA-262 §27.2.5.4: `return p` inside an async function unwraps `p` if it is a thenable.
    if (fnNode.async && actualType.kind === 'promise' && checkAgainst.kind !== 'promise') {
      actualType = (actualType as PromiseType).valueType
    }

    // void function must not return a value — ECMA-262 §15.2
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

  // ── Rule TC-006: Call expression argument types — ECMA-262 §13.3.8 ───────────

  /**
   * Checks that `yield x` yields a value consistent with the enclosing generator's
   * declared yield type (Generator<Y,R,N> annotation).
   *
   * ECMA-262 §15.5.1 (YieldExpression):
   * https://tc39.es/ecma262/#sec-yield
   */
  private checkYieldExpression(path: NodePath<t.YieldExpression>): void {
    const { node } = path
    if (!node.argument) return
    // yield* delegates to another iterable — argument is the iterable, not a single yield value
    if (node.delegate) return
    if (this.generatorYieldStack.length === 0) return
    const declaredYieldType = this.generatorYieldStack[this.generatorYieldStack.length - 1]
    if (declaredYieldType.kind === 'any') return
    const argType = inferExprType(node.argument, this.env)
    if (!isConsistent(argType, declaredYieldType)) {
      this.report({
        code: 'SJS-E006',
        severity: 'error',
        message: `Yield type mismatch: declared yield type is '${declaredYieldType.kind}' but got '${argType.kind}'.`,
        node: node.argument,
        specUrl: 'https://tc39.es/ecma262/#sec-yield',
      })
    }
  }

  /**
   * Checks that call arguments match the callee's declared parameter types.
   *
   * Only checked when the callee is a locally-known identifier with a declared
   * FunctionType in the environment (gradual: unknown callees pass silently).
   *
   * ECMA-262 §13.3.8 (EvaluateCall):
   * https://tc39.es/ecma262/#sec-evaluatecall
   */
  private checkCallExpression(path: NodePath<t.CallExpression>): void {
    if (!t.isIdentifier(path.node.callee)) return

    const calleeName = (path.node.callee as t.Identifier).name

    // SJS-E013: eval() is forbidden — dynamic code execution is a security risk
    if (calleeName === 'eval') {
      this.report({
        code: 'SJS-E013',
        severity: 'error',
        message: `'eval()' is forbidden in SJS. Use explicit function calls or data structures instead.`,
        node: path.node,
        specUrl: 'https://tc39.es/ecma262/#sec-eval-x',
      })
      return
    }

    const calleeType = this.env.get(calleeName)
    if (!calleeType || calleeType.kind !== 'function') return

    const fnType = calleeType as FunctionType
    const requiredParams = fnType.params.filter(p => !p.optional)
    // If any argument is a SpreadElement, arity cannot be statically determined
    const hasSpread = path.node.arguments.some(a => t.isSpreadElement(a))

    for (let i = 0; i < fnType.params.length; i++) {
      const param = fnType.params[i]
      const arg = path.node.arguments[i]

      if (!arg) {
        // Skip missing-argument errors when a spread is present (spread may cover the gap)
        if (!param.optional && !hasSpread) {
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

      if (!t.isExpression(arg)) {
        // SpreadElement — check element type of the spread source against the expected param
        if (t.isSpreadElement(arg)) {
          const spreadSrcType = inferExprType((arg as t.SpreadElement).argument as t.Expression, this.env)
          let elemType: Type = T_ANY
          if (spreadSrcType.kind === 'array') elemType = (spreadSrcType as ArrayType).elementType
          else if (spreadSrcType.kind === 'generator') elemType = (spreadSrcType as GeneratorType).yieldType
          if (elemType.kind !== 'any' && !isConsistent(elemType, param.type)) {
            this.report({
              code: 'SJS-E003',
              severity: 'error',
              message: `Spread argument element type '${elemType.kind}' is not compatible with parameter '${param.name}' of type '${param.type.kind}'.`,
              node: (arg as t.SpreadElement).argument as t.Expression,
              specUrl: 'https://tc39.es/ecma262/#sec-runtime-semantics-argumentlistevaluation',
            })
          }
        }
        continue
      }

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

  // ── Rule: FunctionDeclaration registration — ECMA-262 §15.2 ─────────────────

  /**
   * Registers a named function declaration in the type environment so that
   * call sites can look up its parameter and return types.
   *
   * ECMA-262 §15.2 Function Definitions:
   * https://tc39.es/ecma262/#sec-function-definitions
   */
  private registerFunctionDeclaration(path: NodePath<t.FunctionDeclaration>): void {
    const { node } = path
    if (!node.id) return

    const returnAnnotation = node.returnType
      ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
      : null

    const params = node.params.map(p => {
      const paramName = t.isIdentifier(p) ? p.name
        : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) ? p.left.name : '_')

      const hasAnnotation = t.isIdentifier(p) && p.typeAnnotation
        || (t.isAssignmentPattern(p) && t.isIdentifier(p.left) && p.left.typeAnnotation)

      const paramType = t.isIdentifier(p) && p.typeAnnotation
        ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
        : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) && p.left.typeAnnotation
            ? resolveType((p.left.typeAnnotation as t.TSTypeAnnotation).typeAnnotation)
            : T_ANY)

      // SJS-W001: implicit any parameter — TypeScript noImplicitAny
      if (this.strict && !hasAnnotation && paramName !== '_') {
        this.report({
          code: 'SJS-W001',
          severity: 'warning',
          message: `Parameter '${paramName}' implicitly has type 'any' because it lacks a type annotation.`,
          node: p,
          specUrl: 'https://www.typescriptlang.org/tsconfig/#noImplicitAny',
        })
      }

      return {
        name: paramName,
        type: paramType,
        optional: t.isIdentifier(p) ? (p.optional ?? false) : t.isAssignmentPattern(p),
      }
    })

    const fnType: FunctionType = {
      kind: 'function',
      params,
      returnType: resolveType(returnAnnotation),
    }

    // Generator function: register as GeneratorType (the function returns a generator)
    if (node.generator) {
      const resolvedReturn = fnType.returnType
      // Determine yield type from declared Generator<Y,R,N> annotation or use any
      const genYieldType = resolvedReturn.kind === 'generator'
        ? (resolvedReturn as GeneratorType).yieldType
        : T_ANY
      const genReturnType = resolvedReturn.kind === 'generator'
        ? (resolvedReturn as GeneratorType).returnType
        : T_ANY
      const genType: GeneratorType = {
        kind: 'generator',
        yieldType: genYieldType,
        returnType: genReturnType,
        nextType: T_ANY,
        async: node.async ?? false,
      }
      this.env.set(node.id.name, genType)
      return
    }

    // Register type guard if the return type is a TSTypePredicate (x is T)
    if (returnAnnotation && returnAnnotation.type === 'TSTypePredicate') {
      const pred = returnAnnotation as t.TSTypePredicate
      if (pred.typeAnnotation && t.isIdentifier(pred.parameterName)) {
        const guardParamName = (pred.parameterName as t.Identifier).name
        const guardParamIndex = params.findIndex(p => p.name === guardParamName)
        if (guardParamIndex >= 0) {
          const narrowedType = resolveType(pred.typeAnnotation.typeAnnotation)
          this.typeGuardRegistry.set(node.id.name, { paramIndex: guardParamIndex, narrowedType })
        }
      }
    }

    this.env.set(node.id.name, fnType)
  }

  // ── Rule TC-005: Arrow function concise body return check — ECMA-262 §15.3 ───

  /**
   * Checks arrow functions with concise bodies (`=> expr`).
   * These have no `ReturnStatement` node — the expression IS the return value.
   *
   * ECMA-262 §15.3 Arrow Function Definitions:
   * https://tc39.es/ecma262/#sec-arrow-function-definitions
   */
  private checkArrowConciseReturn(path: NodePath<t.ArrowFunctionExpression>): void {
    const { node } = path

    // SJS-W001: implicit any for each unannotated arrow parameter
    if (this.strict) {
      for (const p of node.params) {
        const paramName = t.isIdentifier(p) ? p.name
          : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) ? p.left.name : '_')
        const hasAnnotation = t.isIdentifier(p) && p.typeAnnotation
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

    if (t.isBlockStatement(node.body)) return  // block body — handled by ReturnStatement

    const returnAnnotation = node.returnType
      ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
      : null
    const declaredReturn = resolveType(returnAnnotation)
    if (declaredReturn.kind === 'any') return  // no annotation

    // Async arrow: for declared Promise<T>, check actual against T.
    // ECMA-262 §27.2.5.4: async functions always return a Promise.
    let checkAgainst: Type = declaredReturn
    if (node.async && declaredReturn.kind === 'promise') {
      checkAgainst = (declaredReturn as PromiseType).valueType
    }
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

  // ── Rule TC-007: Sum type alias registration ──────────────────────────────────

  /**
   * Detects `type Result = Ok | Err` (TSTypeAliasDeclaration with TSUnionType RHS
   * where all members are TSTypeReferences). Registers the alias name → SumType
   * in sumTypeRegistry so that variable declarations `r: Result` can resolve it.
   */
  private registerSumTypeAlias(path: NodePath<t.TSTypeAliasDeclaration>): void {
    const { node } = path
    const aliasName = node.id.name
    const rhs = node.typeAnnotation

    if (rhs.type !== 'TSUnionType') return

    // All members must be TSTypeReferences (named types)
    const memberNames: string[] = []
    for (const member of rhs.types) {
      if (member.type !== 'TSTypeReference') return
      const typeName = member.typeName
      if (!t.isIdentifier(typeName)) return
      memberNames.push(typeName.name)
    }

    // Build SumType with placeholder variants — tags will be filled in later
    // via resolveRegistryVariants when we have variantTagRegistry populated,
    // or we build from memberNames directly (each memberName IS the tag in SJS output)
    const variants: SumVariantType[] = memberNames.map(name => ({
      kind: 'sumVariant' as const,
      tag: name,
      fields: [],
    }))

    const sumType: SumType = {
      kind: 'sum',
      name: aliasName,
      variants,
    }

    this.sumTypeRegistry.set(aliasName, sumType)
  }

  // ── Rule TC-007: Variant constructor registration ─────────────────────────────

  /**
   * Detects constructor arrows generated by the preprocessor:
   *   const Ok = (_0: number): Ok => ({ _tag: "Ok" as const, _0 })
   * Extracts the `_tag` value and associates it with the return type name.
   * This populates variantTagRegistry for use in resolveType.
   */
  private registerVariantConstructor(path: NodePath<t.VariableDeclarator>): void {
    const { node } = path
    if (!t.isIdentifier(node.id)) return
    if (!node.init || !t.isArrowFunctionExpression(node.init)) return

    const arrow = node.init
    // Arrow must have a block body or object expression body
    let objExpr: t.ObjectExpression | null = null
    if (t.isObjectExpression(arrow.body)) {
      objExpr = arrow.body
    } else if (t.isBlockStatement(arrow.body)) {
      // Not a concise arrow — skip
      return
    }
    if (!objExpr) return

    // Find _tag property with a StringLiteral value (possibly TSAsExpression)
    for (const prop of objExpr.properties) {
      if (!t.isObjectProperty(prop)) continue
      if (!t.isIdentifier(prop.key, { name: '_tag' })) continue

      let tagValue: string | null = null
      if (t.isStringLiteral(prop.value)) {
        tagValue = prop.value.value
      } else if (t.isTSAsExpression(prop.value) && t.isStringLiteral(prop.value.expression)) {
        tagValue = (prop.value.expression as t.StringLiteral).value
      }

      if (tagValue) {
        this.variantTagRegistry.set(tagValue, node.id.name)
      }
      break
    }
  }

  // ── Rule SJS-E004: Binary expression — BigInt + Number mix — ECMA-262 §6.1.6.2 ─

  /**
   * Checks binary expressions for the BigInt + Number mixing prohibition.
   *
   * ECMAScript §6.1.6.2 forbids mixing BigInt and Number operands in arithmetic.
   * Doing so throws a TypeError at runtime; we surface it at compile time as SJS-E004.
   *
   * ECMA-262 §13.15.4 ApplyStringOrNumericBinaryOperator:
   * https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator
   */
  private checkBinaryExpression(path: NodePath<t.BinaryExpression>): void {
    const { node } = path
    if (!ARITH_OPS.has(node.operator)) return
    if (!t.isExpression(node.left)) return

    const left  = inferExprType(node.left,  this.env)
    const right = inferExprType(node.right, this.env)

    if (
      (left.kind === 'bigint' && right.kind === 'number') ||
      (left.kind === 'number' && right.kind === 'bigint')
    ) {
      this.report({
        code: 'SJS-E004',
        severity: 'error',
        message: `I cannot mix BigInt and Number in arithmetic '${node.operator}'. BigInt and Number are incompatible numeric types — use explicit conversion. (ECMA-262 §6.1.6.2)`,
        node,
        specUrl: SPEC.BIGINT_TYPE,
      })
    }
  }

  // ── Rule SJS-E007: Switch exhaustiveness check ────────────────────────────────

  /**
   * Checks `switch (x._tag)` for exhaustiveness against the known sum type.
   * Emits SJS-E007 if any variant tag is not covered and there is no default case.
   *
   * spec: https://github.com/hbarve1/super-js/blob/master/specs/001-superjs-core-language/type-system-v2.md#45-pattern-matching
   */
  private checkSwitchExhaustiveness(path: NodePath<t.SwitchStatement>): void {
    const disc = path.node.discriminant

    // Only handle `x._tag` patterns
    if (!t.isMemberExpression(disc)) return
    if (!t.isIdentifier(disc.property, { name: '_tag' })) return
    if (!t.isIdentifier(disc.object)) return

    const varName = disc.object.name
    const varType = this.env.get(varName)

    // Resolve the type — may be stored as 'any' if we couldn't resolve it,
    // or as a SumType if checkVariableDeclaration found a known sum type alias
    let sumType: SumType | null = null
    if (varType && varType.kind === 'sum') {
      sumType = varType as SumType
    } else {
      // Fallback: try to find the sum type by looking at what type is declared
      // for this variable in the env — not possible without declared annotation.
      return
    }

    // If there's a default case, the switch is exhaustive by definition
    const hasDefault = path.node.cases.some(c => c.test === null)
    if (hasDefault) return

    const covered = new Set(
      path.node.cases
        .filter(c => c.test !== null && t.isStringLiteral(c.test))
        .map(c => (c.test as t.StringLiteral).value)
    )

    const missing = sumType.variants
      .map(v => v.tag)
      .filter(tag => !covered.has(tag))

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

  // ── S1: if/else statement — ECMA-262 §14.6 ───────────────────────────────────

  /**
   * Checks an if/else statement.
   * Applies simple type narrowing in the then-branch based on the condition.
   * Narrowings are tracked and restored when the IfStatement exits.
   *
   * ECMA-262 §14.6 The if Statement:
   * https://tc39.es/ecma262/#sec-if-statement
   */
  private checkIfStatement(path: NodePath<t.IfStatement>): void {
    const { node } = path
    // Check condition expression for type errors (e.g. calling non-function)
    inferExprType(node.test as t.Expression, this.env)

    // Early-exit guard: `if (!x) return/throw` narrows x to non-null in continuation
    if (t.isUnaryExpression(node.test) &&
        (node.test as t.UnaryExpression).operator === '!' &&
        t.isIdentifier((node.test as t.UnaryExpression).argument)) {
      const name = ((node.test as t.UnaryExpression).argument as t.Identifier).name
      const isEarlyExit = this.isEarlyExitBlock(node.consequent)
      if (isEarlyExit) {
        const current = this.env.get(name)
        if (current && isNullableType(current)) {
          const narrowed = stripNullable(current)
          this.env.set(name, narrowed)
          // Track in block scope for cleanup
          if (this.blockVarStack.length > 0) {
            this.blockVarStack[this.blockVarStack.length - 1].add(name)
          }
        }
        // Push empty saved state so exit handler doesn't crash
        this.narrowingStack.push(new Map())
        return
      }
    }

    // Apply type narrowing from the condition
    const saved = new Map<string, Type>()
    const narrowings = this.extractNarrowings(node.test)
    for (const [name, narrowed] of narrowings) {
      const current = this.env.get(name)
      if (current !== undefined) {
        saved.set(name, current)
        this.env.set(name, narrowed)
      }
    }
    this.narrowingStack.push(saved)
  }

  /** Returns true if a statement is an early exit (return/throw) or a block containing only those. */
  private isEarlyExitBlock(stmt: t.Statement): boolean {
    if (t.isReturnStatement(stmt) || t.isThrowStatement(stmt)) return true
    if (t.isBlockStatement(stmt)) {
      return stmt.body.length > 0 &&
        stmt.body.every(s => t.isReturnStatement(s) || t.isThrowStatement(s))
    }
    return false
  }

  /**
   * Extracts simple type narrowings from a condition expression.
   * Returns a Map of name → narrowed type.
   * Handles: `typeof x === 'T'`, `x !== null`, `x != null`, `if (x)` truthy.
   */
  private extractNarrowings(cond: t.Node): Map<string, Type> {
    const result = new Map<string, Type>()

    // `if (x)` — truthy check narrows away null/undefined
    if (t.isIdentifier(cond)) {
      const name = (cond as t.Identifier).name
      const current = this.env.get(name)
      if (current && isNullableType(current)) {
        const narrowed = stripNullable(current)
        result.set(name, narrowed)
      }
      return result
    }

    // `if (x && y)` — both sides get truthy narrowing
    if (t.isLogicalExpression(cond) && (cond as t.LogicalExpression).operator === '&&') {
      const le = cond as t.LogicalExpression
      const leftNarrowings = this.extractNarrowings(le.left)
      const rightNarrowings = this.extractNarrowings(le.right)
      for (const [k, v] of leftNarrowings) result.set(k, v)
      for (const [k, v] of rightNarrowings) result.set(k, v)
      return result
    }

    // User-defined type guard call: `isString(x)` → narrow x to string
    if (t.isCallExpression(cond)) {
      const call = cond as t.CallExpression
      // Array.isArray(x) — narrow x to any[]
      if (t.isMemberExpression(call.callee) &&
          t.isIdentifier((call.callee as t.MemberExpression).object, { name: 'Array' }) &&
          t.isIdentifier((call.callee as t.MemberExpression).property, { name: 'isArray' })) {
        const arg = call.arguments[0]
        if (arg && t.isIdentifier(arg)) {
          result.set((arg as t.Identifier).name, { kind: 'array', elementType: T_ANY } as ArrayType)
        }
        return result
      }
      // User-defined type guard: `guardFn(x)` where guardFn returns `x is T`
      if (t.isIdentifier(call.callee)) {
        const fnName = (call.callee as t.Identifier).name
        const guard = this.typeGuardRegistry.get(fnName)
        if (guard) {
          const arg = call.arguments[guard.paramIndex]
          if (arg && t.isIdentifier(arg)) {
            result.set((arg as t.Identifier).name, guard.narrowedType)
          }
        }
      }
      return result
    }

    if (!t.isBinaryExpression(cond)) return result

    const { operator, left, right } = cond

    // `typeof x === 'string'` style narrowing
    if ((operator === '===' || operator === '==') &&
        t.isUnaryExpression(left) && left.operator === 'typeof' &&
        t.isIdentifier(left.argument) && t.isStringLiteral(right)) {
      const name = (left.argument as t.Identifier).name
      const typeName = right.value
      const narrowed = typeNameToType(typeName)
      if (narrowed) result.set(name, narrowed)
    }

    // `x !== null` — narrow to non-null
    if ((operator === '!==' || operator === '!=') && t.isNullLiteral(right) && t.isIdentifier(left)) {
      const name = (left as t.Identifier).name
      const current = this.env.get(name)
      if (current) {
        result.set(name, stripNullable(current) === T_ANY ? current : stripNullable(current))
      }
    }

    // `x !== undefined` — narrow to defined
    if ((operator === '!==' || operator === '!=') &&
        t.isIdentifier(right, { name: 'undefined' }) && t.isIdentifier(left)) {
      const name = (left as t.Identifier).name
      const current = this.env.get(name)
      if (current) {
        result.set(name, stripNullable(current) === T_ANY ? current : stripNullable(current))
      }
    }

    // `x instanceof Foo` — narrow x to an instance of Foo
    if (operator === 'instanceof' && t.isIdentifier(left) && t.isIdentifier(right)) {
      const name = (left as t.Identifier).name
      const className = (right as t.Identifier).name
      // Build an ObjectType from known class fields + branded with class name
      const fieldTypes = this.classFieldTypes.get(className)
      const properties = new Map<string, Type>()
      if (fieldTypes) for (const [k, v] of fieldTypes) properties.set(k, v)
      result.set(name, { kind: 'object', brand: className, properties } as ObjectType)
    }

    return result
  }

  // ── S2: Loop statements — ECMA-262 §14.7 ─────────────────────────────────────

  /**
   * Handles `for (const x of iterable)` — registers loop variable with element type.
   *
   * ECMA-262 §14.7.5 The for-of Statement:
   * https://tc39.es/ecma262/#sec-for-in-and-for-of-statements
   */
  private checkForOfStatement(path: NodePath<t.ForOfStatement>): void {
    const { node } = path
    if (!t.isVariableDeclaration(node.left)) return

    const rightType = t.isExpression(node.right)
      ? inferExprType(node.right, this.env)
      : T_ANY

    let elemType: Type = T_ANY
    if (rightType.kind === 'array') {
      elemType = (rightType as ArrayType).elementType
    } else if (rightType.kind === 'string') {
      elemType = T_STRING
    } else if (rightType.kind === 'generator') {
      elemType = (rightType as GeneratorType).yieldType
    } else if (rightType.kind === 'object') {
      const brand = (rightType as ObjectType).brand
      if (brand === 'Map') {
        // for (const [k, v] of map) — element is [K, V] tuple
        elemType = { kind: 'tuple', elements: [
          (rightType as ObjectType & { mapKeyType?: Type }).mapKeyType ?? T_ANY,
          (rightType as ObjectType & { mapValueType?: Type }).mapValueType ?? T_ANY,
        ] } as TupleType
      } else if (brand === 'Set') {
        // for (const x of set) — element is T
        elemType = (rightType as ObjectType & { setElementType?: Type }).setElementType ?? T_ANY
      }
    }

    for (const decl of node.left.declarations) {
      if (t.isIdentifier(decl.id)) {
        this.env.set(decl.id.name, elemType)
        if (this.blockVarStack.length > 0) {
          this.blockVarStack[this.blockVarStack.length - 1].add(decl.id.name)
        }
      } else if (t.isObjectPattern(decl.id)) {
        // for (const { a, b } of arr) — destructure each iteration value
        const iterObjType: Type = elemType.kind === 'object' ? elemType : T_ANY
        for (const prop of decl.id.properties) {
          if (t.isRestElement(prop)) {
            if (t.isIdentifier(prop.argument)) {
              this.env.set(prop.argument.name, T_ANY)
              if (this.blockVarStack.length > 0) this.blockVarStack[this.blockVarStack.length - 1].add(prop.argument.name)
            }
            continue
          }
          if (!t.isObjectProperty(prop)) continue
          const key = t.isIdentifier(prop.key) ? prop.key.name
            : t.isStringLiteral(prop.key) ? prop.key.value : null
          const binding = t.isIdentifier(prop.value) ? prop.value.name
            : (t.isAssignmentPattern(prop.value) && t.isIdentifier((prop.value as t.AssignmentPattern).left))
              ? ((prop.value as t.AssignmentPattern).left as t.Identifier).name
              : null
          if (!key || !binding) continue
          const propType = iterObjType.kind === 'object'
            ? (iterObjType as ObjectType).properties.get(key) ?? T_ANY
            : T_ANY
          this.env.set(binding, propType)
          if (this.blockVarStack.length > 0) this.blockVarStack[this.blockVarStack.length - 1].add(binding)
        }
      } else if (t.isArrayPattern(decl.id)) {
        // for (const [a, b] of arr) — destructure array elements
        for (let i = 0; i < decl.id.elements.length; i++) {
          const elem = decl.id.elements[i]
          if (!elem) continue
          const elemT = elemType.kind === 'tuple'
            ? ((elemType as TupleType).elements[i] ?? T_ANY)
            : (elemType.kind === 'array' ? (elemType as ArrayType).elementType : T_ANY)
          if (t.isIdentifier(elem)) {
            this.env.set(elem.name, elemT)
            if (this.blockVarStack.length > 0) this.blockVarStack[this.blockVarStack.length - 1].add(elem.name)
          } else if (t.isAssignmentPattern(elem) && t.isIdentifier(elem.left)) {
            this.env.set(elem.left.name, elemT)
            if (this.blockVarStack.length > 0) this.blockVarStack[this.blockVarStack.length - 1].add(elem.left.name)
          }
        }
      }
    }
  }

  /**
   * Handles `for (const key in obj)` — loop variable is typed as `string`.
   *
   * ECMA-262 §14.7.5 The for-in Statement:
   * https://tc39.es/ecma262/#sec-for-in-and-for-of-statements
   */
  private checkForInStatement(path: NodePath<t.ForInStatement>): void {
    const { node } = path
    if (!t.isVariableDeclaration(node.left)) return

    for (const decl of node.left.declarations) {
      if (t.isIdentifier(decl.id)) {
        this.env.set(decl.id.name, T_STRING)
        if (this.blockVarStack.length > 0) {
          this.blockVarStack[this.blockVarStack.length - 1].add(decl.id.name)
        }
      }
    }
  }

  // ── S3: try/catch/throw — ECMA-262 §14.15 ────────────────────────────────────

  /**
   * Handles try/catch — registers catch binding.
   * In strict mode, catch binding is typed as `unknown` (approximated as any for now).
   * In non-strict mode, catch binding is typed as `any`.
   *
   * ECMA-262 §14.15 The try Statement:
   * https://tc39.es/ecma262/#sec-try-statement
   */
  private checkTryStatement(path: NodePath<t.TryStatement>): void {
    const { node } = path
    if (!node.handler) return

    const param = node.handler.param
    if (!param) return  // optional catch binding (ES2019)

    if (t.isIdentifier(param)) {
      // Catch binding is unknown/any — we use any for prototype compatibility
      this.env.set(param.name, T_ANY)
    }
  }

  // ── S4: import/export — ECMA-262 §16.2 ───────────────────────────────────────

  /**
  // ── Rule TC-SJS4: Class member access visibility — SJS-E011 ──────────────────

  /**
   * Checks `expr.field` member expressions for access modifier violations.
   *
   * Emits SJS-E011 when:
   *   - `obj.field` where `obj` is a known class instance and `field` is `private`,
   *     and the access occurs outside the class's own methods.
   */
  private checkMemberAccess(path: NodePath<t.MemberExpression>): void {
    const { node } = path
    if (node.computed) return  // Skip computed access obj[expr]
    if (!t.isIdentifier(node.property)) return

    const propName = node.property.name
    let owningClass: string | null = null

    if (t.isThisExpression(node.object)) {
      // this.field — owning class is the current class method context
      owningClass = this.currentClassMethodName
    } else if (t.isIdentifier(node.object)) {
      // someVar.field — look up the class from classInstanceBindings
      owningClass = this.classInstanceBindings.get(node.object.name) ?? null
    }

    if (!owningClass) return

    // Look up member visibility in the persistent class registry
    const members = this.classRegistry.get(owningClass)
    if (!members) return

    const visibility = members.get(propName)
    if (visibility !== 'private' && visibility !== 'protected') return

    // Private members can only be accessed from within the class's own methods
    const isInsideOwningClass = this.currentClassMethodName === owningClass
    if (isInsideOwningClass) return

    this.report({
      code: 'SJS-E011',
      severity: 'error',
      message: `Cannot access '${visibility}' member '${propName}' of class '${owningClass}' from outside the class.`,
      node: path.node,
      specUrl: 'https://github.com/hbarve1/super-js/blob/master/specs/001-superjs-core-language/type-system-v2.md',
    })
  }

  // ── Rule TC-SJS5: implements clause structural conformance ───────────────────

  /**
   * Verifies that a class body contains all members required by each implemented interface.
   * Emits SJS-E012 for each missing member.
   */
  private checkImplementsClauses(path: NodePath<t.ClassDeclaration | t.ClassExpression>): void {
    const { node } = path
    if (!node.implements || node.implements.length === 0) return

    const className = node.id?.name ?? '__anonymous__'

    // Collect actual class member names (including abstract/declare members)
    const classMemberNames = new Set<string>()
    for (const member of node.body.body) {
      const isClassMember = t.isClassMethod(member) || t.isClassProperty(member) ||
        t.isTSDeclareMethod(member)
      if (isClassMember && t.isIdentifier((member as t.ClassMethod).key)) {
        classMemberNames.add(((member as t.ClassMethod).key as t.Identifier).name)
      }
    }

    for (const impl of node.implements) {
      if (!t.isTSExpressionWithTypeArguments(impl)) continue
      if (!t.isIdentifier(impl.expression)) continue
      const ifaceName = (impl.expression as t.Identifier).name
      const required = this.interfaceRegistry.get(ifaceName)
      if (!required) continue

      for (const reqMember of required) {
        if (!classMemberNames.has(reqMember)) {
          this.report({
            code: 'SJS-E012',
            severity: 'error',
            message: `Class '${className}' does not implement member '${reqMember}' required by interface '${ifaceName}'.`,
            node: path.node,
            specUrl: 'https://github.com/hbarve1/super-js/blob/master/specs/001-superjs-core-language/type-system-v2.md',
          })
        }
      }
    }
  }

  /**
   * Handles import declarations — registers imported bindings in the type env.
   * Cross-file type resolution is not implemented; all imports get type `any`.
   *
   * ECMA-262 §16.2.2 Imports:
   * https://tc39.es/ecma262/#sec-imports
   */
  private checkImportDeclaration(path: NodePath<t.ImportDeclaration>): void {
    const isTypeOnlyDecl = path.node.importKind === 'type'
    for (const specifier of path.node.specifiers) {
      let localName: string | null = null
      if (t.isImportDefaultSpecifier(specifier)) {
        localName = specifier.local.name
      } else if (t.isImportNamespaceSpecifier(specifier)) {
        localName = specifier.local.name
      } else if (t.isImportSpecifier(specifier)) {
        localName = specifier.local.name
      }
      if (localName) {
        this.env.set(localName, T_ANY)
        // SJS-E009: mark type-only imports (whole decl or individual specifier)
        const isTypeOnlySpecifier = t.isImportSpecifier(specifier) &&
          (specifier as t.ImportSpecifier).importKind === 'type'
        if (isTypeOnlyDecl || isTypeOnlySpecifier) {
          this.typeOnlyBindings.add(localName)
        }
      }
    }
  }

  /**
   * Handles named exports — type-checks the declaration if present.
   *
   * ECMA-262 §16.2.3 Exports:
   * https://tc39.es/ecma262/#sec-exports
   */
  private checkExportNamedDeclaration(_path: NodePath<t.ExportNamedDeclaration>): void {
    // The declaration (if present) is handled by its own handler (VariableDeclaration, etc.)
  }

  // ── Rule SJS-E005: Nullable member access ────────────────────────────────────

  private checkNullableMemberAccess(path: NodePath<t.MemberExpression>): void {
    const node = path.node
    // Optional chaining (obj?.prop) is safe — skip
    if (node.optional) return

    const objExpr = t.isExpression(node.object) ? node.object : null
    if (!objExpr) return

    const objType = inferExprType(objExpr, this.env)
    // Only flag union types that explicitly include null or undefined
    if (objType.kind !== 'union') return

    const types = (objType as UnionType).types
    const hasNull = types.some((m: Type) => m.kind === 'null')
    const hasUndefined = types.some((m: Type) => m.kind === 'undefined')
    if (!hasNull && !hasUndefined) return

    this.report({
      code: 'SJS-E005',
      severity: 'error',
      message: `Unsafe member access on nullable type. Use '?.' optional chaining or an explicit null check.`,
      node: path.node,
      specUrl: 'https://github.com/hbarve1/super-js/blob/master/specs/001-superjs-core-language/type-system.md',
    })
  }

  // ── Rule SJS-E006: Non-null assertion ban ─────────────────────────────────────

  private checkNonNullAssertion(path: NodePath<t.TSNonNullExpression>): void {
    this.report({
      code: 'SJS-E006',
      severity: 'error',
      message: `Non-null assertion '!' is banned in SJS. Use optional chaining '?.' or an explicit null check instead.`,
      node: path.node,
      specUrl: 'https://github.com/hbarve1/super-js/blob/master/specs/001-superjs-core-language/type-system.md',
    })
  }

  // ── Rule SJS-E005: Member access on nullable type ─────────────────────────────

  // ── Diagnostic helper ─────────────────────────────────────────────────────────

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
