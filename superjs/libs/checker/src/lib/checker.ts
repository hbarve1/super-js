/**
 * The SJS type checker.
 *
 * Bidirectional (synthesize / check) traversal over the parsed AST. Enforces:
 *   - Null safety (E001 null→non-nullable, E003 access on nullable) with
 *     control-flow narrowing (null/typeof/instanceof/truthiness guards).
 *   - Structural assignability for objects/interfaces; nominal for sum/classes.
 *   - Sum-type variant construction + ambiguity (E008).
 *   - `match` exhaustiveness (E007) and unreachable arms (W003).
 *   - `as` assertions between unrelated types (E002).
 *   - Local + contextual inference, with `const` literal / `let` widening.
 *
 * Scope: a sound, coherent core — not the full surface. Library globals and
 * unresolved type names degrade to `dynamic` rather than producing false errors.
 */

import type {
  Program, Statement, Expression, TypeNode, Type, FunctionType, ObjectType,
  SumType, SumVariantType, PropertySignature, ParamType, Parameter, Pattern,
  VariableDecl, FunctionDecl, ClassDecl, ObjectTypeDecl, TypeDecl, BlockStatement,
  IfStatement, MatchExpression, MatchArm, MatchPattern, Identifier, Span,
} from '@superjs/types';
import { DiagnosticBag, Codes } from '@superjs/diagnostics';
import {
  NUMBER, STRING, BOOLEAN, BIGINT, SYMBOL, NULL, UNDEFINED, NEVER, UNKNOWN,
  DYNAMIC, literal, arrayOf, members, union, widen, stripNullish,
  containsNullish, display,
} from './model.js';
import { isAssignable } from './subtype.js';
import { resolveType, substitute, type TypeResolver } from './resolve.js';
import { Scope } from './scope.js';

/**
 * The exported type/value surface of a module, as an importer needs to see it.
 * Resolved types are immutable semantic {@link Type}s, safe to share across files.
 */
export interface ModuleSurface {
  /** Exported named types (alias / object / class / sum), keyed by exported name. */
  readonly types: ReadonlyMap<string, Type>;
  /** Exported sum types (subset of `types`), for variant construction + `match`. */
  readonly sums: ReadonlyMap<string, SumType>;
  /** Exported value bindings (const/let/var/function/class), keyed by exported name. */
  readonly values: ReadonlyMap<string, Type>;
}

export interface CheckOptions {
  readonly file?: string;
  readonly strict?: boolean;
  /** Record a (span → synthesized type) table for `typeAt` / LSP hover. */
  readonly recordTypes?: boolean;
  /**
   * Resolve a module specifier to its export surface, for cross-file imports.
   * Returns `undefined` when unresolvable — imported names then stay `dynamic`,
   * exactly as before module resolution existed (no false errors).
   */
  readonly resolveModule?: (specifier: string) => ModuleSurface | undefined;
}

/** One entry of the checker's type table: the type synthesized at a node's span. */
export interface TypedSpan {
  readonly span: Span;
  readonly type: Type;
}

export class Checker implements TypeResolver {
  private readonly bag: DiagnosticBag;
  private scope: Scope;
  private flow = new Map<string, Type>();
  private readonly namedTypes = new Map<string, Type>();
  private readonly sums = new Map<string, SumType>();
  /** Constructor parameter types for generic classes, for `new C(args)` inference. */
  private readonly classCtors = new Map<string, readonly ParamType[]>();
  private readonly variantIndex = new Map<string, { owner: string; variant: SumVariantType }[]>();
  private typeParams = new Set<string>();
  private expectedReturn: Type | undefined;
  private readonly recordTypes: boolean;
  private readonly typeTable: TypedSpan[] = [];

  private readonly resolveModule: CheckOptions['resolveModule'];

  constructor(opts: CheckOptions = {}) {
    this.bag = new DiagnosticBag({ file: opts.file, strict: opts.strict ?? false });
    this.scope = new Scope();
    this.recordTypes = opts.recordTypes ?? false;
    this.resolveModule = opts.resolveModule;
  }

  // ── TypeResolver ────────────────────────────────────────────────────────────
  lookupNamedType(name: string): Type | undefined {
    return this.namedTypes.get(name);
  }
  isTypeParam(name: string): boolean {
    return this.typeParams.has(name);
  }

  // ── Entry point ─────────────────────────────────────────────────────────────
  run(program: Program) {
    this.resolveImports(program.body); // pass 0: bind imported names before type collection
    this.collectTypes(program.body);
    this.hoist(program.body);
    this.checkBlock(program.body);
    return {
      diagnostics: this.bag.all,
      types: this.typeTable as readonly TypedSpan[],
      surface: this.buildSurface(program.body),
    };
  }

  // ── Cross-file imports / exports ──────────────────────────────────────────────

  /**
   * Bind names imported from other modules so they resolve to real types instead
   * of `dynamic`. Runs before type collection so imported *types* are visible to
   * this file's annotations. Unresolved specifiers are left alone (stay dynamic).
   * Default / namespace imports and `export … from` re-exports are not yet wired.
   */
  private resolveImports(body: readonly Statement[]): void {
    if (!this.resolveModule) return;
    for (const s of body) {
      if (s.kind !== 'ImportDecl' || s.named.length === 0) continue;
      const surface = this.resolveModule(s.source.value);
      if (!surface) continue;
      for (const spec of s.named) {
        const from = spec.imported.name;
        const local = spec.local.name;
        const sum = surface.sums.get(from);
        const type = surface.types.get(from);
        if (sum) {
          this.namedTypes.set(local, sum);
          this.sums.set(local, sum);
          for (const v of sum.variants) {
            const list = this.variantIndex.get(v.tag) ?? [];
            list.push({ owner: local, variant: v });
            this.variantIndex.set(v.tag, list);
          }
        } else if (type) {
          this.namedTypes.set(local, type);
        }
        if (!s.typeOnly) {
          const val = surface.values.get(from);
          if (val) this.scope.define(local, { type: val, mutable: false, kind: 'const' });
        }
      }
    }
  }

  /** Collect this module's exported type + value surface for importers to read. */
  private buildSurface(body: readonly Statement[]): ModuleSurface {
    const types = new Map<string, Type>();
    const sums = new Map<string, SumType>();
    const values = new Map<string, Type>();
    const exportAs = (local: string, exported: string): void => {
      const nt = this.namedTypes.get(local);
      if (nt) types.set(exported, nt);
      const sm = this.sums.get(local);
      if (sm) sums.set(exported, sm);
      const b = this.scope.lookup(local);
      if (b) values.set(exported, b.type);
    };
    for (const s of body) {
      if (s.kind === 'ExportNamedDecl') {
        if (s.declaration) for (const n of declaredNames(s.declaration)) exportAs(n, n);
        if (!s.source) for (const spec of s.specifiers) exportAs(spec.local.name, spec.exported.name);
      } else if (s.kind === 'ExportDefaultDecl'
        && (s.declaration.kind === 'FunctionDecl' || s.declaration.kind === 'ClassDecl')
        && s.declaration.id) {
        exportAs(s.declaration.id.name, 'default');
      }
    }
    return { types, sums, values };
  }

  // ── Pass 1: register all named types (allows recursion + forward refs) ────────
  private collectTypes(body: readonly Statement[]): void {
    // 1a. Register shells so references resolve during 1b.
    const sumShells: { decl: TypeDecl; shell: SumType }[] = [];
    const objShells: { node: ClassDecl | ObjectTypeDecl; shell: ObjectType }[] = [];
    const aliases: TypeDecl[] = [];

    for (const s of body) {
      const decl = unwrapExport(s);
      if (decl.kind === 'TypeDecl') {
        if (decl.value.kind === 'SumTypeDef') {
          const shell: SumType = {
            kind: 'sum', name: decl.id.name, variants: [],
            ...(decl.typeParams ? { typeParams: decl.typeParams.map((t) => t.name.name) } : {}),
          };
          this.namedTypes.set(decl.id.name, shell);
          this.sums.set(decl.id.name, shell);
          sumShells.push({ decl, shell });
        } else {
          aliases.push(decl);
        }
      } else if (decl.kind === 'ObjectTypeDecl' || decl.kind === 'ClassDecl') {
        const shell: ObjectType = {
          kind: 'object', name: decl.id.name, properties: [],
          ...(decl.kind === 'ClassDecl' ? { nominal: true } : {}),
          ...(decl.typeParams ? { typeParams: decl.typeParams.map((t) => t.name.name) } : {}),
        };
        this.namedTypes.set(decl.id.name, shell);
        objShells.push({ node: decl, shell });
      }
    }

    // 1b. Fill shells.
    for (const { decl, shell } of sumShells) {
      this.withTypeParams(shell.typeParams, () => {
        (shell.variants as SumVariantType[]).push(...this.buildVariants(decl));
      });
      for (const v of shell.variants) {
        const list = this.variantIndex.get(v.tag) ?? [];
        list.push({ owner: shell.name, variant: v });
        this.variantIndex.set(v.tag, list);
      }
    }
    for (const { node, shell } of objShells) {
      this.withTypeParams(shell.typeParams, () => {
        (shell.properties as PropertySignature[]).push(...this.buildMembers(node));
        // Capture a generic class's constructor signature for `new C(args)` inference.
        if (node.kind === 'ClassDecl' && shell.typeParams?.length) {
          const ctor = node.members.find((m) => m.kind === 'ClassConstructor');
          if (ctor && ctor.kind === 'ClassConstructor') {
            this.classCtors.set(node.id.name, ctor.params.map((p) => this.paramType(p)));
          }
        }
      });
    }
    for (const decl of aliases) {
      this.withTypeParams(decl.typeParams?.map((t) => t.name.name), () => {
        this.namedTypes.set(decl.id.name, resolveType(decl.value as TypeNode, this));
      });
    }
  }

  private buildVariants(decl: TypeDecl): SumVariantType[] {
    const def = decl.value;
    if (def.kind !== 'SumTypeDef') return [];
    return def.variants.map((v): SumVariantType => {
      if (v.form === 'unit') return { kind: 'sum-variant', owner: decl.id.name, tag: v.name.name, fields: [] };
      if (v.form === 'tuple') {
        return {
          kind: 'sum-variant', owner: decl.id.name, tag: v.name.name,
          fields: [{ name: '_0', type: v.tupleType ? resolveType(v.tupleType, this) : DYNAMIC }],
        };
      }
      return {
        kind: 'sum-variant', owner: decl.id.name, tag: v.name.name,
        fields: (v.fields ?? []).map((f) => ({ name: f.name.name, type: resolveType(f.type, this) })),
      };
    });
  }

  private buildMembers(node: ClassDecl | ObjectTypeDecl): PropertySignature[] {
    const out: PropertySignature[] = [];
    if (node.kind === 'ObjectTypeDecl') {
      for (const m of node.members) {
        if (m.kind === 'InterfaceProperty') {
          out.push({ name: keyName(m.name), type: resolveType(m.type, this), optional: m.optional, readonly: m.readonly });
        } else if (m.kind === 'InterfaceMethod') {
          out.push({ name: keyName(m.name), type: this.methodType(m.params, m.returnType), optional: false, readonly: false });
        }
      }
    } else {
      for (const m of node.members) {
        if (m.kind === 'ClassProperty') {
          out.push({
            name: keyName(m.name),
            type: m.typeAnnotation ? resolveType(m.typeAnnotation, this) : DYNAMIC,
            optional: m.optional, readonly: m.readonly,
          });
        } else if (m.kind === 'ClassMethod' && m.accessor !== 'get' && m.accessor !== 'set') {
          out.push({ name: keyName(m.name), type: this.methodType(m.params, m.returnType), optional: false, readonly: false });
        } else if (m.kind === 'ClassMethod' && m.accessor === 'get') {
          out.push({ name: keyName(m.name), type: m.returnType ? resolveType(m.returnType, this) : DYNAMIC, optional: false, readonly: true });
        }
      }
    }
    return out;
  }

  private methodType(params: readonly Parameter[], ret: TypeNode | undefined): FunctionType {
    return {
      kind: 'function', async: false,
      params: params.map((p) => this.paramType(p)),
      returnType: ret ? resolveType(ret, this) : DYNAMIC,
    };
  }

  // ── Pass 2: hoist function/class value bindings ───────────────────────────────
  private hoist(body: readonly Statement[]): void {
    for (const s of body) {
      const decl = unwrapExport(s);
      if (decl.kind === 'FunctionDecl') {
        this.scope.define(decl.id.name, { type: this.functionType(decl), mutable: false, kind: 'function' });
      } else if (decl.kind === 'ClassDecl') {
        const inst = this.namedTypes.get(decl.id.name) ?? DYNAMIC;
        // The class binding is its constructor; new C() yields the instance type.
        this.scope.define(decl.id.name, { type: inst, mutable: false, kind: 'class' });
      }
    }
  }

  // ── Statements ────────────────────────────────────────────────────────────────
  private checkBlock(body: readonly Statement[]): void {
    for (const s of body) this.checkStatement(s);
  }

  private checkStatement(s: Statement): void {
    switch (s.kind) {
      case 'VariableDecl': return this.checkVarDecl(s);
      case 'FunctionDecl': return this.checkFunctionDecl(s);
      case 'ClassDecl': return this.checkClassDecl(s);
      case 'ObjectTypeDecl': case 'TypeDecl': case 'EmptyStatement':
      case 'ImportDecl': case 'DebuggerStatement': case 'BreakStatement':
      case 'ContinueStatement': return;
      case 'ExportNamedDecl':
        if (s.declaration) this.checkStatement(s.declaration);
        return;
      case 'ExportDefaultDecl':
        if (s.declaration.kind === 'FunctionDecl') this.checkFunctionDecl(s.declaration);
        else if (s.declaration.kind === 'ClassDecl') this.checkClassDecl(s.declaration);
        else this.synth(s.declaration);
        return;
      case 'ExportAllDecl': return;
      case 'ExpressionStatement': this.synth(s.expression); return;
      case 'ReturnStatement': return this.checkReturn(s.argument, s.span);
      case 'IfStatement': return this.checkIf(s);
      case 'WhileStatement': { this.synth(s.test); this.inChildScope(() => this.checkStatement(s.body)); return; }
      case 'DoWhileStatement': { this.inChildScope(() => this.checkStatement(s.body)); this.synth(s.test); return; }
      case 'ForStatement': return this.checkFor(s);
      case 'ForOfStatement': return this.checkForOf(s);
      case 'ForInStatement': {
        this.synth(s.right);
        this.inChildScope(() => { this.scope.define(s.left.name, { type: STRING, mutable: false, kind: s.declKind === 'const' ? 'const' : 'let' }); this.checkStatement(s.body); });
        return;
      }
      case 'SwitchStatement': {
        this.synth(s.discriminant);
        for (const c of s.cases) { if (c.test) this.synth(c.test); this.inChildScope(() => this.checkBlock(c.body)); }
        return;
      }
      case 'ThrowStatement': this.synth(s.argument); return;
      case 'TryStatement': return this.checkTry(s);
      case 'BlockStatement': return this.inChildScope(() => this.checkBlock(s.body));
      case 'LabeledStatement': return this.checkStatement(s.body);
    }
  }

  private checkVarDecl(decl: VariableDecl): void {
    for (const d of decl.declarators) {
      const annotated = d.typeAnnotation ? resolveType(d.typeAnnotation, this) : undefined;
      let type: Type;
      if (d.init) {
        const init = annotated ? this.check(d.init, annotated) : this.synth(d.init);
        if (annotated) {
          this.checkAssignable(init, annotated, d.init.span);
          type = annotated;
        } else {
          // Inference: const keeps literal types, let/var widen.
          type = decl.declKind === 'const' ? init : widen(init);
        }
      } else {
        type = annotated ?? DYNAMIC;
      }
      this.bindPattern(d.id, type, decl.declKind);
    }
  }

  private bindPattern(pat: Pattern, type: Type, declKind: 'const' | 'let' | 'var'): void {
    const mutable = declKind !== 'const';
    const kind = declKind;
    switch (pat.kind) {
      case 'Identifier':
        this.scope.define(pat.name, { type, mutable, kind });
        return;
      case 'ArrayPattern': {
        const elem = type.kind === 'array' ? type.element : type.kind === 'tuple' ? undefined : DYNAMIC;
        pat.elements.forEach((el, i) => {
          if (!el) return;
          const t = type.kind === 'tuple' ? (type.elements[i] ?? DYNAMIC) : (elem ?? DYNAMIC);
          this.bindPattern(el, t, declKind);
        });
        return;
      }
      case 'ObjectPattern':
        for (const p of pat.properties) {
          if (p.kind === 'RestElement') { this.scope.define(p.argument.name, { type: DYNAMIC, mutable, kind }); continue; }
          const pt = propType(type, p.key.name) ?? DYNAMIC;
          this.bindPattern(p.value, pt, declKind);
        }
        return;
      case 'AssignmentPattern':
        this.bindPattern(pat.left, type, declKind);
        return;
      case 'RestElement':
        this.scope.define(pat.argument.name, { type: arrayOf(DYNAMIC), mutable, kind });
        return;
    }
  }

  private checkReturn(arg: Expression | undefined, span: Span): void {
    const expected = this.expectedReturn;
    if (!arg) return;
    if (expected && expected.kind !== 'void' && expected.kind !== 'dynamic') {
      const actual = this.check(arg, expected);
      this.checkAssignable(actual, expected, arg.span);
    } else {
      this.synth(arg);
    }
    void span;
  }

  private checkFunctionDecl(decl: FunctionDecl): void {
    this.checkFunctionBody(decl.params, decl.returnType, decl.body, decl.typeParams?.map((t) => t.name.name), decl.async, decl.generator);
  }

  private checkClassDecl(decl: ClassDecl): void {
    this.inChildScope(() => {
      const self = this.namedTypes.get(decl.id.name);
      if (self) this.scope.define('this', { type: self, mutable: false, kind: 'const' });
      for (const m of decl.members) {
        if (m.kind === 'ClassMethod' && m.body) {
          this.checkFunctionBody(m.params, m.returnType, m.body, m.typeParams?.map((t) => t.name.name), m.async, m.generator);
        } else if (m.kind === 'ClassConstructor') {
          this.checkFunctionBody(m.params, undefined, m.body, undefined, false, false);
        } else if (m.kind === 'ClassProperty' && m.value && m.typeAnnotation) {
          const t = resolveType(m.typeAnnotation, this);
          this.checkAssignable(this.check(m.value, t), t, m.value.span);
        }
      }
    });
  }

  private checkFunctionBody(
    params: readonly Parameter[], retNode: TypeNode | undefined, body: BlockStatement | Expression,
    typeParams: readonly string[] | undefined, async: boolean, generator: boolean,
  ): void {
    const savedScope = this.scope;
    const savedFlow = this.flow;
    const savedRet = this.expectedReturn;
    const savedTp = this.typeParams;
    if (typeParams?.length) { this.typeParams = new Set([...this.typeParams, ...typeParams]); }
    this.scope = this.scope.child();
    this.flow = new Map(this.flow);
    // For async bodies, `return e` checks against the declared (already-Promise)
    // type loosely; generators don't constrain returns. Keep the declared type.
    const ret = retNode ? resolveType(retNode, this) : undefined;
    this.expectedReturn = generator || async ? undefined : ret;
    for (const p of params) this.bindParam(p);
    if (body.kind === 'BlockStatement') this.checkBlock(body.body);
    else { // expression-bodied arrow
      if (ret && ret.kind !== 'void' && ret.kind !== 'dynamic') this.checkAssignable(this.check(body, ret), ret, body.span);
      else this.synth(body);
    }
    this.scope = savedScope; this.flow = savedFlow; this.expectedReturn = savedRet; this.typeParams = savedTp;
  }

  private bindParam(p: Parameter): void {
    const t = p.typeAnnotation ? resolveType(p.typeAnnotation, this) : DYNAMIC;
    // Optional param `p?: T` has type `T | undefined` in the body.
    const type = p.optional && !p.default ? union([t, UNDEFINED]) : t;
    this.bindPattern(p.pattern, type, 'let');
  }

  private checkIf(s: IfStatement): void {
    this.synth(s.test);
    const thenFacts = this.narrow(s.test, true);
    const elseFacts = this.narrow(s.test, false);

    this.withFlow(thenFacts, () => this.checkStatement(s.consequent));
    if (s.alternate) {
      this.withFlow(elseFacts, () => this.checkStatement(s.alternate!));
    }
    // Early-return guard: `if (cond) return;` narrows the fallthrough.
    if (terminates(s.consequent) && !s.alternate) {
      for (const [k, v] of elseFacts) this.flow.set(k, v);
    } else if (s.alternate && terminates(s.alternate) && !terminates(s.consequent)) {
      for (const [k, v] of thenFacts) this.flow.set(k, v);
    }
  }

  private checkFor(s: import('@superjs/types').ForStatement): void {
    this.inChildScope(() => {
      if (s.init) { s.init.kind === 'VariableDecl' ? this.checkVarDecl(s.init) : this.synth(s.init); }
      if (s.test) this.synth(s.test);
      if (s.update) this.synth(s.update);
      this.checkStatement(s.body);
    });
  }

  private checkForOf(s: import('@superjs/types').ForOfStatement): void {
    const iter = this.synth(s.right);
    const elem = iter.kind === 'array' ? iter.element : DYNAMIC;
    this.inChildScope(() => {
      this.bindPattern(s.left, s.typeAnnotation ? resolveType(s.typeAnnotation, this) : elem, s.declKind);
      this.checkStatement(s.body);
    });
  }

  private checkTry(s: import('@superjs/types').TryStatement): void {
    this.inChildScope(() => this.checkBlock(s.block.body));
    if (s.handler) {
      // W010: catch binding should be typed Error or unknown.
      if (s.handler.paramType) {
        const t = resolveType(s.handler.paramType, this);
        if (t.kind !== 'unknown' && !(t.kind === 'object' && t.name === 'Error')) {
          this.warn('W010', s.handler.param?.span ?? s.handler.span);
        }
      }
      this.inChildScope(() => {
        if (s.handler!.param) this.scope.define(s.handler!.param.name, { type: s.handler!.paramType ? resolveType(s.handler!.paramType, this) : UNKNOWN, mutable: true, kind: 'let' });
        this.checkBlock(s.handler!.body.body);
      });
    }
    if (s.finalizer) this.inChildScope(() => this.checkBlock(s.finalizer!.body));
  }

  // ── Bidirectional core ────────────────────────────────────────────────────────

  /** Check `expr` against `expected`, returning the resolved actual type. */
  private check(expr: Expression, expected: Type): Type {
    // Contextual cases that benefit from the expected type.
    switch (expr.kind) {
      case 'ArrayLiteral':
        if (expected.kind === 'array') {
          for (const el of expr.elements) { if (el && el.kind !== 'SpreadElement') this.check(el, expected.element); }
          return expected;
        }
        break;
      case 'MatchExpression':
        return this.checkMatch(expr, expected);
      case 'VariantConstructorExpression':
        return this.synthVariant(expr, expected);
      case 'CallExpression':
        if (expr.callee.kind === 'Identifier' && this.isVariantName(expr.callee.name)) {
          return this.synthCall(expr, expected);
        }
        break;
      case 'Identifier':
        if (this.isVariantName(expr.name)) return this.constructVariant(expr.name, undefined, expected, expr.span);
        break;
      case 'ArrowFunction':
      case 'FunctionExpression':
        if (expected.kind === 'function') return this.synthFunctionExpr(expr, expected);
        break;
      case 'NullLiteral':
        return NULL;
      case 'NumberLiteral': case 'StringLiteral': case 'BooleanLiteral':
        // Allow literal to flow as its base when expected is the base primitive.
        break;
    }
    return this.synth(expr);
  }

  /** Synthesize (infer) the type of `expr`, recording it in the type table. */
  private synth(expr: Expression): Type {
    const t = this.synthInner(expr);
    if (this.recordTypes) this.typeTable.push({ span: expr.span, type: t });
    return t;
  }

  private synthInner(expr: Expression): Type {
    switch (expr.kind) {
      case 'NumberLiteral': return literal(expr.value, 'number');
      case 'StringLiteral': return literal(expr.value, 'string');
      case 'BooleanLiteral': return literal(expr.value, 'boolean');
      case 'BigIntLiteral': return literal(expr.value, 'bigint');
      case 'NullLiteral': return NULL;
      case 'UndefinedLiteral': return UNDEFINED;
      case 'RegexLiteral': return DYNAMIC;
      case 'TemplateLiteral':
        for (const e of expr.expressions) this.synth(e);
        return STRING;
      case 'Identifier': return this.synthIdentifier(expr);
      case 'ThisExpression': return this.scope.lookup('this')?.type ?? DYNAMIC;
      case 'SuperExpression': return DYNAMIC;
      case 'ArrayLiteral': return this.synthArray(expr);
      case 'ObjectLiteral': return this.synthObject(expr);
      case 'ParenthesizedExpression': return this.synth(expr.expression);
      case 'SequenceExpression': { let t: Type = DYNAMIC; for (const e of expr.expressions) t = this.synth(e); return t; }
      case 'UnaryExpression': return this.synthUnary(expr);
      case 'UpdateExpression': { const t = this.synth(expr.argument); return t.kind === 'bigint' ? BIGINT : NUMBER; }
      case 'BinaryExpression': return this.synthBinary(expr);
      case 'LogicalExpression': return this.synthLogical(expr);
      case 'AssignmentExpression': return this.synthAssignment(expr);
      case 'ConditionalExpression': return this.synthConditional(expr);
      case 'CallExpression': return this.synthCall(expr);
      case 'NewExpression': return this.synthNew(expr);
      case 'MemberExpression': return this.synthMember(expr);
      case 'MatchExpression': return this.checkMatch(expr, undefined);
      case 'VariantConstructorExpression': return this.synthVariant(expr, undefined);
      case 'TypeAssertion': return this.synthAssertion(expr);
      case 'AwaitExpression': { const t = this.synth(expr.argument); return t.kind === 'promise' ? t.value : t; }
      case 'YieldExpression': { if (expr.argument) this.synth(expr.argument); return DYNAMIC; }
      case 'ArrowFunction': case 'FunctionExpression': return this.synthFunctionExpr(expr, undefined);
      case 'SpreadElement': return this.synth(expr.argument);
      case 'JsxElement': case 'JsxFragment': return this.synthJsx(expr);
      case 'ClassExpression': return DYNAMIC;
    }
  }

  private synthIdentifier(id: Identifier): Type {
    const narrowed = this.flow.get(id.name);
    if (narrowed) return narrowed;
    const b = this.scope.lookup(id.name);
    if (b) return b.type;
    // Unknown identifier — could be a unit variant constructor or a library global.
    if (this.isVariantName(id.name)) {
      return this.constructVariant(id.name, undefined, undefined, id.span);
    }
    return DYNAMIC;
  }

  private synthArray(expr: import('@superjs/types').ArrayLiteral): Type {
    const elTypes: Type[] = [];
    for (const el of expr.elements) {
      if (!el) continue;
      if (el.kind === 'SpreadElement') { const s = this.synth(el.argument); if (s.kind === 'array') elTypes.push(s.element); continue; }
      elTypes.push(widen(this.synth(el)));
    }
    return arrayOf(elTypes.length ? union(elTypes) : NEVER);
  }

  private synthObject(expr: import('@superjs/types').ObjectLiteral): ObjectType {
    const properties: PropertySignature[] = [];
    for (const p of expr.properties) {
      if (p.kind === 'PropertyDef') {
        properties.push({ name: keyName(p.key), type: widen(this.synth(p.value)), optional: false, readonly: false });
      } else if (p.kind === 'ObjectMethod') {
        properties.push({ name: keyName(p.key), type: this.methodType(p.params, p.returnType), optional: false, readonly: false });
        this.checkFunctionBody(p.params, p.returnType, p.body, undefined, p.async, p.generator);
      } else {
        this.synth(p.argument);
      }
    }
    return { kind: 'object', properties };
  }

  private synthUnary(expr: import('@superjs/types').UnaryExpression): Type {
    this.synth(expr.argument);
    switch (expr.operator) {
      case 'typeof': return STRING;
      case '!': return BOOLEAN;
      case 'void': return UNDEFINED;
      case 'delete': return BOOLEAN;
      case '~': case '-': case '+': return NUMBER;
      default: return DYNAMIC;
    }
  }

  private synthBinary(expr: import('@superjs/types').BinaryExpression): Type {
    const l = this.synth(expr.left);
    const r = this.synth(expr.right);
    const op = expr.operator;
    if (['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'instanceof', 'in'].includes(op)) {
      if (op === '==' || op === '!=') this.lint('L003', expr.span);
      return BOOLEAN;
    }
    if (op === '+') {
      // string concatenation if either side is string.
      const lm = members(l), rm = members(r);
      if (lm.some(isStringy) || rm.some(isStringy)) return STRING;
      if (lm.every(isBigInty) && rm.every(isBigInty)) return BIGINT;
      return NUMBER;
    }
    if (['&', '|', '^', '<<', '>>', '>>>'].includes(op)) return (l.kind === 'bigint') ? BIGINT : NUMBER;
    // Arithmetic.
    return (l.kind === 'bigint' || r.kind === 'bigint') ? BIGINT : NUMBER;
  }

  private synthLogical(expr: import('@superjs/types').LogicalExpression): Type {
    const l = this.synth(expr.left);
    if (expr.operator === '??') {
      const r = this.synth(expr.right);
      return union([stripNullish(l), r]);
    }
    if (expr.operator === '&&') {
      const r = this.synth(expr.right);
      return union([l, r]);
    }
    // ||
    const r = this.synth(expr.right);
    return union([stripNullish(l), r]);
  }

  private synthAssignment(expr: import('@superjs/types').AssignmentExpression): Type {
    const rhs = this.synth(expr.right);
    if (expr.left.kind === 'Identifier') {
      const b = this.scope.lookup(expr.left.name);
      if (b) {
        if (expr.operator === '=') {
          this.checkAssignable(rhs, b.type, expr.right.span);
          // Assignment narrowing: subsequent reads see the assigned type.
          this.flow.set(expr.left.name, isAssignable(rhs, b.type) ? rhs : b.type);
        }
        return b.type;
      }
    } else {
      this.synth(expr.left as Expression);
    }
    return rhs;
  }

  private synthConditional(expr: import('@superjs/types').ConditionalExpression): Type {
    this.synth(expr.test);
    const thenFacts = this.narrow(expr.test, true);
    const elseFacts = this.narrow(expr.test, false);
    const a = this.withFlow(thenFacts, () => this.synth(expr.consequent));
    const b = this.withFlow(elseFacts, () => this.synth(expr.alternate));
    return union([a, b]);
  }

  private synthCall(expr: import('@superjs/types').CallExpression, expected?: Type): Type {
    // `Ok(x)` parses as a call; route to variant construction when applicable.
    if (expr.callee.kind === 'Identifier' && this.isVariantName(expr.callee.name)) {
      const arg = expr.args[0];
      return this.constructVariant(expr.callee.name, arg && arg.kind !== 'SpreadElement' ? arg : undefined, expected, expr.span);
    }
    const callee = this.synth(expr.callee);
    const params = callee.kind === 'function' ? callee.params : undefined;
    // Check each argument once, flowing the parameter type in as the expected
    // type so contextual cases resolve — generic variant construction
    // (`Some(40)` against `Opt<number>`) and bare arrow params especially.
    expr.args.forEach((a, i) => {
      if (a.kind === 'SpreadElement') { this.synth(a.argument); return; }
      const param = params?.[i];
      if (param) this.checkAssignable(this.check(a, param.type), param.type, a.span);
      else this.synth(a);
    });
    if (callee.kind === 'function') {
      const ret = callee.returnType;
      return expr.optional ? union([ret, UNDEFINED]) : ret;
    }
    return DYNAMIC;
  }

  private synthNew(expr: import('@superjs/types').NewExpression): Type {
    const argTypes = expr.args.map((a) => this.synth(a.kind === 'SpreadElement' ? a.argument : a));
    if (expr.callee.kind === 'Identifier') {
      const named = this.namedTypes.get(expr.callee.name);
      if (named && named.kind === 'object' && named.nominal) {
        const typeParams = named.typeParams;
        if (typeParams && typeParams.length > 0) {
          // Infer type arguments from the constructor: unify each declared
          // parameter type against the supplied argument type.
          const map = new Map<string, Type>();
          const ctorParams = this.classCtors.get(expr.callee.name);
          ctorParams?.forEach((p, i) => {
            const at = argTypes[i];
            if (at) inferTypeArgs(p.type, at, map);
          });
          for (const tp of typeParams) if (!map.has(tp)) map.set(tp, DYNAMIC);
          return substitute(named, map);
        }
        return named;
      }
    }
    return DYNAMIC;
  }

  private synthMember(expr: import('@superjs/types').MemberExpression): Type {
    const obj = this.synth(expr.object);
    // E003: access on possibly-null value without optional chaining.
    if (!expr.optional && containsNullish(obj) && obj.kind !== 'dynamic') {
      this.error('E003', expr.object.span);
    }
    const base = stripNullish(obj);
    if (expr.computed) { this.synth(expr.property as Expression); return base.kind === 'array' ? base.element : DYNAMIC; }
    const name = (expr.property as Identifier).name;
    const pt = propType(base, name) ?? DYNAMIC;
    return expr.optional && containsNullish(obj) ? union([pt, UNDEFINED]) : pt;
  }

  private synthAssertion(expr: import('@superjs/types').TypeAssertion): Type {
    const src = this.synth(expr.expression);
    const target = resolveType(expr.type, this);
    // E002: assertion between unrelated types.
    if (!isAssignable(src, target) && !isAssignable(target, src)
        && src.kind !== 'dynamic' && src.kind !== 'unknown') {
      this.reportE002(target, src, expr.span);
    }
    return target;
  }

  private synthFunctionExpr(
    expr: import('@superjs/types').ArrowFunction | import('@superjs/types').FunctionExpression,
    expected: FunctionType | undefined,
  ): FunctionType {
    const params: ParamType[] = expr.params.map((p, i) => ({
      name: p.pattern.kind === 'Identifier' ? p.pattern.name : `_${i}`,
      type: p.typeAnnotation ? resolveType(p.typeAnnotation, this)
        : expected?.params[i]?.type ?? DYNAMIC, // contextual param typing
      optional: p.optional,
      rest: p.rest,
    }));
    const ret = expr.returnType ? resolveType(expr.returnType, this) : expected?.returnType;
    // Re-bind params (with contextual types) and check the body.
    this.checkFunctionBodyContextual(expr.params, params, ret, expr.body, expr.async);
    return { kind: 'function', async: expr.async, params, returnType: ret ?? DYNAMIC };
  }

  private checkFunctionBodyContextual(
    nodes: readonly Parameter[], resolved: readonly ParamType[], ret: Type | undefined,
    body: BlockStatement | Expression, async: boolean,
  ): void {
    const savedScope = this.scope, savedFlow = this.flow, savedRet = this.expectedReturn;
    this.scope = this.scope.child();
    this.flow = new Map(this.flow);
    // In an async function, `return e` (or an expression body) yields the
    // Promise's resolved value, so check against the unwrapped type — `async
    // () => 42` satisfies `Promise<number>`.
    const target = async ? (ret?.kind === 'promise' ? ret.value : undefined) : ret;
    this.expectedReturn = target;
    nodes.forEach((p, i) => this.bindPattern(p.pattern, resolved[i]?.type ?? DYNAMIC, 'let'));
    if (body.kind === 'BlockStatement') this.checkBlock(body.body);
    else if (target && target.kind !== 'void' && target.kind !== 'dynamic') this.checkAssignable(this.check(body, target), target, body.span);
    else this.synth(body);
    this.scope = savedScope; this.flow = savedFlow; this.expectedReturn = savedRet;
  }

  private functionType(decl: FunctionDecl): FunctionType {
    return {
      kind: 'function', async: decl.async,
      params: decl.params.map((p) => this.paramType(p)),
      returnType: decl.returnType ? resolveType(decl.returnType, this) : DYNAMIC,
      ...(decl.typeParams ? { typeParams: decl.typeParams.map((t) => t.name.name) } : {}),
    };
  }

  private paramType(p: Parameter): ParamType {
    return {
      name: p.pattern.kind === 'Identifier' ? p.pattern.name : '_',
      type: p.typeAnnotation ? resolveType(p.typeAnnotation, this) : DYNAMIC,
      optional: p.optional, rest: p.rest,
    };
  }

  private synthJsx(expr: Expression): Type {
    // Shallow: type-check embedded expressions, yield dynamic element type.
    const walk = (e: Expression): void => { this.synth(e); };
    if (expr.kind === 'JsxElement') {
      for (const attr of expr.opening.attributes) {
        if (attr.kind === 'JsxAttribute' && attr.value?.kind === 'JsxExpressionContainer') walk(attr.value.expression);
        else if (attr.kind === 'JsxSpreadAttribute') walk(attr.argument);
      }
      for (const c of expr.children) if (c.kind === 'JsxExpressionContainer') walk(c.expression);
    } else if (expr.kind === 'JsxFragment') {
      for (const c of expr.children) if (c.kind === 'JsxExpressionContainer') walk(c.expression);
    }
    return DYNAMIC;
  }

  // ── Sum-type variant construction ─────────────────────────────────────────────
  private synthVariant(expr: import('@superjs/types').VariantConstructorExpression, expected: Type | undefined): Type {
    return this.constructVariant(expr.variant.name, expr.argument, expected, expr.span);
  }

  /** True if `name` names a sum-type variant and is not shadowed by a value binding. */
  private isVariantName(name: string): boolean {
    return this.variantIndex.has(name) && !this.scope.lookup(name);
  }

  /**
   * Check a variant constructor application. Used for both the dedicated
   * `VariantConstructorExpression` and the common `Ok(x)` / `None` forms that the
   * parser emits as call/identifier expressions.
   */
  private constructVariant(tag: string, arg: Expression | undefined, expected: Type | undefined, span: Span): Type {
    const candidates = this.variantIndex.get(tag) ?? [];
    if (candidates.length === 0) { if (arg) this.synth(arg); return DYNAMIC; }
    let chosen = candidates[0]!;
    if (candidates.length > 1) {
      const want = expected ? expectedOwner(expected) : undefined;
      const byContext = want ? candidates.find((c) => c.owner === want) : undefined;
      if (byContext) chosen = byContext;
      else this.error('E020', span, { variant: tag });
    }
    const owner = this.sums.get(chosen.owner);
    // Instantiate the owner against the expected type so payloads check concretely.
    const instantiated = expected && expectedOwner(expected) === chosen.owner && expected.kind === 'sum'
      ? expected : owner;
    const variant = instantiated?.kind === 'sum'
      ? instantiated.variants.find((v) => v.tag === tag) ?? chosen.variant
      : chosen.variant;
    if (arg) {
      if (isRecordVariant(variant)) {
        // Record variant `V({ a, b })`: the argument is an object literal whose
        // fields must match the variant's declared fields structurally.
        const expected: ObjectType = {
          kind: 'object',
          properties: variant.fields.map((f) => ({ name: f.name, type: f.type, optional: false, readonly: false })),
        };
        this.checkAssignable(this.check(arg, expected), expected, arg.span);
      } else {
        // Tuple variant `V(x)`: single positional payload (`_0`).
        const payload = variant.fields[0];
        if (payload) this.checkAssignable(this.synth(arg), payload.type, arg.span);
        else this.synth(arg);
      }
    }
    return instantiated ?? DYNAMIC;
  }

  // ── Match ──────────────────────────────────────────────────────────────────────
  private checkMatch(expr: MatchExpression, expected: Type | undefined): Type {
    const subject = this.synth(expr.subject);
    const sum = subjectSum(subject, this.sums);
    const covered = new Set<string>();
    let hasCatchAll = false;
    const armTypes: Type[] = [];

    for (const arm of expr.arms) {
      const variantName = patternVariant(arm.pattern);
      if (arm.pattern.kind === 'DefaultPattern') hasCatchAll = true;
      else if (variantName && sum && !sum.variants.some((v) => v.tag === variantName)) {
        // bare identifier that isn't a variant → binding pattern (catch-all)
        if (arm.pattern.kind === 'UnitVariantPattern') hasCatchAll = true;
      } else if (variantName) {
        if (covered.has(variantName)) this.warn('W003', arm.span);
        covered.add(variantName);
      }
      armTypes.push(this.checkArm(arm, subject, sum, expected));
    }

    // E007: exhaustiveness.
    if (sum && !hasCatchAll) {
      for (const v of sum.variants) {
        if (!covered.has(v.tag)) this.error('E007', expr.span, { variant: v.tag });
      }
    }
    return armTypes.length ? union(armTypes) : DYNAMIC;
  }

  private checkArm(arm: MatchArm, subject: Type, sum: SumType | undefined, expected: Type | undefined): Type {
    return this.inChildScope(() => {
      this.bindArmPattern(arm.pattern, subject, sum);
      if (arm.body.kind === 'BlockStatement') { this.checkBlock(arm.body.body); return DYNAMIC; }
      return expected ? this.check(arm.body, expected) : this.synth(arm.body);
    });
  }

  private bindArmPattern(pat: MatchPattern, subject: Type, sum: SumType | undefined): void {
    const variant = (tag: string): SumVariantType | undefined => sum?.variants.find((v) => v.tag === tag);
    switch (pat.kind) {
      case 'TupleVariantPattern': {
        const v = variant(pat.variant.name);
        this.scope.define(pat.binding.name, { type: v?.fields[0]?.type ?? DYNAMIC, mutable: false, kind: 'const' });
        return;
      }
      case 'RecordVariantPattern': {
        const v = variant(pat.variant.name);
        for (const f of pat.fields) {
          const ft = v?.fields.find((x) => x.name === f.field.name)?.type ?? DYNAMIC;
          this.scope.define((f.binding ?? f.field).name, { type: ft, mutable: false, kind: 'const' });
        }
        return;
      }
      case 'UnitVariantPattern': {
        // bare identifier not a known variant → binding pattern over the subject
        if (sum && !sum.variants.some((v) => v.tag === pat.variant.name)) {
          this.scope.define(pat.variant.name, { type: subject, mutable: false, kind: 'const' });
        }
        return;
      }
      case 'DefaultPattern':
        return;
    }
  }

  // ── Narrowing (control-flow analysis) ────────────────────────────────────────

  /** Facts that hold when `test` evaluates with the given truthiness `sense`. */
  private narrow(test: Expression, sense: boolean): Map<string, Type> {
    const facts = new Map<string, Type>();
    this.collectNarrow(test, sense, facts);
    return facts;
  }

  private collectNarrow(test: Expression, sense: boolean, facts: Map<string, Type>): void {
    if (test.kind === 'ParenthesizedExpression') return this.collectNarrow(test.expression, sense, facts);

    if (test.kind === 'UnaryExpression' && test.operator === '!') {
      return this.collectNarrow(test.argument, !sense, facts);
    }

    if (test.kind === 'LogicalExpression') {
      // && in the true branch narrows by both; || in the false branch narrows by both.
      if ((test.operator === '&&' && sense) || (test.operator === '||' && !sense)) {
        this.collectNarrow(test.left, sense, facts);
        this.collectNarrow(test.right, sense, facts);
      }
      return;
    }

    if (test.kind === 'BinaryExpression') {
      const { operator: op, left, right } = test;
      // x === null / x !== null / x == null
      const nullCmp = nullComparison(left, right);
      if (nullCmp && nullCmp.target.kind === 'Identifier') {
        const cur = this.typeOf(nullCmp.target.name);
        if (!cur) return;
        const isEq = op === '===' || op === '==';
        const wantNull = isEq === sense; // true ⇒ value IS null(ish)
        const loose = op === '==' || op === '!=';
        if (wantNull) {
          facts.set(nullCmp.target.name, loose ? union(members(cur).filter((m) => m.kind === 'null' || m.kind === 'undefined')) : NULL);
        } else {
          facts.set(nullCmp.target.name, stripNullish(cur));
        }
        return;
      }
      // typeof x === "string"
      const tof = typeofComparison(left, right) ?? typeofComparison(right, left);
      if (tof && tof.id.kind === 'Identifier') {
        const cur = this.typeOf(tof.id.name);
        if (!cur) return;
        const isEq = op === '===' || op === '==';
        const want = isEq === sense;
        const prim = typeofToType(tof.lit);
        if (prim) {
          facts.set(tof.id.name, want ? narrowToPrim(cur, tof.lit, prim) : removePrim(cur, tof.lit));
        }
        return;
      }
      // x instanceof C
      if (op === 'instanceof' && left.kind === 'Identifier' && sense) {
        if (right.kind === 'Identifier') {
          const inst = this.namedTypes.get(right.name);
          if (inst) facts.set(left.name, inst);
        }
        return;
      }
      return;
    }

    // Truthiness: if (x) → x is non-nullish in the true branch.
    if (test.kind === 'Identifier') {
      const cur = this.typeOf(test.name);
      if (cur && sense) facts.set(test.name, stripNullish(cur));
      return;
    }
  }

  private typeOf(name: string): Type | undefined {
    return this.flow.get(name) ?? this.scope.lookup(name)?.type;
  }

  // ── Flow / scope plumbing ────────────────────────────────────────────────────
  private withFlow<T>(facts: Map<string, Type>, fn: () => T): T {
    const saved = this.flow;
    this.flow = new Map(saved);
    for (const [k, v] of facts) this.flow.set(k, v);
    try { return fn(); } finally { this.flow = saved; }
  }

  private inChildScope<T>(fn: () => T): T {
    const saved = this.scope;
    this.scope = this.scope.child();
    try { return fn(); } finally { this.scope = saved; }
  }

  private withTypeParams(names: readonly string[] | undefined, fn: () => void): void {
    if (!names?.length) return fn();
    const saved = this.typeParams;
    this.typeParams = new Set([...saved, ...names]);
    try { fn(); } finally { this.typeParams = saved; }
  }

  // ── Diagnostics ──────────────────────────────────────────────────────────────
  private checkAssignable(actual: Type, expected: Type, span: Span): void {
    if (isAssignable(actual, expected)) return;
    // E001 is the precise diagnostic when the only problem is nullishness.
    if (containsNullish(actual) && !containsNullish(expected) && isAssignable(stripNullish(actual), expected)) {
      this.error('E001', span, { type: display(expected) });
      return;
    }
    this.reportE002(expected, actual, span);
  }

  private reportE002(expected: Type, found: Type, span: Span): void {
    this.bag.report({ code: Codes['E002'], span, params: { expected: display(expected), found: display(found) } });
  }

  private error(code: 'E001' | 'E003' | 'E007' | 'E020', span: Span, params?: Record<string, string>): void {
    this.bag.report({ code: Codes[code], span, ...(params ? { params } : {}) });
  }
  private warn(code: 'W003' | 'W010', span: Span): void {
    this.bag.report({ code: Codes[code], span });
  }
  private lint(code: 'L003', span: Span): void {
    this.bag.report({ code: Codes[code], span });
  }
}

// ── Free helpers ────────────────────────────────────────────────────────────────

function unwrapExport(s: Statement): Statement {
  if (s.kind === 'ExportNamedDecl' && s.declaration) return s.declaration;
  if (s.kind === 'ExportDefaultDecl' && (s.declaration.kind === 'FunctionDecl' || s.declaration.kind === 'ClassDecl')) return s.declaration;
  return s;
}

/** Top-level names introduced by an inline `export <decl>` statement. */
function declaredNames(decl: Statement): string[] {
  switch (decl.kind) {
    case 'TypeDecl': case 'ObjectTypeDecl': case 'ClassDecl': case 'FunctionDecl':
      return [decl.id.name];
    case 'VariableDecl':
      return decl.declarators
        .map((d) => (d.id.kind === 'Identifier' ? d.id.name : null))
        .filter((n): n is string => n !== null);
    default:
      return [];
  }
}

function keyName(key: { kind: string; name?: string; value?: string | number }): string {
  if (key.kind === 'Identifier' && key.name) return key.name;
  if ('value' in key && key.value !== undefined) return String(key.value);
  return '<computed>';
}

function propType(t: Type, name: string): Type | undefined {
  for (const m of members(t)) {
    if (m.kind === 'object') {
      const p = m.properties.find((x) => x.name === name);
      if (p) return p.optional ? union([p.type, UNDEFINED]) : p.type;
      if (m.indexSignature) return m.indexSignature.valueType;
    }
    if (m.kind === 'array' && name === 'length') return NUMBER;
  }
  return undefined;
}

function isStringy(t: Type): boolean {
  return t.kind === 'string' || (t.kind === 'literal' && t.base === 'string');
}
function isBigInty(t: Type): boolean {
  return t.kind === 'bigint' || (t.kind === 'literal' && t.base === 'bigint');
}

function terminates(s: Statement): boolean {
  switch (s.kind) {
    case 'ReturnStatement': case 'ThrowStatement': case 'BreakStatement': case 'ContinueStatement':
      return true;
    case 'BlockStatement':
      return s.body.length > 0 && terminates(s.body[s.body.length - 1]!);
    case 'IfStatement':
      return !!s.alternate && terminates(s.consequent) && terminates(s.alternate);
    default:
      return false;
  }
}

/**
 * True for record-form variants (`V({ a, b })`). Tuple variants carry a single
 * synthetic `_0` field; unit variants carry none. Anything else — including a
 * single named field — is a record.
 */
/**
 * Structurally unify a (possibly generic) parameter type against a concrete
 * argument type, recording each type-parameter binding in `map`. First binding
 * wins. Widens literals so `new Box(42)` infers `T = number`, not `42`.
 */
function inferTypeArgs(param: Type, arg: Type, map: Map<string, Type>): void {
  switch (param.kind) {
    case 'type-param':
      if (!map.has(param.name)) map.set(param.name, widen(arg));
      return;
    case 'array':
      if (arg.kind === 'array') inferTypeArgs(param.element, arg.element, map);
      return;
    case 'promise':
      if (arg.kind === 'promise') inferTypeArgs(param.value, arg.value, map);
      return;
    case 'nullable':
      inferTypeArgs(param.inner, arg.kind === 'nullable' ? arg.inner : arg, map);
      return;
    case 'tuple':
      if (arg.kind === 'tuple') {
        param.elements.forEach((e, i) => { const a = arg.elements[i]; if (a) inferTypeArgs(e, a, map); });
      }
      return;
    case 'function':
      if (arg.kind === 'function') {
        param.params.forEach((p, i) => { const a = arg.params[i]; if (a) inferTypeArgs(p.type, a.type, map); });
        inferTypeArgs(param.returnType, arg.returnType, map);
      }
      return;
    case 'object':
      if (arg.kind === 'object') {
        for (const pp of param.properties) {
          const ap = arg.properties.find((x) => x.name === pp.name);
          if (ap) inferTypeArgs(pp.type, ap.type, map);
        }
      }
      return;
    default:
      return;
  }
}

function isRecordVariant(variant: SumVariantType): boolean {
  if (variant.fields.length === 0) return false;
  return !(variant.fields.length === 1 && variant.fields[0]!.name === '_0');
}

function expectedOwner(t: Type): string | undefined {
  if (t.kind === 'sum') return t.name;
  if (t.kind === 'sum-variant') return t.owner;
  return undefined;
}

function subjectSum(t: Type, sums: ReadonlyMap<string, SumType>): SumType | undefined {
  // Prefer the (possibly instantiated) subject type itself so payload bindings
  // see substituted type arguments, not the generic shell's type params.
  if (t.kind === 'sum') return t;
  void sums;
  return undefined;
}

function patternVariant(p: MatchPattern): string | undefined {
  switch (p.kind) {
    case 'TupleVariantPattern': case 'RecordVariantPattern': return p.variant.name;
    case 'UnitVariantPattern': return p.variant.name;
    default: return undefined;
  }
}

// Narrowing comparison destructuring.
function nullComparison(a: Expression, b: Expression): { target: Expression } | undefined {
  if (isNullish(b)) return { target: a };
  if (isNullish(a)) return { target: b };
  return undefined;
}
function isNullish(e: Expression): boolean {
  return e.kind === 'NullLiteral' || e.kind === 'UndefinedLiteral'
    || (e.kind === 'Identifier' && e.name === 'undefined');
}

function typeofComparison(a: Expression, b: Expression): { id: Expression; lit: string } | undefined {
  if (a.kind === 'UnaryExpression' && a.operator === 'typeof' && b.kind === 'StringLiteral') {
    return { id: a.argument, lit: b.value };
  }
  return undefined;
}

function typeofToType(lit: string): Type | undefined {
  switch (lit) {
    case 'string': return STRING;
    case 'number': return NUMBER;
    case 'boolean': return BOOLEAN;
    case 'bigint': return BIGINT;
    case 'symbol': return SYMBOL;
    case 'undefined': return UNDEFINED;
    case 'function': return DYNAMIC;
    case 'object': return DYNAMIC;
    default: return undefined;
  }
}

function narrowToPrim(cur: Type, lit: string, prim: Type): Type {
  const match = members(cur).filter((m) => typeofMatches(m, lit));
  return match.length ? union(match) : prim;
}
function removePrim(cur: Type, lit: string): Type {
  return union(members(cur).filter((m) => !typeofMatches(m, lit)));
}
function typeofMatches(t: Type, lit: string): boolean {
  switch (lit) {
    case 'string': return isStringy(t);
    case 'number': return t.kind === 'number' || (t.kind === 'literal' && t.base === 'number');
    case 'boolean': return t.kind === 'boolean' || (t.kind === 'literal' && t.base === 'boolean');
    case 'bigint': return isBigInty(t);
    case 'symbol': return t.kind === 'symbol';
    case 'undefined': return t.kind === 'undefined';
    case 'function': return t.kind === 'function';
    case 'object': return t.kind === 'object' || t.kind === 'array' || t.kind === 'null';
    default: return false;
  }
}
