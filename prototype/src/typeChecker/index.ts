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
  UnionType, FunctionType, SumType, SumVariantType,
  TypeParamType, PromiseType,
} from './types'

// ── Singleton primitive types ─────────────────────────────────────────────────

const T_ANY:       AnyType       = { kind: 'any' }
const T_NUMBER:    NumberType    = { kind: 'number' }
const T_STRING:    StringType    = { kind: 'string' }
const T_BOOLEAN:   BooleanType   = { kind: 'boolean' }
const T_NULL:      NullType      = { kind: 'null' }
const T_UNDEFINED: UndefinedType = { kind: 'undefined' }
const T_VOID:      VoidType      = { kind: 'void' }

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
  // Async function definitions — ECMA-262 §15.8
  ASYNC_FUNCTION: 'https://tc39.es/ecma262/#sec-async-function-definitions',
} as const

// ── Resolve: TSType node → Type ───────────────────────────────────────────────

/**
 * Converts a Babel TSType AST node to our internal Type representation.
 *
 * Each keyword maps to its ECMAScript Language Type (ECMA-262 §6.1.*).
 * Unknown or unsupported annotations fall back to `any` (gradual escape).
 */
function resolveType(node: t.TSType | null | undefined, typeParamNames?: string[]): Type {
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
      const types = node.types.map(n => resolveType(n, typeParamNames))
      return { kind: 'union', types } satisfies UnionType
    }
    // Array — e.g. number[]
    case 'TSArrayType':
      return { kind: 'array', elementType: resolveType(node.elementType, typeParamNames) }
    // Generic type reference — e.g. T, Array<T>, Promise<T>
    case 'TSTypeReference': {
      const typeName = node.typeName
      if (!t.isIdentifier(typeName)) return T_ANY
      const name = typeName.name
      // Type parameter placeholder — e.g. T, U
      if (typeParamNames && typeParamNames.includes(name)) {
        return { kind: 'typeParam', name } satisfies TypeParamType
      }
      // Array<T> — generic array shorthand
      if (name === 'Array' && node.typeParameters?.params.length === 1) {
        return { kind: 'array', elementType: resolveType(node.typeParameters.params[0], typeParamNames) }
      }
      // Promise<T> — ECMA-262 §27.2 Promise Objects
      if (name === 'Promise') {
        const valueType = node.typeParameters?.params.length === 1
          ? resolveType(node.typeParameters.params[0], typeParamNames)
          : T_ANY
        return { kind: 'promise', valueType } satisfies PromiseType
      }
      return T_ANY  // unknown reference — gradual fallback
    }
    // Function type — e.g. (x: number) => string
    case 'TSFunctionType': {
      const params = node.parameters.map(p => ({
        name: t.isIdentifier(p) ? p.name : '_',
        type: resolveType(
          t.isIdentifier(p) && p.typeAnnotation
            ? (p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation
            : null,
          typeParamNames
        ),
        optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
      }))
      const returnType = node.typeAnnotation
        ? resolveType(node.typeAnnotation.typeAnnotation, typeParamNames)
        : T_ANY
      return { kind: 'function', params, returnType } satisfies FunctionType
    }
    default:
      return T_ANY  // gradual fallback — unknown annotation treated as any
  }
}

// ── Instantiate: substitute type parameters with concrete types ───────────────

/**
 * Recursively substitutes TypeParam placeholders with their bound concrete types.
 * Returns the input type unchanged if it contains no type params.
 */
function instantiate(type: Type, bindings: Map<string, Type>): Type {
  if (bindings.size === 0) return type
  switch (type.kind) {
    case 'typeParam':
      return bindings.get(type.name) ?? T_ANY
    case 'array':
      return { kind: 'array', elementType: instantiate(type.elementType, bindings) }
    case 'function':
      return {
        kind: 'function',
        typeParams: type.typeParams,
        params: type.params.map(p => ({ ...p, type: instantiate(p.type, bindings) })),
        returnType: instantiate(type.returnType, bindings),
      }
    case 'union':
      return { kind: 'union', types: type.types.map(t => instantiate(t, bindings)) }
    case 'object': {
      const props = new Map<string, Type>()
      type.properties.forEach((v, k) => props.set(k, instantiate(v, bindings)))
      return { kind: 'object', properties: props, typeParams: type.typeParams }
    }
    case 'promise':
      return { kind: 'promise', valueType: instantiate(type.valueType, bindings) }
    default:
      return type
  }
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

    // Identifier — look up in type environment
    case 'Identifier': {
      if (node.name === 'undefined') return T_UNDEFINED
      return env.get(node.name) ?? T_ANY
    }

    // Arrow function — ECMA-262 §15.3 (arrow function definitions)
    case 'ArrowFunctionExpression': {
      const returnAnnotation = node.returnType
        ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
        : null
      // Extract type params from generic arrows, e.g. <T>(x: T): T => x
      const typeParams: string[] = node.typeParameters && t.isTSTypeParameterDeclaration(node.typeParameters)
        ? node.typeParameters.params.map(p => p.name)
        : []
      const params = node.params.map(p => ({
        name: t.isIdentifier(p) ? p.name : '_',
        type: t.isIdentifier(p) && p.typeAnnotation
          ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation, typeParams)
          : T_ANY,
        optional: t.isIdentifier(p) ? (p.optional ?? false) : false,
      }))
      let returnType = resolveType(returnAnnotation, typeParams)
      // Async arrow: wrap return type in Promise<T> — ECMA-262 §15.8
      if (node.async && returnType.kind !== 'promise') {
        returnType = { kind: 'promise', valueType: returnType }
      }
      return {
        kind: 'function',
        params,
        returnType,
        ...(typeParams.length > 0 ? { typeParams } : {}),
      } satisfies FunctionType
    }

    // AwaitExpression — unwrap Promise<T> → T (ECMA-262 §6.2.6 / §27.2)
    case 'AwaitExpression': {
      const awaitNode = node as t.AwaitExpression
      const argType = inferExprType(awaitNode.argument, env)
      if (argType.kind === 'promise') return (argType as PromiseType).valueType
      return T_ANY  // awaiting non-promise or any — gradual fallback
    }

    // Call expression — infer the instantiated return type
    case 'CallExpression': {
      if (!t.isIdentifier(node.callee)) return T_ANY
      const calleeName = node.callee.name
      const calleeType = env.get(calleeName)
      if (!calleeType || calleeType.kind !== 'function') return T_ANY

      let fnType = calleeType as FunctionType
      if (fnType.typeParams && fnType.typeParams.length > 0) {
        const bindings = new Map<string, Type>()
        const explicitTypeArgs = node.typeParameters as t.TSTypeParameterInstantiation | null

        if (explicitTypeArgs?.params) {
          for (let i = 0; i < fnType.typeParams.length && i < explicitTypeArgs.params.length; i++) {
            bindings.set(fnType.typeParams[i], resolveType(explicitTypeArgs.params[i]))
          }
        } else {
          for (let i = 0; i < fnType.params.length && i < node.arguments.length; i++) {
            const paramType = fnType.params[i].type
            if (paramType.kind === 'typeParam') {
              const arg = node.arguments[i]
              if (t.isExpression(arg)) bindings.set(paramType.name, inferExprType(arg, env))
            }
          }
        }
        fnType = instantiate(fnType, bindings) as FunctionType
      }
      return fnType.returnType
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
  if (a.kind === 'never' || b.kind === 'never') return false

  // Exact match
  if (a.kind === b.kind) {
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

  return false
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
  // populated when we see constructor arrows: const Ok = (...): Ok => ({ _tag: "Ok" as const, ... })
  private variantTagRegistry: Map<string, string> = new Map()

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
  }

  // ── Main entry point — called for every AST node ────────────────────────────

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
      case 'AwaitExpression':
        this.checkAwaitExpression(path as NodePath<t.AwaitExpression>)
        break
    }
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
        // Register binding as declared type. Unannotated variables get `any` (gradual),
        // preserving the invariant that only annotated positions are checked.
        this.env.set(name, declared)
      } else {
        this.env.set(name, declared)
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
    const declaredReturn = resolveType(returnAnnotation)

    // In async functions, `return T` implicitly wraps in Promise<T>.
    // If the annotation is Promise<T>, check the return value against T not Promise<T>.
    // ECMA-262 §15.8.4 Runtime Semantics: EvaluateAsyncFunctionBody
    const isAsync = !!(fnNode as t.Function & { async?: boolean }).async
    const effectiveDeclaredReturn = (isAsync && declaredReturn.kind === 'promise')
      ? (declaredReturn as PromiseType).valueType
      : declaredReturn

    if (effectiveDeclaredReturn.kind === 'any') return  // no annotation — nothing to check

    const returnArg = path.node.argument
    const actualType = inferExprType(returnArg ?? null, this.env)

    // void function must not return a value — ECMA-262 §15.2
    if (effectiveDeclaredReturn.kind === 'void' && returnArg) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I found a return value in a function declared as 'void'. A void function must not return a value.`,
        node: returnArg,
        specUrl: SPEC.FUNCTION_DEF,
      })
      return
    }

    if (!isConsistent(actualType, effectiveDeclaredReturn)) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I expected this function to return '${effectiveDeclaredReturn.kind}' but found '${actualType.kind}'.`,
        node: returnArg ?? path.node,
        specUrl: SPEC.FUNCTION_DEF,
      })
    }
  }

  // ── Rule TC-006: Call expression argument types — ECMA-262 §13.3.8 ───────────

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
    const calleeType = this.env.get(calleeName)
    if (!calleeType || calleeType.kind !== 'function') return

    let fnType = calleeType as FunctionType

    // Generic instantiation — bind type parameters before checking arguments
    if (fnType.typeParams && fnType.typeParams.length > 0) {
      const bindings = new Map<string, Type>()
      const explicitTypeArgs = path.node.typeParameters as t.TSTypeParameterInstantiation | null

      if (explicitTypeArgs?.params) {
        // Explicit: identity<string>("hello") — use declared type args
        for (let i = 0; i < fnType.typeParams.length && i < explicitTypeArgs.params.length; i++) {
          bindings.set(fnType.typeParams[i], resolveType(explicitTypeArgs.params[i]))
        }
      } else {
        // Inferred: identity("hello") — match arg types to TypeParam params
        for (let i = 0; i < fnType.params.length && i < path.node.arguments.length; i++) {
          const paramType = fnType.params[i].type
          if (paramType.kind === 'typeParam') {
            const arg = path.node.arguments[i]
            if (t.isExpression(arg)) {
              bindings.set(paramType.name, inferExprType(arg, this.env))
            }
          }
        }
      }

      fnType = instantiate(fnType, bindings) as FunctionType
    }

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

    // Extract declared type parameters, e.g. <T, U> in function identity<T, U>
    const typeParams: string[] = node.typeParameters && t.isTSTypeParameterDeclaration(node.typeParameters)
      ? node.typeParameters.params.map(p => p.name)
      : []

    const returnAnnotation = node.returnType
      ? (node.returnType as t.TSTypeAnnotation).typeAnnotation
      : null

    const params = node.params.map(p => {
      const paramName = t.isIdentifier(p) ? p.name
        : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) ? p.left.name : '_')

      const hasAnnotation = t.isIdentifier(p) && p.typeAnnotation
        || (t.isAssignmentPattern(p) && t.isIdentifier(p.left) && p.left.typeAnnotation)

      const paramType = t.isIdentifier(p) && p.typeAnnotation
        ? resolveType((p.typeAnnotation as t.TSTypeAnnotation).typeAnnotation, typeParams)
        : (t.isAssignmentPattern(p) && t.isIdentifier(p.left) && p.left.typeAnnotation
            ? resolveType((p.left.typeAnnotation as t.TSTypeAnnotation).typeAnnotation, typeParams)
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

    let resolvedReturn = resolveType(returnAnnotation, typeParams)
    // Async function: its return type in the env is Promise<T> — ECMA-262 §15.8
    if (node.async && resolvedReturn.kind !== 'promise') {
      resolvedReturn = { kind: 'promise', valueType: resolvedReturn }
    }

    const fnType: FunctionType = {
      kind: 'function',
      params,
      returnType: resolvedReturn,
      ...(typeParams.length > 0 ? { typeParams } : {}),
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

    // Async arrow: `async () => expr` wraps expr in Promise<T>.
    // If annotation is Promise<T>, check the body expression against T.
    const effectiveDeclaredReturn = (node.async && declaredReturn.kind === 'promise')
      ? (declaredReturn as PromiseType).valueType
      : declaredReturn

    if (effectiveDeclaredReturn.kind === 'any') return  // no annotation

    const actualType = inferExprType(node.body, this.env)
    if (!isConsistent(actualType, effectiveDeclaredReturn)) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I expected this arrow function to return '${effectiveDeclaredReturn.kind}' but found '${actualType.kind}'.`,
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

  // ── Rule SJS-E009: await outside async function — ECMA-262 §15.8 ─────────────

  /**
   * Verifies that `await` is used inside an async function.
   * Top-level `await` in ES modules is valid (ES2022) and is not flagged.
   *
   * ECMA-262 §15.8 Async Function Definitions:
   * https://tc39.es/ecma262/#sec-async-function-definitions
   */
  private checkAwaitExpression(path: NodePath<t.AwaitExpression>): void {
    const fnPath = path.getFunctionParent()
    if (!fnPath) return  // top-level await — valid in ES2022 modules

    const fnNode = fnPath.node as t.Function & { async?: boolean }
    if (!fnNode.async) {
      this.report({
        code: 'SJS-E009',
        severity: 'error',
        message: `'await' cannot be used inside a non-async function. Mark the enclosing function 'async' to use 'await'.`,
        node: path.node,
        specUrl: SPEC.ASYNC_FUNCTION,
      })
    }
  }

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
