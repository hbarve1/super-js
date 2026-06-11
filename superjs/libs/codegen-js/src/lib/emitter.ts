/**
 * IR → ES2022 source text, emitting Source Map v3 segments as it goes.
 *
 * A precedence-aware pretty-printer over {@link IrProgram}. The IR is already
 * fully lowered (no SJS sugar), so this is a straight printer — the only
 * subtlety is expression parenthesisation to preserve evaluation order, and
 * recording a map segment at each node's start position.
 */

import type {
  IrProgram, IrStatement, IrExpression, IrPattern, IrBlock, IrLocated,
  IrVarDecl, IrClassMember, IrPropertyKey, IrProperty, IrSpread, SourceLoc,
} from '@superjs/ir';
import { SourceMapBuilder } from './sourcemap.js';

const INDENT = '  ';

// Expression precedence (higher binds tighter).
const PREC: Record<string, number> = {
  SequenceExpression: 1,
  AssignmentExpression: 2, ArrowFunctionExpression: 2, YieldExpression: 2,
  ConditionalExpression: 3,
  LogicalExpression: 4, // refined per-operator below
  BinaryExpression: 10, // refined per-operator below
  UnaryExpression: 15, AwaitExpression: 15,
  UpdateExpression: 16,
  CallExpression: 17, NewExpression: 17, MemberExpression: 18,
};
const BINOP_PREC: Record<string, number> = {
  '||': 4, '??': 4, '&&': 5, '|': 6, '^': 7, '&': 8,
  '==': 9, '!=': 9, '===': 9, '!==': 9,
  '<': 10, '>': 10, '<=': 10, '>=': 10, 'instanceof': 10, 'in': 10,
  '<<': 11, '>>': 11, '>>>': 11,
  '+': 12, '-': 12,
  '*': 13, '/': 13, '%': 13,
  '**': 14,
};

export interface EmitResult {
  readonly code: string;
  readonly map: ReturnType<SourceMapBuilder['encode']>;
}

export interface EmitOptions {
  /** Output JS filename (basename) for the map's `file` field. */
  readonly file?: string;
  /** Original `.sjs` source path (relative to project root) for `sources`. */
  readonly source?: string;
  /** Append `//# sourceMappingURL=` footer. */
  readonly sourceMappingURL?: string;
}

export function emit(program: IrProgram, opts: EmitOptions = {}): EmitResult {
  return new Emitter(opts).run(program);
}

class Emitter {
  private out = '';
  private genLine = 0;
  private genColumn = 0;
  private depth = 0;
  private atLineStart = true;
  private readonly map = new SourceMapBuilder();

  constructor(private readonly opts: EmitOptions) {}

  run(program: IrProgram): EmitResult {
    for (const s of program.body) this.stmt(s);
    const file = this.opts.file ?? 'output.js';
    const source = this.opts.source ?? 'input.sjs';
    if (this.opts.sourceMappingURL) {
      this.raw(`//# sourceMappingURL=${this.opts.sourceMappingURL}`);
      this.newline();
    }
    return { code: this.out, map: this.map.encode(file, [source]) };
  }

  // ── Low-level output ──────────────────────────────────────────────────────────
  private raw(str: string): void {
    if (str.length === 0) return;
    if (this.atLineStart) {
      const pad = INDENT.repeat(this.depth);
      this.out += pad;
      this.genColumn += pad.length;
      this.atLineStart = false;
    }
    this.out += str;
    this.genColumn += str.length;
  }

  private newline(): void {
    this.out += '\n';
    this.genLine++;
    this.genColumn = 0;
    this.atLineStart = true;
    this.map.newline();
  }

  /** Record a source-map segment at the current generated column. */
  private mark(node: object): void {
    const loc = (node as IrLocated).loc as SourceLoc | undefined;
    if (!loc) return;
    if (this.atLineStart) { this.out += INDENT.repeat(this.depth); this.genColumn += INDENT.repeat(this.depth).length; this.atLineStart = false; }
    this.map.add({
      genColumn: this.genColumn,
      sourceIndex: 0,
      sourceLine: loc.line - 1,    // v3 lines are 0-based; SJS positions 1-based
      sourceColumn: loc.column - 1,
    });
  }

  // ── Statements ────────────────────────────────────────────────────────────────
  private stmt(s: IrStatement): void {
    this.mark(s);
    switch (s.type) {
      case 'VariableDeclaration': this.varDecl(s); this.raw(';'); this.newline(); return;
      case 'FunctionDeclaration': {
        this.raw(`${s.async ? 'async ' : ''}function${s.generator ? '*' : ''} ${s.id}(`);
        this.params(s.params); this.raw(') '); this.block(s.body); this.newline(); return;
      }
      case 'ClassDeclaration': {
        this.raw(`class ${s.id}`);
        if (s.superClass) { this.raw(' extends '); this.expr(s.superClass, 18); }
        this.raw(' '); this.classBody(s.body); this.newline(); return;
      }
      case 'ReturnStatement':
        this.raw('return'); if (s.argument) { this.raw(' '); this.expr(s.argument, 0); } this.raw(';'); this.newline(); return;
      case 'IfStatement': this.ifStmt(s); return;
      case 'ForStatement': {
        this.raw('for (');
        if (s.init) { if (s.init.type === 'VariableDeclaration') this.varDecl(s.init); else this.expr(s.init, 0); }
        this.raw('; '); if (s.test) this.expr(s.test, 0);
        this.raw('; '); if (s.update) this.expr(s.update, 0);
        this.raw(') '); this.body(s.body); return;
      }
      case 'ForOfStatement':
        this.raw(`for ${s.await ? 'await ' : ''}(`); this.varDecl(s.left); this.raw(' of '); this.expr(s.right, 0); this.raw(') '); this.body(s.body); return;
      case 'ForInStatement':
        this.raw('for ('); this.varDecl(s.left); this.raw(' in '); this.expr(s.right, 0); this.raw(') '); this.body(s.body); return;
      case 'WhileStatement':
        this.raw('while ('); this.expr(s.test, 0); this.raw(') '); this.body(s.body); return;
      case 'DoWhileStatement':
        this.raw('do '); this.body(s.body, true); this.raw('while ('); this.expr(s.test, 0); this.raw(');'); this.newline(); return;
      case 'SwitchStatement': this.switchStmt(s); return;
      case 'BreakStatement': this.raw(`break${s.label ? ' ' + s.label : ''};`); this.newline(); return;
      case 'ContinueStatement': this.raw(`continue${s.label ? ' ' + s.label : ''};`); this.newline(); return;
      case 'ThrowStatement': this.raw('throw '); this.expr(s.argument, 0); this.raw(';'); this.newline(); return;
      case 'TryStatement': this.tryStmt(s); return;
      case 'BlockStatement': this.block(s); this.newline(); return;
      case 'ExpressionStatement': {
        // Parenthesise a statement-leading object/function to avoid ambiguity.
        const e = s.expression;
        const needParen = e.type === 'ObjectExpression' || e.type === 'FunctionExpression' || e.type === 'ClassExpression';
        if (needParen) this.raw('(');
        this.expr(e, 0);
        if (needParen) this.raw(')');
        this.raw(';'); this.newline(); return;
      }
      case 'ImportDeclaration': this.importDecl(s); return;
      case 'ExportNamedDeclaration': this.exportNamed(s); return;
      case 'ExportDefaultDeclaration': {
        this.raw('export default ');
        if (s.declaration.type === 'FunctionDeclaration' || s.declaration.type === 'ClassDeclaration') this.stmt(s.declaration);
        else { this.expr(s.declaration, 0); this.raw(';'); this.newline(); }
        return;
      }
      case 'EmptyStatement': return;
    }
  }

  private varDecl(s: IrVarDecl): void {
    this.raw(`${s.kind} `);
    s.declarations.forEach((d, i) => {
      if (i > 0) this.raw(', ');
      this.pattern(d.id);
      if (d.init) { this.raw(' = '); this.expr(d.init, 2); }
    });
  }

  private ifStmt(s: import('@superjs/ir').IrIf): void {
    this.raw('if ('); this.expr(s.test, 0); this.raw(') ');
    this.body(s.consequent, !!s.alternate);
    if (s.alternate) {
      this.raw('else ');
      if (s.alternate.type === 'IfStatement') this.stmt(s.alternate);
      else this.body(s.alternate);
    }
  }

  /** Emit a statement as a block body (brace it unless already a block). */
  private body(s: IrStatement, trailingSpace = false): void {
    if (s.type === 'BlockStatement') { this.block(s); if (trailingSpace) this.raw(' '); else this.newline(); }
    else if (s.type === 'EmptyStatement') { this.raw('{}'); this.newline(); }
    else { this.newline(); this.depth++; this.stmt(s); this.depth--; }
  }

  private block(b: IrBlock): void {
    if (b.body.length === 0) { this.raw('{}'); return; }
    this.raw('{'); this.newline(); this.depth++;
    for (const s of b.body) this.stmt(s);
    this.depth--; this.raw('}');
  }

  private switchStmt(s: import('@superjs/ir').IrSwitch): void {
    this.raw('switch ('); this.expr(s.discriminant, 0); this.raw(') {'); this.newline(); this.depth++;
    for (const c of s.cases) {
      if (c.test) { this.raw('case '); this.expr(c.test, 0); this.raw(':'); } else this.raw('default:');
      this.newline(); this.depth++;
      for (const st of c.body) this.stmt(st);
      this.depth--;
    }
    this.depth--; this.raw('}'); this.newline();
  }

  private tryStmt(s: import('@superjs/ir').IrTry): void {
    this.raw('try '); this.block(s.block);
    if (s.handler) {
      this.raw(' catch ');
      if (s.handler.param) { this.raw('('); this.pattern(s.handler.param); this.raw(') '); }
      this.block(s.handler.body);
    }
    if (s.finalizer) { this.raw(' finally '); this.block(s.finalizer); }
    this.newline();
  }

  private importDecl(s: import('@superjs/ir').IrImport): void {
    const clauses: string[] = [];
    if (s.defaultImport) clauses.push(s.defaultImport);
    if (s.namespaceImport) clauses.push(`* as ${s.namespaceImport}`);
    if (s.named.length) clauses.push(`{ ${s.named.map((n) => n.imported === n.local ? n.local : `${n.imported} as ${n.local}`).join(', ')} }`);
    if (clauses.length) this.raw(`import ${clauses.join(', ')} from ${JSON.stringify(s.source)};`);
    else this.raw(`import ${JSON.stringify(s.source)};`);
    this.newline();
  }

  private exportNamed(s: import('@superjs/ir').IrExport): void {
    if (s.declaration) { this.raw('export '); this.stmt(s.declaration); return; }
    this.raw(`export { ${s.specifiers.map((sp) => sp.local === sp.exported ? sp.local : `${sp.local} as ${sp.exported}`).join(', ')} }`);
    if (s.source) this.raw(` from ${JSON.stringify(s.source)}`);
    this.raw(';'); this.newline();
  }

  // ── Class members ─────────────────────────────────────────────────────────────
  private classBody(members: readonly IrClassMember[]): void {
    if (members.length === 0) { this.raw('{}'); return; }
    this.raw('{'); this.newline(); this.depth++;
    for (const m of members) {
      if (m.type === 'PropertyDefinition') {
        if (m.static) this.raw('static ');
        this.propKey(m.key, m.computed);
        if (m.value) { this.raw(' = '); this.expr(m.value, 2); }
        this.raw(';'); this.newline();
      } else {
        if (m.static) this.raw('static ');
        if (m.value.async) this.raw('async ');
        if (m.value.generator) this.raw('*');
        if (m.kind === 'get' || m.kind === 'set') this.raw(`${m.kind} `);
        this.propKey(m.key, m.computed);
        this.raw('('); this.params(m.value.params); this.raw(') '); this.block(m.value.body); this.newline();
      }
    }
    this.depth--; this.raw('}');
  }

  // ── Patterns ──────────────────────────────────────────────────────────────────
  private params(ps: readonly IrPattern[]): void {
    ps.forEach((p, i) => { if (i > 0) this.raw(', '); this.pattern(p); });
  }

  private pattern(p: IrPattern): void {
    switch (p.type) {
      case 'Identifier': this.raw(p.name); return;
      case 'RestElement': this.raw('...'); this.pattern(p.argument); return;
      case 'AssignmentPattern': this.pattern(p.left); this.raw(' = '); this.expr(p.right, 2); return;
      case 'ArrayPattern':
        this.raw('[');
        p.elements.forEach((e, i) => { if (i > 0) this.raw(', '); if (e) this.pattern(e); });
        this.raw(']'); return;
      case 'ObjectPattern':
        this.raw('{ ');
        p.properties.forEach((pp, i) => {
          if (i > 0) this.raw(', ');
          if (pp.type === 'RestElement') { this.raw('...'); this.pattern(pp.argument); }
          else { this.propKey(pp.key, pp.computed); if (!pp.shorthand) { this.raw(': '); this.pattern(pp.value); } }
        });
        this.raw(' }'); return;
    }
  }

  private propKey(k: IrPropertyKey, computed: boolean): void {
    if (computed) { this.raw('['); this.expr(k as IrExpression, 0); this.raw(']'); return; }
    if (k.type === 'Identifier') this.raw(k.name);
    else this.raw(typeof k.value === 'string' ? JSON.stringify(k.value) : String(k.value));
  }

  // ── Expressions ───────────────────────────────────────────────────────────────
  private expr(e: IrExpression, parentPrec: number): void {
    const prec = this.precOf(e);
    const paren = prec < parentPrec;
    if (paren) this.raw('(');
    this.mark(e);
    this.emitExpr(e);
    if (paren) this.raw(')');
  }

  private precOf(e: IrExpression): number {
    if (e.type === 'BinaryExpression' || e.type === 'LogicalExpression') return BINOP_PREC[e.operator] ?? 10;
    return PREC[e.type] ?? 20;
  }

  private emitExpr(e: IrExpression): void {
    switch (e.type) {
      case 'Identifier': this.raw(e.name); return;
      case 'Literal': this.literal(e); return;
      case 'ThisExpression': this.raw('this'); return;
      case 'Super': this.raw('super'); return;
      case 'TemplateLiteral': this.template(e); return;
      case 'ArrayExpression': this.array(e); return;
      case 'ObjectExpression': this.object(e); return;
      case 'SequenceExpression':
        e.expressions.forEach((x, i) => { if (i > 0) this.raw(', '); this.expr(x, 2); }); return;
      case 'UnaryExpression': {
        const word = /^[a-z]/.test(e.operator);
        this.raw(e.operator + (word ? ' ' : '')); this.expr(e.argument, 15); return;
      }
      case 'UpdateExpression':
        if (e.prefix) { this.raw(e.operator); this.expr(e.argument, 16); }
        else { this.expr(e.argument, 16); this.raw(e.operator); }
        return;
      case 'BinaryExpression': case 'LogicalExpression': {
        const p = this.precOf(e);
        const right = e.operator === '**'; // right-associative
        this.expr(e.left, right ? p + 1 : p);
        this.raw(` ${e.operator} `);
        this.expr(e.right, right ? p : p + 1);
        return;
      }
      case 'AssignmentExpression':
        if ('type' in e.left && (e.left.type === 'ArrayPattern' || e.left.type === 'ObjectPattern')) this.pattern(e.left as IrPattern);
        else this.expr(e.left as IrExpression, 2);
        this.raw(` ${e.operator} `); this.expr(e.right, 2); return;
      case 'ConditionalExpression':
        this.expr(e.test, 4); this.raw(' ? '); this.expr(e.consequent, 2); this.raw(' : '); this.expr(e.alternate, 2); return;
      case 'CallExpression':
        this.expr(e.callee, 17); this.raw(e.optional ? '?.(' : '('); this.args(e.arguments); this.raw(')'); return;
      case 'NewExpression':
        this.raw('new '); this.expr(e.callee, 18); this.raw('('); this.args(e.arguments); this.raw(')'); return;
      case 'MemberExpression':
        this.expr(e.object, 18);
        if (e.computed) { this.raw(e.optional ? '?.[' : '['); this.expr(e.property, 0); this.raw(']'); }
        else { this.raw(e.optional ? '?.' : '.'); this.expr(e.property, 18); }
        return;
      case 'SpreadElement': this.raw('...'); this.expr(e.argument, 2); return;
      case 'AwaitExpression': this.raw('await '); this.expr(e.argument, 15); return;
      case 'YieldExpression': this.raw(e.delegate ? 'yield*' : 'yield'); if (e.argument) { this.raw(' '); this.expr(e.argument, 2); } return;
      case 'ArrowFunctionExpression': this.arrow(e); return;
      case 'FunctionExpression': this.functionExpr(e); return;
      case 'ClassExpression':
        this.raw('class' + (e.id ? ' ' + e.id : ''));
        if (e.superClass) { this.raw(' extends '); this.expr(e.superClass, 18); }
        this.raw(' '); this.classBody(e.body); return;
    }
  }

  private literal(e: import('@superjs/ir').IrLiteral): void {
    if (e.bigint) { this.raw(e.bigint); return; }
    if (e.regex) { this.raw(`/${e.regex.pattern}/${e.regex.flags}`); return; }
    if (e.value === null) { this.raw('null'); return; }
    this.raw(typeof e.value === 'string' ? JSON.stringify(e.value) : String(e.value));
  }

  private template(e: import('@superjs/ir').IrTemplate): void {
    this.raw('`');
    e.quasis.forEach((q, i) => {
      this.raw(q.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${'));
      if (i < e.expressions.length) { this.raw('${'); this.expr(e.expressions[i]!, 0); this.raw('}'); }
    });
    this.raw('`');
  }

  private array(e: import('@superjs/ir').IrArray): void {
    this.raw('[');
    e.elements.forEach((el, i) => {
      if (i > 0) this.raw(', ');
      if (el === null) this.raw('');
      else this.expr(el as IrExpression, 2);
    });
    this.raw(']');
  }

  private object(e: import('@superjs/ir').IrObject): void {
    if (e.properties.length === 0) { this.raw('{}'); return; }
    this.raw('{ ');
    e.properties.forEach((p, i) => {
      if (i > 0) this.raw(', ');
      if (p.type === 'SpreadElement') { this.raw('...'); this.expr(p.argument, 2); return; }
      this.objectProp(p);
    });
    this.raw(' }');
  }

  private objectProp(p: IrProperty): void {
    if (p.method && p.value.type === 'FunctionExpression') {
      if (p.value.async) this.raw('async ');
      if (p.value.generator) this.raw('*');
      this.propKey(p.key, p.computed); this.raw('('); this.params(p.value.params); this.raw(') '); this.block(p.value.body);
      return;
    }
    if (p.kind === 'get' || p.kind === 'set') {
      const fn = p.value as import('@superjs/ir').IrFunctionExpression;
      this.raw(`${p.kind} `); this.propKey(p.key, p.computed); this.raw('('); this.params(fn.params); this.raw(') '); this.block(fn.body);
      return;
    }
    if (p.shorthand) { this.propKey(p.key, false); return; }
    this.propKey(p.key, p.computed); this.raw(': '); this.expr(p.value, 2);
  }

  private arrow(e: import('@superjs/ir').IrArrow): void {
    if (e.async) this.raw('async ');
    this.raw('('); this.params(e.params); this.raw(') => ');
    if (e.body.type === 'BlockStatement') this.block(e.body);
    else {
      // Parenthesise an object-literal arrow body.
      const obj = e.body.type === 'ObjectExpression';
      if (obj) this.raw('('); this.expr(e.body, 2); if (obj) this.raw(')');
    }
  }

  private functionExpr(e: import('@superjs/ir').IrFunctionExpression): void {
    this.raw(`${e.async ? 'async ' : ''}function${e.generator ? '*' : ''}${e.id ? ' ' + e.id : ''}(`);
    this.params(e.params); this.raw(') '); this.block(e.body);
  }

  private args(list: readonly (IrExpression | IrSpread)[]): void {
    list.forEach((a, i) => { if (i > 0) this.raw(', '); this.expr(a as IrExpression, 2); });
  }
}
