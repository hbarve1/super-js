/**
 * `format` — the canonical SuperJS source formatter (Stage 3).
 *
 * Parses, prints the AST in canonical style (2-space indent, semicolons, one
 * statement per line), then **re-parses the output and structurally compares it
 * to the original AST**. If they differ — a printer gap, a parse error, anything
 * — the original source is returned unchanged. The formatter therefore never
 * corrupts code: it only rewrites files it can prove are semantically identical.
 *
 * Grouping is preserved via the AST's explicit `ParenthesizedExpression` /
 * `ParenthesizedTypeNode` nodes, so no precedence arithmetic is needed here.
 */

import type {
  Program, Statement, Expression, Pattern, TypeNode, TypeParam, Parameter,
  BlockStatement, ClassMember, InterfaceMember, PropertyKey, SumTypeDef,
  VariantDef, MatchArm, MatchPattern, SwitchCase, Node,
} from '@superjs/types';
import { parse } from '@superjs/parser';

export interface FormatResult {
  /** Formatted source (or the original, unchanged, when it can't be safely formatted). */
  readonly code: string;
  /** True when the formatter produced output different from the input. */
  readonly changed: boolean;
}

/** Format SuperJS source. Never throws; returns the input unchanged on any doubt. */
export function format(source: string): FormatResult {
  const parsed = parse(source);
  if (parsed.diagnostics.some((d) => d.severity === 'error')) return { code: source, changed: false };

  let printed: string;
  try { printed = new Printer().print(parsed.program); }
  catch { return { code: source, changed: false }; }

  // Safety gate: the printed form must re-parse to a structurally identical AST.
  const reparsed = parse(printed);
  if (reparsed.diagnostics.some((d) => d.severity === 'error')
    || !astEqual(parsed.program, reparsed.program)) {
    return { code: source, changed: false };
  }
  const code = printed.endsWith('\n') ? printed : `${printed}\n`;
  return { code, changed: code !== source };
}

/** Structural AST equality, ignoring positional fields. */
function astEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => astEqual(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
    const keys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => k !== 'span' && k !== 'loc');
    const ak = keys(ao), bk = keys(bo);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => astEqual(ao[k], bo[k]));
  }
  return a === b;
}

const INDENT = '  ';

class Printer {
  private level = 0;

  print(program: Program): string {
    return program.body.map((s) => this.stmt(s)).join('\n');
  }

  private get pad(): string { return INDENT.repeat(this.level); }

  // ── Statements ────────────────────────────────────────────────────────────
  private stmt(s: Statement): string {
    const p = this.pad;
    switch (s.kind) {
      case 'VariableDecl':
        return p + this.varDecl(s) + ';';
      case 'FunctionDecl': {
        const a = s.async ? 'async ' : '', g = s.generator ? '*' : '';
        return `${p}${a}function${g} ${s.id.name}${this.typeParams(s.typeParams)}(${this.params(s.params)})${this.retType(s.returnType)} ${this.block(s.body)}`;
      }
      case 'ClassDecl': {
        const ab = s.abstract ? 'abstract ' : '';
        const ext = s.superClass ? ` extends ${this.type(s.superClass)}` : '';
        return `${p}${ab}class ${s.id.name}${this.typeParams(s.typeParams)}${ext} ${this.classBody(s.members)}`;
      }
      case 'ObjectTypeDecl': {
        const ext = s.extends.length ? ` extends ${s.extends.map((e) => this.type(e)).join(', ')}` : '';
        return `${p}type ${s.id.name}${this.typeParams(s.typeParams)}${ext} ${this.interfaceBody(s.members)}`;
      }
      case 'TypeDecl': {
        const v = s.value.kind === 'SumTypeDef' ? this.sumDef(s.value) : this.type(s.value);
        return `${p}type ${s.id.name}${this.typeParams(s.typeParams)} = ${v};`;
      }
      case 'ImportDecl': return p + this.importDecl(s) + ';';
      case 'ExportNamedDecl': return p + this.exportNamed(s);
      case 'ExportDefaultDecl': {
        const d = s.declaration;
        const body = d.kind === 'FunctionDecl' || d.kind === 'ClassDecl'
          ? this.stmt(d as Statement).trimStart()
          : this.expr(d as Expression) + ';';
        return `${p}export default ${body}`;
      }
      case 'ExportAllDecl':
        return `${p}export *${s.exported ? ` as ${s.exported.name}` : ''} from ${this.expr(s.source)};`;
      case 'ExpressionStatement': return p + this.expr(s.expression) + ';';
      case 'ReturnStatement': return p + 'return' + (s.argument ? ' ' + this.expr(s.argument) : '') + ';';
      case 'IfStatement': return p + this.ifStmt(s);
      case 'WhileStatement': return `${p}while (${this.expr(s.test)}) ${this.bodyStmt(s.body)}`;
      case 'DoWhileStatement': return `${p}do ${this.bodyStmt(s.body)} while (${this.expr(s.test)});`;
      case 'ForStatement': {
        const init = s.init ? (s.init.kind === 'VariableDecl' ? this.varDecl(s.init) : this.expr(s.init)) : '';
        return `${p}for (${init}; ${s.test ? this.expr(s.test) : ''}; ${s.update ? this.expr(s.update) : ''}) ${this.bodyStmt(s.body)}`;
      }
      case 'ForOfStatement': {
        const aw = s.await ? 'await ' : '';
        const ty = s.typeAnnotation ? `: ${this.type(s.typeAnnotation)}` : '';
        return `${p}for ${aw}(${s.declKind} ${this.pattern(s.left)}${ty} of ${this.expr(s.right)}) ${this.bodyStmt(s.body)}`;
      }
      case 'ForInStatement':
        return `${p}for (${s.declKind} ${s.left.name} in ${this.expr(s.right)}) ${this.bodyStmt(s.body)}`;
      case 'SwitchStatement': return p + this.switchStmt(s);
      case 'BreakStatement': return p + 'break' + (s.label ? ' ' + s.label.name : '') + ';';
      case 'ContinueStatement': return p + 'continue' + (s.label ? ' ' + s.label.name : '') + ';';
      case 'ThrowStatement': return `${p}throw ${this.expr(s.argument)};`;
      case 'TryStatement': return p + this.tryStmt(s);
      case 'BlockStatement': return p + this.block(s);
      case 'LabeledStatement': return `${p}${s.label.name}: ${this.stmt(s.body).trimStart()}`;
      case 'EmptyStatement': return p + ';';
      case 'DebuggerStatement': return p + 'debugger;';
    }
  }

  private varDecl(s: { declKind: string; declarators: readonly { id: Pattern; typeAnnotation?: TypeNode; init?: Expression }[] }): string {
    const decls = s.declarators.map((d) => {
      const ty = d.typeAnnotation ? `: ${this.type(d.typeAnnotation)}` : '';
      const init = d.init ? ` = ${this.expr(d.init)}` : '';
      return `${this.pattern(d.id)}${ty}${init}`;
    }).join(', ');
    return `${s.declKind} ${decls}`;
  }

  private ifStmt(s: { test: Expression; consequent: Statement; alternate?: Statement }): string {
    let out = `if (${this.expr(s.test)}) ${this.bodyStmt(s.consequent)}`;
    if (s.alternate) {
      out += s.alternate.kind === 'IfStatement'
        ? ` else ${this.stmt(s.alternate).trimStart()}`
        : ` else ${this.bodyStmt(s.alternate)}`;
    }
    return out;
  }

  /** A statement in a position that should be a block; non-blocks print inline. */
  private bodyStmt(s: Statement): string {
    return s.kind === 'BlockStatement' ? this.block(s) : this.stmt(s).trimStart();
  }

  private switchStmt(s: SwitchStatement): string {
    const inner = this.level + 1;
    const cases = s.cases.map((c) => this.switchCase(c, inner)).join('\n');
    return `switch (${this.expr(s.discriminant)}) {\n${cases}\n${this.pad}}`;
  }

  private switchCase(c: SwitchCase, level: number): string {
    const head = `${INDENT.repeat(level)}${c.test ? `case ${this.expr(c.test)}` : 'default'}:`;
    if (c.body.length === 0) return head;
    this.level = level + 1;
    const body = c.body.map((st) => this.stmt(st)).join('\n');
    this.level = level - 1;
    return `${head}\n${body}`;
  }

  private tryStmt(s: TryStatement): string {
    let out = `try ${this.block(s.block)}`;
    if (s.handler) {
      const h = s.handler;
      const param = h.param ? ` (${h.param.name}${h.paramType ? `: ${this.type(h.paramType)}` : ''})` : '';
      out += ` catch${param} ${this.block(h.body)}`;
    }
    if (s.finalizer) out += ` finally ${this.block(s.finalizer)}`;
    return out;
  }

  private importDecl(s: ImportDecl): string {
    const to = (sp: { imported: { name: string }; local: { name: string } }) =>
      sp.imported.name === sp.local.name ? sp.imported.name : `${sp.imported.name} as ${sp.local.name}`;
    const clauses: string[] = [];
    if (s.defaultImport) clauses.push(s.defaultImport.name);
    if (s.namespaceImport) clauses.push(`* as ${s.namespaceImport.name}`);
    if (s.named.length) clauses.push(`{ ${s.named.map(to).join(', ')} }`);
    const kw = `import${s.typeOnly ? ' type' : ''}`;
    if (clauses.length === 0) return `${kw} ${this.expr(s.source)}`;
    return `${kw} ${clauses.join(', ')} from ${this.expr(s.source)}`;
  }

  private exportNamed(s: ExportNamedDecl): string {
    if (s.declaration) return `export ${this.stmt(s.declaration).trimStart()}`;
    const to = (sp: { local: { name: string }; exported: { name: string } }) =>
      sp.local.name === sp.exported.name ? sp.local.name : `${sp.local.name} as ${sp.exported.name}`;
    const t = s.typeOnly ? 'type ' : '';
    const from = s.source ? ` from ${this.expr(s.source)}` : '';
    return `export ${t}{ ${s.specifiers.map(to).join(', ')} }${from};`;
  }

  // ── Blocks / bodies ─────────────────────────────────────────────────────────
  private block(b: BlockStatement): string {
    if (b.body.length === 0) return '{}';
    this.level++;
    const body = b.body.map((s) => this.stmt(s)).join('\n');
    this.level--;
    return `{\n${body}\n${this.pad}}`;
  }

  private classBody(members: readonly ClassMember[]): string {
    if (members.length === 0) return '{}';
    this.level++;
    const body = members.map((m) => this.pad + this.classMember(m)).join('\n');
    this.level--;
    return `{\n${body}\n${this.pad}}`;
  }

  private classMember(m: ClassMember): string {
    switch (m.kind) {
      case 'ClassProperty': {
        const mods = [m.accessModifier, m.static && 'static', m.abstract && 'abstract', m.readonly && 'readonly']
          .filter(Boolean).join(' ');
        const ty = m.typeAnnotation ? `: ${this.type(m.typeAnnotation)}` : '';
        const val = m.value ? ` = ${this.expr(m.value)}` : '';
        return `${mods ? mods + ' ' : ''}${this.key(m.name)}${m.optional ? '?' : ''}${ty}${val};`;
      }
      case 'ClassMethod': {
        const mods = [m.accessModifier, m.static && 'static', m.abstract && 'abstract', m.async && 'async']
          .filter(Boolean).join(' ');
        const g = m.generator ? '*' : '', acc = m.accessor ? `${m.accessor} ` : '';
        const sig = `${acc}${g}${this.key(m.name)}${this.typeParams(m.typeParams)}(${this.params(m.params)})${this.retType(m.returnType)}`;
        return `${mods ? mods + ' ' : ''}${sig}${m.body ? ` ${this.block(m.body)}` : ';'}`;
      }
      case 'ClassConstructor': {
        const mods = m.accessModifier ? m.accessModifier + ' ' : '';
        return `${mods}constructor(${this.params(m.params)}) ${this.block(m.body)}`;
      }
      case 'IndexSignature':
        return `[${m.keyName.name}: ${this.type(m.keyType)}]: ${this.type(m.valueType)};`;
    }
  }

  private interfaceBody(members: readonly InterfaceMember[]): string {
    if (members.length === 0) return '{}';
    this.level++;
    const body = members.map((m) => this.pad + this.interfaceMember(m)).join('\n');
    this.level--;
    return `{\n${body}\n${this.pad}}`;
  }

  private interfaceMember(m: InterfaceMember): string {
    if (m.kind === 'IndexSignature') return `[${m.keyName.name}: ${this.type(m.keyType)}]: ${this.type(m.valueType)};`;
    if (m.kind === 'InterfaceMethod')
      return `${this.key(m.name)}${this.typeParams(m.typeParams)}(${this.params(m.params)}): ${this.type(m.returnType)};`;
    const ro = m.readonly ? 'readonly ' : '';
    return `${ro}${this.key(m.name)}${m.optional ? '?' : ''}: ${this.type(m.type)};`;
  }

  // ── Expressions ───────────────────────────────────────────────────────────
  private expr(e: Expression): string {
    switch (e.kind) {
      case 'NumberLiteral': return e.raw;
      case 'StringLiteral': return e.raw;
      case 'BigIntLiteral': return e.raw;
      case 'BooleanLiteral': return String(e.value);
      case 'NullLiteral': return 'null';
      case 'UndefinedLiteral': return 'undefined';
      case 'RegexLiteral': return `/${e.pattern}/${e.flags}`;
      case 'Identifier': return e.name;
      case 'ThisExpression': return 'this';
      case 'SuperExpression': return 'super';
      case 'TemplateLiteral': return this.template(e);
      case 'ArrayLiteral':
        return `[${e.elements.map((el) => el === null ? '' : this.expr(el)).join(', ')}]`;
      case 'ObjectLiteral':
        return e.properties.length === 0 ? '{}' : `{ ${e.properties.map((pr) => this.objMember(pr)).join(', ')} }`;
      case 'ArrowFunction': {
        const a = e.async ? 'async ' : '';
        const body = e.body.kind === 'BlockStatement' ? this.block(e.body) : this.expr(e.body);
        return `${a}(${this.params(e.params)})${this.retType(e.returnType)} => ${body}`;
      }
      case 'FunctionExpression': {
        const a = e.async ? 'async ' : '', g = e.generator ? '*' : '';
        return `${a}function${g}${e.id ? ' ' + e.id.name : ''}${this.typeParams(e.typeParams)}(${this.params(e.params)})${this.retType(e.returnType)} ${this.block(e.body)}`;
      }
      case 'ClassExpression': {
        const ext = e.superClass ? ` extends ${this.type(e.superClass)}` : '';
        return `class${e.id ? ' ' + e.id.name : ''}${this.typeParams(e.typeParams)}${ext} ${this.classBody(e.members)}`;
      }
      case 'TypeAssertion': return `${this.expr(e.expression)} as ${this.type(e.type)}`;
      case 'UnaryExpression': {
        const word = /^[a-z]/.test(e.operator);
        return `${e.operator}${word ? ' ' : ''}${this.expr(e.argument)}`;
      }
      case 'UpdateExpression':
        return e.prefix ? `${e.operator}${this.expr(e.argument)}` : `${this.expr(e.argument)}${e.operator}`;
      case 'BinaryExpression': return `${this.expr(e.left)} ${e.operator} ${this.expr(e.right)}`;
      case 'LogicalExpression': return `${this.expr(e.left)} ${e.operator} ${this.expr(e.right)}`;
      case 'AssignmentExpression':
        return `${e.left.kind in PATTERN_KINDS ? this.pattern(e.left as Pattern) : this.expr(e.left as Expression)} ${e.operator} ${this.expr(e.right)}`;
      case 'ConditionalExpression':
        return `${this.expr(e.test)} ? ${this.expr(e.consequent)} : ${this.expr(e.alternate)}`;
      case 'CallExpression':
        return `${this.expr(e.callee)}${e.optional ? '?.' : ''}${this.typeArgs(e.typeArgs)}(${this.args(e.args)})`;
      case 'NewExpression':
        return `new ${this.expr(e.callee)}${this.typeArgs(e.typeArgs)}(${this.args(e.args)})`;
      case 'MemberExpression': {
        if (e.computed) return `${this.expr(e.object)}${e.optional ? '?.' : ''}[${this.expr(e.property as Expression)}]`;
        const prop = (e.property as { name: string }).name;
        return `${this.expr(e.object)}${e.optional ? '?.' : '.'}${prop}`;
      }
      case 'SequenceExpression': return e.expressions.map((x) => this.expr(x)).join(', ');
      case 'SpreadElement': return `...${this.expr(e.argument)}`;
      case 'AwaitExpression': return `await ${this.expr(e.argument)}`;
      case 'YieldExpression':
        return `yield${e.delegate ? '*' : ''}${e.argument ? ' ' + this.expr(e.argument) : ''}`;
      case 'ParenthesizedExpression': return `(${this.expr(e.expression)})`;
      case 'MatchExpression': return this.match(e);
      case 'VariantConstructorExpression':
        return `${e.variant.name}${e.argument ? `(${this.expr(e.argument)})` : ''}`;
      case 'JsxElement': case 'JsxFragment': return this.jsx(e);
    }
  }

  private template(e: { quasis: readonly string[]; expressions: readonly Expression[] }): string {
    let out = '`' + e.quasis[0];
    e.expressions.forEach((ex, i) => { out += '${' + this.expr(ex) + '}' + e.quasis[i + 1]; });
    return out + '`';
  }

  private objMember(p: PropertyDef | SpreadElement | ObjectMethod): string {
    if (p.kind === 'SpreadElement') return `...${this.expr(p.argument)}`;
    if (p.kind === 'ObjectMethod') {
      const a = p.async ? 'async ' : '', g = p.generator ? '*' : '', acc = p.accessor ? `${p.accessor} ` : '';
      return `${a}${acc}${g}${this.key(p.key)}(${this.params(p.params)})${this.retType(p.returnType)} ${this.block(p.body)}`;
    }
    if (p.shorthand) return this.key(p.key);
    return `${this.key(p.key)}: ${this.expr(p.value)}`;
  }

  private match(e: MatchExpression): string {
    this.level++;
    const arms = e.arms.map((a) => this.pad + this.matchArm(a)).join('\n');
    this.level--;
    return `match ${this.expr(e.subject)} {\n${arms}\n${this.pad}}`;
  }

  private matchArm(a: MatchArm): string {
    const body = a.body.kind === 'BlockStatement' ? this.block(a.body) : this.expr(a.body);
    return `${this.matchPattern(a.pattern)} => ${body},`;
  }

  private matchPattern(p: MatchPattern): string {
    switch (p.kind) {
      case 'TupleVariantPattern': return `${p.variant.name}(${p.binding.name})`;
      case 'RecordVariantPattern':
        return `${p.variant.name}({ ${p.fields.map((f) => f.binding ? `${f.field.name}: ${f.binding.name}` : f.field.name).join(', ')} })`;
      case 'UnitVariantPattern': return p.variant.name;
      case 'DefaultPattern': return '_';
    }
  }

  private jsx(_node: Node): string {
    // JSX layout is whitespace-sensitive; signal "can't format" so the safety
    // gate keeps the original source (throw → format() returns input unchanged).
    throw new Error('jsx formatting not supported');
  }

  // ── Patterns ──────────────────────────────────────────────────────────────
  private pattern(p: Pattern): string {
    switch (p.kind) {
      case 'Identifier': return p.name;
      case 'ArrayPattern': return `[${p.elements.map((el) => el === null ? '' : this.pattern(el)).join(', ')}]`;
      case 'ObjectPattern':
        return `{ ${p.properties.map((pr) => pr.kind === 'RestElement' ? `...${pr.argument.name}`
          : pr.shorthand ? this.pattern(pr.value) : `${pr.key.name}: ${this.pattern(pr.value)}`).join(', ')} }`;
      case 'RestElement': return `...${p.argument.name}`;
      case 'AssignmentPattern': return `${this.pattern(p.left)} = ${this.expr(p.right)}`;
    }
  }

  // ── Types ───────────────────────────────────────────────────────────────────
  private type(t: TypeNode): string {
    switch (t.kind) {
      case 'PrimitiveTypeNode': return t.name;
      case 'TypeRefNode': return t.name.join('.') + this.typeArgs(t.typeArgs);
      case 'ArrayTypeNode': return `${this.type(t.element)}[]`;
      case 'TupleTypeNode': return `[${t.elements.map((x) => this.type(x)).join(', ')}]`;
      case 'FunctionTypeNode':
        return `(${t.params.map((p) => `${p.rest ? '...' : ''}${p.name.name}${p.optional ? '?' : ''}: ${this.type(p.type)}`).join(', ')}) => ${this.type(t.returnType)}`;
      case 'ObjectTypeNode':
        return t.members.length === 0 ? '{}' : `{ ${t.members.map((m) => this.typeMember(m)).join('; ')} }`;
      case 'NullableTypeNode': return `${this.type(t.inner)}?`;
      case 'UnionTypeNode': return t.types.map((x) => this.type(x)).join(' | ');
      case 'ParenthesizedTypeNode': return `(${this.type(t.inner)})`;
    }
  }

  private typeMember(m: InterfaceMember): string {
    if (m.kind === 'IndexSignature') return `[${m.keyName.name}: ${this.type(m.keyType)}]: ${this.type(m.valueType)}`;
    if (m.kind === 'InterfaceMethod')
      return `${this.key(m.name)}(${this.params(m.params)}): ${this.type(m.returnType)}`;
    const ro = m.readonly ? 'readonly ' : '';
    return `${ro}${this.key(m.name)}${m.optional ? '?' : ''}: ${this.type(m.type)}`;
  }

  private sumDef(d: SumTypeDef): string {
    return d.variants.map((v) => this.variant(v)).join(' | ');
  }

  private variant(v: VariantDef): string {
    if (v.form === 'unit') return v.name.name;
    if (v.form === 'tuple') return `${v.name.name}(${v.tupleType ? this.type(v.tupleType) : ''})`;
    const fields = (v.fields ?? []).map((f) => `${f.name.name}${f.optional ? '?' : ''}: ${this.type(f.type)}`).join(', ');
    return `${v.name.name}({ ${fields} })`;
  }

  // ── Shared pieces ─────────────────────────────────────────────────────────
  private params(ps: readonly Parameter[]): string {
    return ps.map((p) => {
      const mod = p.accessModifier ? p.accessModifier + ' ' : '';
      const ty = p.typeAnnotation ? `: ${this.type(p.typeAnnotation)}` : '';
      const def = p.default ? ` = ${this.expr(p.default)}` : '';
      return `${p.rest ? '...' : ''}${mod}${this.pattern(p.pattern)}${p.optional ? '?' : ''}${ty}${def}`;
    }).join(', ');
  }

  private typeParams(tps: readonly TypeParam[] | undefined): string {
    if (!tps?.length) return '';
    return `<${tps.map((tp) => `${tp.name.name}${tp.default ? ` = ${this.type(tp.default)}` : ''}`).join(', ')}>`;
  }

  private typeArgs(ta: readonly TypeNode[] | undefined): string {
    return ta?.length ? `<${ta.map((t) => this.type(t)).join(', ')}>` : '';
  }

  private retType(t: TypeNode | undefined): string {
    return t ? `: ${this.type(t)}` : '';
  }

  private args(as: readonly (Expression)[]): string {
    return as.map((a) => this.expr(a)).join(', ');
  }

  private key(k: PropertyKey): string {
    if (k.kind === 'Identifier') return k.name;
    if (k.kind === 'StringLiteral') return k.raw;
    if (k.kind === 'NumberLiteral') return k.raw;
    return `[${this.expr(k.expression)}]`;
  }
}

/** Pattern node kinds, to disambiguate an assignment LHS that is a pattern. */
const PATTERN_KINDS: Record<string, true> = {
  ArrayPattern: true, ObjectPattern: true, RestElement: true, AssignmentPattern: true,
};

// Local type aliases used above (kept narrow to avoid a wide import list).
type SwitchStatement = Extract<Statement, { kind: 'SwitchStatement' }>;
type TryStatement = Extract<Statement, { kind: 'TryStatement' }>;
type ImportDecl = Extract<Statement, { kind: 'ImportDecl' }>;
type ExportNamedDecl = Extract<Statement, { kind: 'ExportNamedDecl' }>;
type MatchExpression = Extract<Expression, { kind: 'MatchExpression' }>;
type PropertyDef = Extract<Node, { kind: 'PropertyDef' }>;
type SpreadElement = Extract<Expression, { kind: 'SpreadElement' }>;
type ObjectMethod = Extract<Node, { kind: 'ObjectMethod' }>;
