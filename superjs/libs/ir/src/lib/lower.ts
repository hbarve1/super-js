/**
 * Lower a parsed SJS {@link Program} to {@link IrProgram}.
 *
 * Erases all type-level syntax and desugars SJS runtime constructs to plain JS
 * IR (specs/language/050, 052, 053). Variant tags/forms are derived from the
 * `type` declarations in the module — no checker dependency needed.
 */

import type {
  Program, Statement, Expression, Pattern, BlockStatement, MatchExpression,
  MatchArm, TypeDecl, Parameter, ClassMember, PropertyKey, Identifier,
  JsxElement, JsxFragment, JsxChild, JsxAttribute, VariantDef,
} from '@superjs/types';
import type {
  IrProgram, IrStatement, IrExpression, IrPattern, IrBlock, IrClassMember,
  IrPropertyKey, IrProperty, IrObject, IrVarDecl, IrSpread,
} from './ir.js';
import { id, lit, member, call } from './ir.js';

interface VariantInfo { readonly form: 'unit' | 'tuple' | 'record'; readonly fields: readonly string[] }

export function lower(program: Program): IrProgram {
  return new Lowering(program).run();
}

class Lowering {
  private readonly variants = new Map<string, VariantInfo>();

  constructor(private readonly program: Program) {
    this.collectVariants(program.body);
  }

  run(): IrProgram {
    const body: IrStatement[] = [];
    for (const s of this.program.body) {
      const lowered = this.stmt(s);
      if (lowered) body.push(...(Array.isArray(lowered) ? lowered : [lowered]));
    }
    return { type: 'Program', body };
  }

  private collectVariants(body: readonly Statement[]): void {
    for (const s of body) {
      const decl = s.kind === 'ExportNamedDecl' && s.declaration ? s.declaration : s;
      if (decl.kind === 'TypeDecl' && (decl as TypeDecl).value.kind === 'SumTypeDef') {
        for (const v of ((decl as TypeDecl).value as { variants: readonly VariantDef[] }).variants) {
          this.variants.set(v.name.name, {
            form: v.form,
            fields: v.form === 'record' ? (v.fields ?? []).map((f) => f.name.name) : [],
          });
        }
      }
    }
  }

  private isVariant(name: string): boolean { return this.variants.has(name); }

  // ── Statements ──────────────────────────────────────────────────────────────
  private stmt(s: Statement): IrStatement | IrStatement[] | null {
    switch (s.kind) {
      case 'TypeDecl': case 'InterfaceDecl':
        return null; // type-level — erased
      case 'ImportDecl':
        if (s.typeOnly) return null;
        return {
          type: 'ImportDeclaration', source: s.source.value,
          ...(s.defaultImport ? { defaultImport: s.defaultImport.name } : {}),
          ...(s.namespaceImport ? { namespaceImport: s.namespaceImport.name } : {}),
          named: s.named.map((n) => ({ imported: n.imported.name, local: n.local.name })),
        };
      case 'ExportNamedDecl': {
        if (s.typeOnly) return null;
        const declaration = s.declaration ? this.stmt(s.declaration) : null;
        if (declaration && !Array.isArray(declaration)) {
          return { type: 'ExportNamedDeclaration', declaration, specifiers: [] };
        }
        return {
          type: 'ExportNamedDeclaration', specifiers: s.specifiers.map((sp) => ({ local: sp.local.name, exported: sp.exported.name })),
          ...(s.source ? { source: s.source.value } : {}),
        };
      }
      case 'ExportDefaultDecl': {
        const d = s.declaration;
        if (d.kind === 'FunctionDecl') return { type: 'ExportDefaultDeclaration', declaration: this.functionDecl(d) };
        if (d.kind === 'ClassDecl') return { type: 'ExportDefaultDeclaration', declaration: this.classDecl(d) };
        return { type: 'ExportDefaultDeclaration', declaration: this.expr(d) };
      }
      case 'ExportAllDecl':
        return { type: 'ExportNamedDeclaration', specifiers: [], source: s.source.value };
      case 'VariableDecl':
        return {
          type: 'VariableDeclaration', kind: s.declKind,
          declarations: s.declarators.map((d) => ({
            type: 'VariableDeclarator' as const, id: this.pat(d.id),
            ...(d.init ? { init: this.expr(d.init) } : {}),
          })),
        };
      case 'FunctionDecl': return this.functionDecl(s);
      case 'ClassDecl': return this.classDecl(s);
      case 'ReturnStatement': return { type: 'ReturnStatement', ...(s.argument ? { argument: this.expr(s.argument) } : {}) };
      case 'IfStatement': return {
        type: 'IfStatement', test: this.expr(s.test), consequent: this.stmtOne(s.consequent),
        ...(s.alternate ? { alternate: this.stmtOne(s.alternate) } : {}),
      };
      case 'WhileStatement': return { type: 'WhileStatement', test: this.expr(s.test), body: this.stmtOne(s.body) };
      case 'DoWhileStatement': return { type: 'DoWhileStatement', body: this.stmtOne(s.body), test: this.expr(s.test) };
      case 'ForStatement': return {
        type: 'ForStatement',
        ...(s.init ? { init: s.init.kind === 'VariableDecl' ? this.stmt(s.init) as IrVarDecl : this.expr(s.init) } : {}),
        ...(s.test ? { test: this.expr(s.test) } : {}),
        ...(s.update ? { update: this.expr(s.update) } : {}),
        body: this.stmtOne(s.body),
      };
      case 'ForOfStatement': return {
        type: 'ForOfStatement', await: s.await,
        left: { type: 'VariableDeclaration', kind: s.declKind, declarations: [{ type: 'VariableDeclarator', id: this.pat(s.left) }] },
        right: this.expr(s.right), body: this.stmtOne(s.body),
      };
      case 'ForInStatement': return {
        type: 'ForInStatement',
        left: { type: 'VariableDeclaration', kind: s.declKind, declarations: [{ type: 'VariableDeclarator', id: id(s.left.name) }] },
        right: this.expr(s.right), body: this.stmtOne(s.body),
      };
      case 'SwitchStatement': return {
        type: 'SwitchStatement', discriminant: this.expr(s.discriminant),
        cases: s.cases.map((c) => ({ type: 'SwitchCase' as const, ...(c.test ? { test: this.expr(c.test) } : {}), body: this.block(c.body).body })),
      };
      case 'BreakStatement': return { type: 'BreakStatement', ...(s.label ? { label: s.label.name } : {}) };
      case 'ContinueStatement': return { type: 'ContinueStatement', ...(s.label ? { label: s.label.name } : {}) };
      case 'ThrowStatement': return { type: 'ThrowStatement', argument: this.expr(s.argument) };
      case 'TryStatement': return {
        type: 'TryStatement', block: this.block(s.block.body),
        ...(s.handler ? { handler: { type: 'CatchClause' as const, ...(s.handler.param ? { param: id(s.handler.param.name) } : {}), body: this.block(s.handler.body.body) } } : {}),
        ...(s.finalizer ? { finalizer: this.block(s.finalizer.body) } : {}),
      };
      case 'BlockStatement': return this.block(s.body);
      case 'ExpressionStatement': return { type: 'ExpressionStatement', expression: this.expr(s.expression) };
      case 'LabeledStatement': return this.stmtOne(s.body); // labels rarely used; body kept
      case 'EmptyStatement': case 'DebuggerStatement': return { type: 'EmptyStatement' };
    }
  }

  /** Lower a statement to exactly one IR statement (wrap multi in a block). */
  private stmtOne(s: Statement): IrStatement {
    const r = this.stmt(s);
    if (!r) return { type: 'EmptyStatement' };
    return Array.isArray(r) ? { type: 'BlockStatement', body: r } : r;
  }

  private block(body: readonly Statement[]): IrBlock {
    const out: IrStatement[] = [];
    for (const s of body) { const r = this.stmt(s); if (r) out.push(...(Array.isArray(r) ? r : [r])); }
    return { type: 'BlockStatement', body: out };
  }

  private functionDecl(s: import('@superjs/types').FunctionDecl) {
    return {
      type: 'FunctionDeclaration' as const, id: s.id.name, async: s.async, generator: s.generator,
      params: s.params.map((p) => this.param(p)), body: this.block(s.body.body),
    };
  }

  private classDecl(s: import('@superjs/types').ClassDecl) {
    return {
      type: 'ClassDeclaration' as const, id: s.id.name,
      ...(s.superClass ? { superClass: id(s.superClass.name[s.superClass.name.length - 1]!) } : {}),
      body: this.classMembers(s.members),
    };
  }

  private classMembers(members: readonly ClassMember[]): IrClassMember[] {
    const out: IrClassMember[] = [];
    for (const m of members) {
      if (m.kind === 'IndexSignature') continue; // type-level
      if (m.kind === 'ClassProperty') {
        if (m.abstract) continue;
        out.push({
          type: 'PropertyDefinition', key: this.key(m.name), static: m.static, computed: m.name.kind === 'ComputedKey',
          ...(m.value ? { value: this.expr(m.value) } : {}),
        });
      } else if (m.kind === 'ClassMethod') {
        if (!m.body) continue; // abstract method declaration
        out.push({
          type: 'MethodDefinition', kind: m.accessor ?? 'method', key: this.key(m.name), static: m.static, computed: m.name.kind === 'ComputedKey',
          value: { type: 'FunctionExpression', async: m.async, generator: m.generator, params: m.params.map((p) => this.param(p)), body: this.block(m.body.body) },
        });
      } else if (m.kind === 'ClassConstructor') {
        // Parameter properties → `this.x = x` assignments prepended to the body.
        const inits: IrStatement[] = [];
        for (const p of m.params) {
          if (p.accessModifier && p.pattern.kind === 'Identifier') {
            inits.push({
              type: 'ExpressionStatement',
              expression: { type: 'AssignmentExpression', operator: '=', left: member({ type: 'ThisExpression' }, p.pattern.name), right: id(p.pattern.name) },
            });
          }
        }
        out.push({
          type: 'MethodDefinition', kind: 'constructor', key: id('constructor'), static: false, computed: false,
          value: { type: 'FunctionExpression', async: false, generator: false, params: m.params.map((p) => this.param(p)), body: { type: 'BlockStatement', body: [...inits, ...this.block(m.body.body).body] } },
        });
      }
    }
    return out;
  }

  private param(p: Parameter): IrPattern {
    if (p.rest) return { type: 'RestElement', argument: this.pat(p.pattern) };
    if (p.default) return { type: 'AssignmentPattern', left: this.pat(p.pattern), right: this.expr(p.default) };
    return this.pat(p.pattern);
  }

  private pat(p: Pattern): IrPattern {
    switch (p.kind) {
      case 'Identifier': return id(p.name);
      case 'ArrayPattern': return { type: 'ArrayPattern', elements: p.elements.map((e) => e ? this.pat(e) : null) };
      case 'ObjectPattern': return {
        type: 'ObjectPattern',
        properties: p.properties.map((pp) => pp.kind === 'RestElement'
          ? { type: 'RestElement' as const, argument: id(pp.argument.name) }
          : { type: 'Property' as const, key: id(pp.key.name), value: this.pat(pp.value), shorthand: pp.shorthand, computed: false }),
      };
      case 'RestElement': return { type: 'RestElement', argument: id(p.argument.name) };
      case 'AssignmentPattern': return { type: 'AssignmentPattern', left: this.pat(p.left), right: this.expr(p.right) };
    }
  }

  private key(k: PropertyKey): IrPropertyKey {
    if (k.kind === 'Identifier') return id(k.name);
    if (k.kind === 'StringLiteral') return lit(k.value);
    if (k.kind === 'NumberLiteral') return lit(k.value);
    return id('$computed'); // ComputedKey handled via `computed` flag + value elsewhere
  }

  // ── Expressions ─────────────────────────────────────────────────────────────
  private expr(e: Expression): IrExpression {
    switch (e.kind) {
      case 'NumberLiteral': return lit(e.value);
      case 'StringLiteral': return lit(e.value);
      case 'BooleanLiteral': return lit(e.value);
      case 'NullLiteral': return lit(null);
      case 'UndefinedLiteral': return id('undefined');
      case 'BigIntLiteral': return { type: 'Literal', value: 0, bigint: e.raw };
      case 'RegexLiteral': return { type: 'Literal', value: null, regex: { pattern: e.pattern, flags: e.flags } };
      case 'TemplateLiteral': return { type: 'TemplateLiteral', quasis: e.quasis, expressions: e.expressions.map((x) => this.expr(x)) };
      case 'Identifier':
        if (this.isVariant(e.name)) return this.constructorValue(e.name);
        return id(e.name);
      case 'ThisExpression': return { type: 'ThisExpression' };
      case 'SuperExpression': return { type: 'Super' };
      case 'ParenthesizedExpression': return this.expr(e.expression);
      case 'TypeAssertion': return this.expr(e.expression); // `as T` erased
      case 'ArrayLiteral': return { type: 'ArrayExpression', elements: e.elements.map((el) => el === null ? null : el.kind === 'SpreadElement' ? this.spread(el) : this.expr(el)) };
      case 'ObjectLiteral': return this.objectLiteral(e);
      case 'SequenceExpression': return { type: 'SequenceExpression', expressions: e.expressions.map((x) => this.expr(x)) };
      case 'UnaryExpression': return { type: 'UnaryExpression', operator: e.operator, prefix: true, argument: this.expr(e.argument) };
      case 'UpdateExpression': return { type: 'UpdateExpression', operator: e.operator, prefix: e.prefix, argument: this.expr(e.argument) };
      case 'BinaryExpression': return { type: 'BinaryExpression', operator: e.operator, left: this.expr(e.left), right: this.expr(e.right) };
      case 'LogicalExpression': return { type: 'LogicalExpression', operator: e.operator, left: this.expr(e.left), right: this.expr(e.right) };
      case 'AssignmentExpression': return { type: 'AssignmentExpression', operator: e.operator, left: e.left.kind in PATTERN_KINDS && isPattern(e.left) ? this.pat(e.left as Pattern) : this.expr(e.left as Expression), right: this.expr(e.right) };
      case 'ConditionalExpression': return { type: 'ConditionalExpression', test: this.expr(e.test), consequent: this.expr(e.consequent), alternate: this.expr(e.alternate) };
      case 'CallExpression': return this.lowerCall(e);
      case 'NewExpression': return { type: 'NewExpression', callee: this.expr(e.callee), arguments: e.args.map((a) => a.kind === 'SpreadElement' ? this.spread(a) : this.expr(a)) };
      case 'MemberExpression': return { type: 'MemberExpression', object: this.expr(e.object), property: e.computed ? this.expr(e.property as Expression) : id((e.property as Identifier).name), computed: e.computed, optional: e.optional };
      case 'SpreadElement': return this.spread(e) as unknown as IrExpression;
      case 'AwaitExpression': return { type: 'AwaitExpression', argument: this.expr(e.argument) };
      case 'YieldExpression': return { type: 'YieldExpression', delegate: e.delegate, ...(e.argument ? { argument: this.expr(e.argument) } : {}) };
      case 'ArrowFunction': return { type: 'ArrowFunctionExpression', async: e.async, params: e.params.map((p) => this.param(p)), body: e.body.kind === 'BlockStatement' ? this.block(e.body.body) : this.expr(e.body) };
      case 'FunctionExpression': return { type: 'FunctionExpression', ...(e.id ? { id: e.id.name } : {}), async: e.async, generator: e.generator, params: e.params.map((p) => this.param(p)), body: this.block(e.body.body) };
      case 'ClassExpression': return { type: 'ClassExpression', ...(e.id ? { id: e.id.name } : {}), ...(e.superClass ? { superClass: id(e.superClass.name[e.superClass.name.length - 1]!) } : {}), body: this.classMembers(e.members) };
      case 'MatchExpression': return this.lowerMatch(e);
      case 'VariantConstructorExpression': return this.constructVariant(e.variant.name, e.argument ? this.expr(e.argument) : undefined);
      case 'JsxElement': return this.lowerJsxElement(e);
      case 'JsxFragment': return this.lowerJsxFragment(e);
    }
  }

  private spread(e: import('@superjs/types').SpreadElement): IrSpread {
    return { type: 'SpreadElement', argument: this.expr(e.argument) };
  }

  private objectLiteral(e: import('@superjs/types').ObjectLiteral): IrObject {
    const properties: (IrProperty | IrSpread)[] = [];
    for (const p of e.properties) {
      if (p.kind === 'SpreadElement') { properties.push(this.spread(p)); continue; }
      if (p.kind === 'PropertyDef') {
        properties.push({ type: 'Property', key: this.key(p.key), value: this.expr(p.value), kind: 'init', shorthand: p.shorthand, computed: p.key.kind === 'ComputedKey', method: false });
      } else {
        properties.push({
          type: 'Property', key: this.key(p.key), kind: p.accessor ?? 'init', shorthand: false, computed: p.key.kind === 'ComputedKey', method: !p.accessor,
          value: { type: 'FunctionExpression', async: p.async, generator: p.generator, params: p.params.map((x) => this.param(x)), body: this.block(p.body.body) },
        });
      }
    }
    return { type: 'ObjectExpression', properties };
  }

  private lowerCall(e: import('@superjs/types').CallExpression): IrExpression {
    // `Ok(x)` parses as a call — construct the tagged object instead.
    if (e.callee.kind === 'Identifier' && this.isVariant(e.callee.name)) {
      const arg = e.args[0];
      return this.constructVariant(e.callee.name, arg && arg.kind !== 'SpreadElement' ? this.expr(arg) : undefined);
    }
    return {
      type: 'CallExpression', callee: this.expr(e.callee),
      arguments: e.args.map((a) => a.kind === 'SpreadElement' ? this.spread(a) : this.expr(a)),
      optional: e.optional,
    };
  }

  // ── Sum-type construction (052) ──────────────────────────────────────────────
  private constructVariant(tag: string, arg: IrExpression | undefined): IrObject {
    const info = this.variants.get(tag);
    const props: (IrProperty | IrSpread)[] = [tagProp(tag)];
    if (info?.form === 'record' && arg && arg.type === 'ObjectExpression') {
      props.push(...arg.properties);
    } else if (arg) {
      props.push(prop('_0', arg));
    }
    return { type: 'ObjectExpression', properties: props };
  }

  /** A variant name in value position (higher-order use): wrap or inline. */
  private constructorValue(tag: string): IrExpression {
    const info = this.variants.get(tag);
    if (!info || info.form === 'unit') return this.constructVariant(tag, undefined);
    if (info.form === 'record') {
      // (o) => ({ _tag, ...o })
      return { type: 'ArrowFunctionExpression', async: false, params: [id('$o')], body: { type: 'ObjectExpression', properties: [tagProp(tag), { type: 'SpreadElement', argument: id('$o') }] } };
    }
    // tuple: (v) => ({ _tag, _0: v })
    return { type: 'ArrowFunctionExpression', async: false, params: [id('$v')], body: { type: 'ObjectExpression', properties: [tagProp(tag), prop('_0', id('$v'))] } };
  }

  // ── Match lowering (053) ─────────────────────────────────────────────────────
  private lowerMatch(e: MatchExpression): IrExpression {
    const body: IrStatement[] = [
      { type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator', id: id('$m'), init: this.expr(e.subject) }] },
    ];
    let hasCatchAll = false;
    for (const arm of e.arms) {
      const { stmt, catchAll } = this.lowerArm(arm);
      body.push(stmt);
      if (catchAll) { hasCatchAll = true; }
    }
    if (!hasCatchAll) {
      body.push({ type: 'ThrowStatement', argument: { type: 'NewExpression', callee: id('Error'), arguments: [lit('[SJS] Non-exhaustive match')] } });
    }
    // (() => { ... })()
    const iife: IrExpression = { type: 'ArrowFunctionExpression', async: false, params: [], body: { type: 'BlockStatement', body } };
    return call(iife, []);
  }

  private lowerArm(arm: MatchArm): { stmt: IrStatement; catchAll: boolean } {
    const p = arm.pattern;
    const ret = this.armBody(arm.body);
    switch (p.kind) {
      case 'TupleVariantPattern': {
        const bind: IrStatement = { type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator', id: id(p.binding.name), init: member(id('$m'), '_0') }] };
        return { stmt: tagIf(p.variant.name, [bind, ...ret]), catchAll: false };
      }
      case 'RecordVariantPattern': {
        const props = p.fields.map((f) => ({ type: 'Property' as const, key: id(f.field.name), value: id((f.binding ?? f.field).name) as IrPattern, shorthand: !f.binding, computed: false }));
        const bind: IrStatement = { type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator', id: { type: 'ObjectPattern', properties: props }, init: id('$m') }] };
        return { stmt: tagIf(p.variant.name, [bind, ...ret]), catchAll: false };
      }
      case 'UnitVariantPattern':
        if (!this.isVariant(p.variant.name)) {
          // binding pattern — always matches
          const bind: IrStatement = { type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator', id: id(p.variant.name), init: id('$m') }] };
          return { stmt: { type: 'BlockStatement', body: [bind, ...ret] }, catchAll: true };
        }
        return { stmt: tagIf(p.variant.name, ret), catchAll: false };
      case 'DefaultPattern':
        return { stmt: ret.length === 1 ? ret[0]! : { type: 'BlockStatement', body: ret }, catchAll: true };
    }
  }

  /** Arm body → statements ending in a `return`. */
  private armBody(body: Expression | BlockStatement): IrStatement[] {
    if (body.kind !== 'BlockStatement') return [{ type: 'ReturnStatement', argument: this.expr(body) }];
    const lowered = [...this.block(body.body).body];
    const last = lowered[lowered.length - 1];
    if (last && last.type === 'ExpressionStatement') {
      return [...lowered.slice(0, -1), { type: 'ReturnStatement', argument: last.expression }];
    }
    return lowered;
  }

  // ── JSX lowering (050) ───────────────────────────────────────────────────────
  private lowerJsxElement(e: JsxElement): IrExpression {
    const name = e.opening.name;
    const callee: IrExpression = name.kind === 'JsxMemberName'
      ? member(id(name.object.name), name.property.name)
      : isHostElement(name.name) ? lit(name.name) : id(name.name);
    const props = this.jsxAttributes(e.opening.attributes);
    const children = e.children.map((c) => this.jsxChild(c)).filter((c): c is IrExpression => c !== null);
    return call(member(id('React'), 'createElement'), [callee, props, ...children]);
  }

  private lowerJsxFragment(e: JsxFragment): IrExpression {
    const children = e.children.map((c) => this.jsxChild(c)).filter((c): c is IrExpression => c !== null);
    return call(member(id('React'), 'createElement'), [member(id('React'), 'Fragment'), lit(null), ...children]);
  }

  private jsxAttributes(attrs: readonly (JsxAttribute | import('@superjs/types').JsxSpreadAttribute)[]): IrExpression {
    if (attrs.length === 0) return lit(null);
    const properties: (IrProperty | IrSpread)[] = [];
    for (const a of attrs) {
      if (a.kind === 'JsxSpreadAttribute') { properties.push({ type: 'SpreadElement', argument: this.expr(a.argument) }); continue; }
      let value: IrExpression;
      if (!a.value) value = lit(true);
      else if (a.value.kind === 'StringLiteral') value = lit(a.value.value);
      else if (a.value.kind === 'JsxExpressionContainer') value = this.expr(a.value.expression);
      else value = this.expr(a.value);
      properties.push({ type: 'Property', key: id(a.name.name), value, kind: 'init', shorthand: false, computed: false, method: false });
    }
    return { type: 'ObjectExpression', properties };
  }

  private jsxChild(c: JsxChild): IrExpression | null {
    switch (c.kind) {
      case 'JsxText': { const t = c.value.trim(); return t ? lit(t) : null; }
      case 'JsxExpressionContainer': return this.expr(c.expression);
      case 'JsxElement': return this.lowerJsxElement(c);
      case 'JsxFragment': return this.lowerJsxFragment(c);
    }
  }
}

// ── Free helpers ────────────────────────────────────────────────────────────────
const PATTERN_KINDS = { ArrayPattern: 1, ObjectPattern: 1 } as const;
function isPattern(e: Expression | Pattern): e is Pattern {
  return e.kind === 'ArrayPattern' || e.kind === 'ObjectPattern' || e.kind === 'AssignmentPattern' || e.kind === 'RestElement';
}

function tagProp(tag: string): IrProperty {
  return { type: 'Property', key: id('_tag'), value: lit(tag), kind: 'init', shorthand: false, computed: false, method: false };
}
function prop(name: string, value: IrExpression): IrProperty {
  return { type: 'Property', key: id(name), value, kind: 'init', shorthand: false, computed: false, method: false };
}
function tagIf(tag: string, body: IrStatement[]): IrStatement {
  return {
    type: 'IfStatement',
    test: { type: 'BinaryExpression', operator: '===', left: member(id('$m'), '_tag'), right: lit(tag) },
    consequent: { type: 'BlockStatement', body },
  };
}
function isHostElement(name: string): boolean {
  // Lowercase first letter ⇒ DOM/host element → string tag (React convention).
  return name.length > 0 && name[0] === name[0]!.toLowerCase() && name[0] !== name[0]!.toUpperCase();
}
