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
  Type, Diagnostic, TypeEnvironment,
  AnyType, NumberType, StringType, BooleanType,
  NullType, UndefinedType, VoidType,
  UnionType, FunctionType,
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
    // Array — e.g. number[]
    case 'TSArrayType':
      return { kind: 'array', elementType: resolveType(node.elementType) }
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
    default:
      return T_ANY  // gradual fallback — unknown annotation treated as any
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
  private diagnostics: Diagnostic[] = []
  private env: TypeEnvironment = new Map()
  private readonly strict: boolean

  constructor(options: TypeCheckerOptions = {}) {
    this.strict = options.strict ?? false
  }

  getDiagnostics(): Diagnostic[] {
    return [...this.diagnostics]
  }

  reset(): void {
    this.diagnostics = []
    this.env = new Map()
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
      const declared = hasAnnotation
        ? resolveType(annotation.typeAnnotation)
        : T_ANY

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

    if (declaredReturn.kind === 'any') return  // no annotation — nothing to check

    const returnArg = path.node.argument
    const actualType = inferExprType(returnArg ?? null, this.env)

    // void function must not return a value — ECMA-262 §15.2
    if (declaredReturn.kind === 'void' && returnArg) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I found a return value in a function declared as 'void'. A void function must not return a value.`,
        node: returnArg,
        specUrl: SPEC.FUNCTION_DEF,
      })
      return
    }

    if (!isConsistent(actualType, declaredReturn)) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I expected this function to return '${declaredReturn.kind}' but found '${actualType.kind}'.`,
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

    const actualType = inferExprType(node.body, this.env)
    if (!isConsistent(actualType, declaredReturn)) {
      this.report({
        code: 'SJS-E002',
        severity: 'error',
        message: `I expected this arrow function to return '${declaredReturn.kind}' but found '${actualType.kind}'.`,
        node: node.body,
        specUrl: 'https://tc39.es/ecma262/#sec-arrow-function-definitions',
      })
    }
  }

  // ── Diagnostic helper ─────────────────────────────────────────────────────────

  private report(opts: {
    code: string
    severity: Diagnostic['severity']
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
