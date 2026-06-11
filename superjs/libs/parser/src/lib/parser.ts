/**
 * SJS parser — token stream → AST.
 *
 * Recursive-descent for statements/declarations/types; Pratt (precedence
 * climbing) for binary/logical expressions. Panic-mode recovery at statement
 * boundaries (Cursor.synchronize); errors are SJS-P001…P099.
 */

import type {
  ArrowFunction, AssignmentOperator, BinaryOperator, BlockStatement, CatchClause,
  ClassMember, Expression, Identifier, InterfaceMember, LogicalOperator, MatchArm,
  MatchPattern, Node, Parameter, Pattern, Program, PropertyDef, VariableDecl,
  VariableDeclarator, FunctionDecl, ClassDecl, TypeRefNode, PropertyKey, ImportSpecifier,
  ExportSpecifier, SpreadElement, ObjectMethod, ObjectPatternProperty, RestElement,
  VariantField, RecordPatternField, PrimitiveTypeName,
  JsxExpressionContainer, JsxElement,
  Statement, StringLiteral, SumTypeDef, SwitchCase, TypeNode, TypeParam, VariantDef,
  VariableKind, AccessModifier, JsxChild, JsxAttribute, JsxSpreadAttribute,
  JsxElementName, Position, Span, ObjectTypeNode, FunctionTypeNode,
} from '@superjs/types';
import { tokenize } from '@superjs/lexer';
import type { Diagnostic, Token, TokenKind } from '@superjs/types';
import { Codes } from '@superjs/diagnostics';
import { Cursor, ParseError } from './cursor.js';

export interface ParseOptions {
  readonly file?: string;
  readonly strict?: boolean;
}

export interface ParseResult {
  readonly program: Program;
  readonly diagnostics: readonly Diagnostic[];
}

export function parse(source: string, options: ParseOptions = {}): ParseResult {
  const { tokens, diagnostics: lexDiags } = tokenize(source, options);
  const parser = new Parser(tokens, options);
  const program = parser.parseProgram();
  return { program, diagnostics: [...lexDiags, ...parser.diagnostics] };
}

/** Binary operator precedence (higher binds tighter). `**` is right-assoc. */
const BINARY_PREC: Partial<Record<TokenKind, number>> = {
  '??': 1, '||': 2, '&&': 3, '|': 4, '^': 5, '&': 6,
  '===': 7, '!==': 7, '==': 7, '!=': 7,
  '<': 8, '>': 8, '<=': 8, '>=': 8, instanceof: 8, in: 8,
  '<<': 9, '>>': 9, '>>>': 9,
  '+': 10, '-': 10,
  '*': 11, '/': 11, '%': 11,
  '**': 12,
};
const LOGICAL = new Set<TokenKind>(['&&', '||', '??']);
const ASSIGN_OPS = new Set<TokenKind>([
  '=', '+=', '-=', '*=', '/=', '%=', '**=', '&&=', '||=', '??=',
  '&=', '|=', '^=', '<<=', '>>=', '>>>=',
]);
const PRIMITIVE_TYPES = new Set<string>([
  'number', 'string', 'boolean', 'bigint', 'symbol', 'void', 'null', 'never',
  'dynamic', 'unknown', 'object', 'undefined',
]);

class Parser {
  private readonly c: Cursor;

  constructor(tokens: readonly Token[], opts: ParseOptions) {
    this.c = new Cursor(tokens, opts);
  }

  get diagnostics(): readonly Diagnostic[] {
    return this.c.diagnostics;
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  private pos(): Position {
    return this.c.position;
  }
  private fin<const T extends object>(start: Position, node: T): T & { span: Span } {
    return { ...node, span: this.c.spanFrom(start) };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PROGRAM / STATEMENTS
  // ════════════════════════════════════════════════════════════════════════════
  parseProgram(): Program {
    const start = this.pos();
    const body: Statement[] = [];
    while (!this.c.atEnd && !this.c.isAbandoned) {
      const stmt = this.parseStatementSafe();
      if (stmt) body.push(stmt);
    }
    return this.fin(start, { kind: 'Program', body });
  }

  private parseStatementSafe(): Statement | undefined {
    try {
      return this.parseStatement();
    } catch (e) {
      if (e instanceof ParseError) {
        this.c.synchronize();
        return undefined;
      }
      throw e;
    }
  }

  private parseStatement(): Statement {
    const t = this.c.current;
    switch (t.kind) {
      case 'const': case 'let': case 'var': return this.parseVariableDecl();
      case 'function': return this.parseFunctionDecl(false);
      case 'class': return this.parseClassDecl(false);
      case 'abstract': return this.parseClassDecl(false);
      case 'interface': return this.parseInterfaceDecl();
      case 'return': return this.parseReturn();
      case 'if': return this.parseIf();
      case 'while': return this.parseWhile();
      case 'do': return this.parseDoWhile();
      case 'for': return this.parseFor();
      case 'switch': return this.parseSwitch();
      case 'break': return this.parseBreakContinue('BreakStatement');
      case 'continue': return this.parseBreakContinue('ContinueStatement');
      case 'throw': return this.parseThrow();
      case 'try': return this.parseTry();
      case 'import': return this.parseImport();
      case 'export': return this.parseExport();
      case '{': return this.parseBlock();
      case ';': { const s = this.pos(); this.c.advance(); return this.fin(s, { kind: 'EmptyStatement' }); }
      case 'debugger': { const s = this.pos(); this.c.advance(); this.c.consumeSemicolon(); return this.fin(s, { kind: 'DebuggerStatement' }); }
      case 'async':
        if (this.c.peek(1).kind === 'function') return this.parseFunctionDecl(false);
        break;
      case 'type':
        if (this.c.peek(1).kind === 'identifier') return this.parseTypeDecl();
        break;
      case 'identifier':
        if (this.c.peek(1).kind === ':') return this.parseLabeled();
        break;
    }
    return this.parseExpressionStatement();
  }

  private parseBlock(): BlockStatement {
    const start = this.pos();
    this.c.expect('{');
    const body: Statement[] = [];
    while (!this.c.is('}') && !this.c.atEnd && !this.c.isAbandoned) {
      const s = this.parseStatementSafe();
      if (s) body.push(s);
    }
    this.c.expect('}');
    return this.fin(start, { kind: 'BlockStatement', body });
  }

  private parseVariableDecl(): Statement {
    const start = this.pos();
    const declKind = this.c.advance().kind as VariableKind;
    const declarators = [this.parseDeclarator()];
    while (this.c.eat(',')) declarators.push(this.parseDeclarator());
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'VariableDecl', declKind, declarators });
  }

  private parseDeclarator(): VariableDeclarator {
    const start = this.pos();
    const id = this.parseBindingPattern();
    const typeAnnotation = this.c.eat(':') ? this.parseType() : undefined;
    const init = this.c.eat('=') ? this.parseAssignment() : undefined;
    return this.fin(start, { kind: 'VariableDeclarator', id, ...(typeAnnotation ? { typeAnnotation } : {}), ...(init ? { init } : {}) });
  }

  private parseReturn(): Statement {
    const start = this.pos();
    this.c.advance();
    const argument =
      this.c.is(';') || this.c.is('}') || this.c.atEnd || this.c.current.precededByLineBreak
        ? undefined : this.parseExpression();
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'ReturnStatement', ...(argument ? { argument } : {}) });
  }

  private parseThrow(): Statement {
    const start = this.pos();
    this.c.advance();
    const argument = this.parseExpression();
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'ThrowStatement', argument });
  }

  private parseIf(): Statement {
    const start = this.pos();
    this.c.advance();
    this.c.expect('(');
    const test = this.parseExpression();
    this.c.expect(')');
    const consequent = this.parseStatement();
    const alternate = this.c.eat('else') ? this.parseStatement() : undefined;
    return this.fin(start, { kind: 'IfStatement', test, consequent, ...(alternate ? { alternate } : {}) });
  }

  private parseWhile(): Statement {
    const start = this.pos();
    this.c.advance();
    this.c.expect('(');
    const test = this.parseExpression();
    this.c.expect(')');
    const body = this.parseStatement();
    return this.fin(start, { kind: 'WhileStatement', test, body });
  }

  private parseDoWhile(): Statement {
    const start = this.pos();
    this.c.advance();
    const body = this.parseStatement();
    this.c.expect('while');
    this.c.expect('(');
    const test = this.parseExpression();
    this.c.expect(')');
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'DoWhileStatement', body, test });
  }

  private parseFor(): Statement {
    const start = this.pos();
    this.c.advance();
    const isAwait = this.c.eat('await');
    this.c.expect('(');

    // Detect for-of / for-in: `for (kind binding of|in expr)`
    if (this.c.isAny('const', 'let', 'var')) {
      const mark = this.c.mark();
      const declKind = this.c.advance().kind as VariableKind;
      const left = this.parseBindingPattern();
      const typeAnnotation = this.c.eat(':') ? this.parseType() : undefined;
      if (this.c.is('of')) {
        this.c.advance();
        const right = this.parseAssignment();
        this.c.expect(')');
        const body = this.parseStatement();
        return this.fin(start, { kind: 'ForOfStatement', await: isAwait, declKind, left, ...(typeAnnotation ? { typeAnnotation } : {}), right, body });
      }
      if (this.c.is('in') && left.kind === 'Identifier') {
        this.c.advance();
        const right = this.parseExpression();
        this.c.expect(')');
        const body = this.parseStatement();
        return this.fin(start, { kind: 'ForInStatement', declKind, left, right, body });
      }
      this.c.reset(mark);
    }

    // Classic for(init; test; update)
    let init: VariableDecl | Expression | undefined;
    if (!this.c.is(';')) {
      init = this.c.isAny('const', 'let', 'var') ? this.parseVariableDeclNoSemi() : this.parseExpression();
    }
    this.c.expect(';');
    const test = this.c.is(';') ? undefined : this.parseExpression();
    this.c.expect(';');
    const update = this.c.is(')') ? undefined : this.parseExpression();
    this.c.expect(')');
    const body = this.parseStatement();
    return this.fin(start, { kind: 'ForStatement', ...(init ? { init } : {}), ...(test ? { test } : {}), ...(update ? { update } : {}), body });
  }

  private parseVariableDeclNoSemi(): VariableDecl {
    const start = this.pos();
    const declKind = this.c.advance().kind as VariableKind;
    const declarators = [this.parseDeclarator()];
    while (this.c.eat(',')) declarators.push(this.parseDeclarator());
    return this.fin(start, { kind: 'VariableDecl', declKind, declarators });
  }

  private parseSwitch(): Statement {
    const start = this.pos();
    this.c.advance();
    this.c.expect('(');
    const discriminant = this.parseExpression();
    this.c.expect(')');
    this.c.expect('{');
    const cases: SwitchCase[] = [];
    while (!this.c.is('}') && !this.c.atEnd) {
      const cs = this.pos();
      let test: Expression | undefined;
      if (this.c.eat('case')) test = this.parseExpression();
      else this.c.expect('default');
      this.c.expect(':');
      const body: Statement[] = [];
      while (!this.c.isAny('case', 'default', '}') && !this.c.atEnd) {
        const s = this.parseStatementSafe();
        if (s) body.push(s);
      }
      cases.push(this.fin(cs, { kind: 'SwitchCase', ...(test ? { test } : {}), body }));
    }
    this.c.expect('}');
    return this.fin(start, { kind: 'SwitchStatement', discriminant, cases });
  }

  private parseBreakContinue(kind: 'BreakStatement' | 'ContinueStatement'): Statement {
    const start = this.pos();
    this.c.advance();
    const label = this.c.is('identifier') && !this.c.current.precededByLineBreak
      ? this.parseIdentifier() : undefined;
    this.c.consumeSemicolon();
    return this.fin(start, { kind, ...(label ? { label } : {}) });
  }

  private parseLabeled(): Statement {
    const start = this.pos();
    const label = this.parseIdentifier();
    this.c.expect(':');
    const body = this.parseStatement();
    return this.fin(start, { kind: 'LabeledStatement', label, body });
  }

  private parseTry(): Statement {
    const start = this.pos();
    this.c.advance();
    const block = this.parseBlock();
    let handler: CatchClause | undefined;
    if (this.c.eat('catch')) {
      const hs = this.pos();
      let param: Identifier | undefined;
      let paramType: TypeNode | undefined;
      if (this.c.eat('(')) {
        param = this.parseIdentifier();
        if (this.c.eat(':')) paramType = this.parseType();
        this.c.expect(')');
      }
      const body = this.parseBlock();
      handler = this.fin(hs, { kind: 'CatchClause', ...(param ? { param } : {}), ...(paramType ? { paramType } : {}), body });
    }
    const finalizer = this.c.eat('finally') ? this.parseBlock() : undefined;
    return this.fin(start, { kind: 'TryStatement', block, ...(handler ? { handler } : {}), ...(finalizer ? { finalizer } : {}) });
  }

  private parseExpressionStatement(): Statement {
    const start = this.pos();
    const expression = this.parseExpression();
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'ExpressionStatement', expression });
  }

  // ── functions / classes / interfaces / types ───────────────────────────────
  private parseFunctionDecl(isExpr: boolean): FunctionDecl {
    const start = this.pos();
    const async = this.c.eat('async');
    this.c.expect('function');
    const generator = this.c.eat('*');
    const id = this.parseIdentifier();
    const typeParams = this.parseTypeParamsOpt();
    const params = this.parseParams();
    const returnType = this.c.eat(':') ? this.parseType() : undefined;
    const body = this.parseBlock();
    void isExpr;
    return this.fin(start, { kind: 'FunctionDecl', id, async, generator, ...(typeParams ? { typeParams } : {}), params, ...(returnType ? { returnType } : {}), body });
  }

  private parseClassDecl(isExpr: boolean): ClassDecl {
    const start = this.pos();
    const abstract = this.c.eat('abstract');
    this.c.expect('class');
    const id = this.parseIdentifier();
    const typeParams = this.parseTypeParamsOpt();
    const superClass = this.c.eat('extends') ? this.parseTypeRef() : undefined;
    const members = this.parseClassBody();
    void isExpr;
    return this.fin(start, { kind: 'ClassDecl', id, abstract, ...(typeParams ? { typeParams } : {}), ...(superClass ? { superClass } : {}), members });
  }

  private parseClassBody(): ClassMember[] {
    this.c.expect('{');
    const members: ClassMember[] = [];
    while (!this.c.is('}') && !this.c.atEnd && !this.c.isAbandoned) {
      if (this.c.eat(';')) continue;
      const m = this.parseClassMemberSafe();
      if (m) members.push(m);
    }
    this.c.expect('}');
    return members;
  }

  private parseClassMemberSafe(): ClassMember | undefined {
    try {
      return this.parseClassMember();
    } catch (e) {
      if (e instanceof ParseError) {
        while (!this.c.isAny('}', ';') && !this.c.atEnd && !this.c.current.precededByLineBreak) this.c.advance();
        return undefined;
      }
      throw e;
    }
  }

  private parseClassMember(): ClassMember {
    const start = this.pos();
    const accessModifier = this.accessModifierHere();
    if (accessModifier) this.c.advance();
    const isStatic = this.eatModifier('static');
    const isAbstract = this.eatModifier('abstract');
    const isReadonly = this.eatModifier('readonly');
    const isAsync = this.eatModifier('async');
    const generator = this.c.eat('*');

    let accessor: 'get' | 'set' | undefined;
    if ((this.c.is('get') || this.c.is('set')) && !this.isMemberTerminator(this.c.peek(1).kind)) {
      accessor = this.c.advance().kind as 'get' | 'set';
    }

    if (this.c.current.kind === 'identifier' && this.c.current.value === 'constructor' && this.c.peek(1).kind === '(') {
      this.c.advance();
      const params = this.parseParams();
      const body = this.parseBlock();
      return this.fin(start, { kind: 'ClassConstructor', ...(accessModifier ? { accessModifier } : {}), params, body });
    }

    const name = this.parsePropertyKey();

    if (this.c.is('(') || this.c.is('<')) {
      const typeParams = this.parseTypeParamsOpt();
      const params = this.parseParams();
      const returnType = this.c.eat(':') ? this.parseType() : undefined;
      const body = this.c.is('{') ? this.parseBlock() : undefined;
      if (!body) this.c.consumeSemicolon();
      return this.fin(start, { kind: 'ClassMethod', ...(accessModifier ? { accessModifier } : {}), static: isStatic, abstract: isAbstract, async: isAsync, generator, ...(accessor ? { accessor } : {}), name, ...(typeParams ? { typeParams } : {}), params, ...(returnType ? { returnType } : {}), ...(body ? { body } : {}) });
    }

    const optional = this.c.eat('?');
    const typeAnnotation = this.c.eat(':') ? this.parseType() : undefined;
    const value = this.c.eat('=') ? this.parseAssignment() : undefined;
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'ClassProperty', ...(accessModifier ? { accessModifier } : {}), static: isStatic, readonly: isReadonly, abstract: isAbstract, name, optional, ...(typeAnnotation ? { typeAnnotation } : {}), ...(value ? { value } : {}) });
  }

  private isMemberTerminator(k: TokenKind): boolean {
    return k === '(' || k === ':' || k === '=' || k === ';' || k === '?' || k === '<' || k === '}';
  }

  /** public/private/protected lex as identifiers (not keywords) — match by value. */
  private accessModifierHere(): AccessModifier | undefined {
    const t = this.c.current;
    if (t.kind === 'identifier' && (t.value === 'public' || t.value === 'private' || t.value === 'protected')) {
      return t.value as AccessModifier;
    }
    return undefined;
  }

  private eatModifier(kw: TokenKind): boolean {
    // A modifier keyword followed by a member terminator is actually the member name.
    if (this.c.is(kw) && !this.isMemberTerminator(this.c.peek(1).kind)) {
      this.c.advance();
      return true;
    }
    return false;
  }

  private parseInterfaceDecl(): Statement {
    const start = this.pos();
    this.c.advance();
    const id = this.parseIdentifier();
    const typeParams = this.parseTypeParamsOpt();
    const ext: ReturnType<Parser['parseTypeRef']>[] = [];
    if (this.c.eat('extends')) {
      ext.push(this.parseTypeRef());
      while (this.c.eat(',')) ext.push(this.parseTypeRef());
    }
    this.c.expect('{');
    const members: InterfaceMember[] = [];
    while (!this.c.is('}') && !this.c.atEnd && !this.c.isAbandoned) {
      if (this.c.eat(';')) continue;
      members.push(this.parseInterfaceMember());
    }
    this.c.expect('}');
    return this.fin(start, { kind: 'InterfaceDecl', id, ...(typeParams ? { typeParams } : {}), extends: ext, members });
  }

  private parseInterfaceMember(): InterfaceMember {
    const start = this.pos();
    const readonly = this.eatModifier('readonly');
    const name = this.parsePropertyKey();
    if (this.c.is('(') || this.c.is('<')) {
      const typeParams = this.parseTypeParamsOpt();
      const params = this.parseParams();
      this.c.expect(':');
      const returnType = this.parseType();
      this.c.consumeSemicolon();
      return this.fin(start, { kind: 'InterfaceMethod', name, ...(typeParams ? { typeParams } : {}), params, returnType });
    }
    const optional = this.c.eat('?');
    this.c.expect(':');
    const type = this.parseType();
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'InterfaceProperty', readonly, name, optional, type });
  }

  private parseTypeDecl(): Statement {
    const start = this.pos();
    this.c.advance(); // type
    const id = this.parseIdentifier();
    const typeParams = this.parseTypeParamsOpt();
    this.c.expect('=');
    const value = this.parseTypeDeclValue();
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'TypeDecl', id, ...(typeParams ? { typeParams } : {}), value });
  }

  /** RHS of a `type` decl: a sum-type definition or a plain type alias. */
  private parseTypeDeclValue(): SumTypeDef | TypeNode {
    const mark = this.c.mark();
    const start = this.pos();
    // Optional leading `|` for multi-line sum/union declarations.
    const leadingPipe = this.c.eat('|');
    // Sum type heuristic: a variant-named `Ident` or `Ident(` then a `|`, or a
    // leading-pipe alternation. A primitive-named member (`number | null`) is a
    // union of types, not a variant list, so exclude those.
    if (this.c.is('identifier') && !PRIMITIVE_TYPES.has(this.c.current.value)
        && (this.c.peek(1).kind === '(' || this.c.peek(1).kind === '|' || leadingPipe)) {
      const variants: VariantDef[] = [this.parseVariant()];
      if (this.c.is('|')) {
        while (this.c.eat('|')) variants.push(this.parseVariant());
        return this.fin(start, { kind: 'SumTypeDef', variants });
      }
      // Single `Ident(...)` with no `|` → treat as sum type with one variant.
      if (variants[0] && variants[0].form !== 'unit') {
        return this.fin(start, { kind: 'SumTypeDef', variants });
      }
    }
    // Not variant-shaped — rewind (including any leading pipe) and let
    // `parseType` handle it; it accepts a leading `|` for union aliases.
    this.c.reset(mark);
    return this.parseType();
  }

  private parseVariant(): VariantDef {
    const start = this.pos();
    const name = this.parseIdentifier();
    if (this.c.eat('(')) {
      if (this.c.eat('{')) {
        const fields: VariantField[] = [];
        while (!this.c.is('}') && !this.c.atEnd) {
          const fs = this.pos();
          const fname = this.parseIdentifier();
          const optional = this.c.eat('?');
          this.c.expect(':');
          const type = this.parseType();
          fields.push(this.fin(fs, { kind: 'VariantField', name: fname, optional, type }));
          if (!this.c.eat(',')) break;
        }
        this.c.expect('}');
        this.c.expect(')');
        return this.fin(start, { kind: 'VariantDef', name, form: 'record', fields: fields as VariantDef['fields'] });
      }
      const tupleType = this.parseType();
      this.c.expect(')');
      return this.fin(start, { kind: 'VariantDef', name, form: 'tuple', tupleType });
    }
    return this.fin(start, { kind: 'VariantDef', name, form: 'unit' });
  }

  // ── imports / exports ───────────────────────────────────────────────────────
  private parseImport(): Statement {
    const start = this.pos();
    this.c.advance();
    if (this.c.is('string')) {
      const source = this.parseStringLiteral();
      this.c.consumeSemicolon();
      return this.fin(start, { kind: 'ImportDecl', typeOnly: false, named: [], source });
    }
    const typeOnly = this.c.is('type') && this.c.peek(1).kind !== 'from' ? (this.c.advance(), true) : false;
    let defaultImport: Identifier | undefined;
    let namespaceImport: Identifier | undefined;
    const named: ImportSpecifier[] = [];
    if (this.c.is('identifier')) {
      defaultImport = this.parseIdentifier();
      this.c.eat(',');
    }
    if (this.c.eat('*')) {
      this.c.expect('as');
      namespaceImport = this.parseIdentifier();
    } else if (this.c.is('{')) {
      this.c.advance();
      while (!this.c.is('}') && !this.c.atEnd) {
        const ss = this.pos();
        const imported = this.parseIdentifier();
        const local = this.c.eat('as') ? this.parseIdentifier() : imported;
        named.push(this.fin(ss, { kind: 'ImportSpecifier', imported, local }));
        if (!this.c.eat(',')) break;
      }
      this.c.expect('}');
    }
    this.c.expect('from');
    const source = this.parseStringLiteral();
    this.c.consumeSemicolon();
    return this.fin(start, { kind: 'ImportDecl', typeOnly, ...(defaultImport ? { defaultImport } : {}), ...(namespaceImport ? { namespaceImport } : {}), named, source });
  }

  private parseExport(): Statement {
    const start = this.pos();
    this.c.advance();
    if (this.c.eat('default')) {
      const declaration = this.c.isAny('function', 'class', 'async')
        ? (this.c.is('class') ? this.parseClassDecl(false) : this.parseFunctionDecl(false))
        : (() => { const e = this.parseAssignment(); this.c.consumeSemicolon(); return e; })();
      return this.fin(start, { kind: 'ExportDefaultDecl', declaration });
    }
    if (this.c.eat('*')) {
      const exported = this.c.eat('as') ? this.parseIdentifier() : undefined;
      this.c.expect('from');
      const source = this.parseStringLiteral();
      this.c.consumeSemicolon();
      return this.fin(start, { kind: 'ExportAllDecl', ...(exported ? { exported } : {}), source });
    }
    const typeOnly = this.c.is('type') && this.c.peek(1).kind === '{' ? (this.c.advance(), true) : false;
    if (this.c.is('{')) {
      this.c.advance();
      const specifiers: ExportSpecifier[] = [];
      while (!this.c.is('}') && !this.c.atEnd) {
        const ss = this.pos();
        const local = this.parseIdentifier();
        const exported = this.c.eat('as') ? this.parseIdentifier() : local;
        specifiers.push(this.fin(ss, { kind: 'ExportSpecifier', local, exported }));
        if (!this.c.eat(',')) break;
      }
      this.c.expect('}');
      const source = this.c.eat('from') ? this.parseStringLiteral() : undefined;
      this.c.consumeSemicolon();
      return this.fin(start, { kind: 'ExportNamedDecl', typeOnly, specifiers, ...(source ? { source } : {}) });
    }
    const declaration = this.parseStatement();
    return this.fin(start, { kind: 'ExportNamedDecl', typeOnly: false, declaration, specifiers: [] });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXPRESSIONS (Pratt)
  // ════════════════════════════════════════════════════════════════════════════
  private parseExpression(): Expression {
    const start = this.pos();
    let expr = this.parseAssignment();
    if (this.c.is(',')) {
      const expressions = [expr];
      while (this.c.eat(',')) expressions.push(this.parseAssignment());
      expr = this.fin(start, { kind: 'SequenceExpression', expressions });
    }
    return expr;
  }

  private parseAssignment(): Expression {
    const arrow = this.tryParseArrow();
    if (arrow) return arrow;

    const start = this.pos();
    if (this.c.is('yield')) return this.parseYield();
    const left = this.parseConditional();
    if (ASSIGN_OPS.has(this.c.current.kind)) {
      const operator = this.c.advance().kind as AssignmentOperator;
      const right = this.parseAssignment();
      return this.fin(start, { kind: 'AssignmentExpression', operator, left, right });
    }
    return left;
  }

  private parseYield(): Expression {
    const start = this.pos();
    this.c.advance();
    const delegate = this.c.eat('*');
    const argument =
      this.c.isAny(')', ']', '}', ',', ';', 'eof') || this.c.current.precededByLineBreak
        ? undefined : this.parseAssignment();
    return this.fin(start, { kind: 'YieldExpression', delegate, ...(argument ? { argument } : {}) });
  }

  private parseConditional(): Expression {
    const start = this.pos();
    const test = this.parseBinary(0);
    if (this.c.eat('?')) {
      const consequent = this.parseAssignment();
      this.c.expect(':');
      const alternate = this.parseAssignment();
      return this.fin(start, { kind: 'ConditionalExpression', test, consequent, alternate });
    }
    return test;
  }

  private parseBinary(minPrec: number): Expression {
    let left = this.parseUnary();
    for (;;) {
      const op = this.c.current.kind;
      const prec = BINARY_PREC[op];
      if (prec === undefined || prec < minPrec) break;
      const start = left.span.start;
      this.c.advance();
      const nextMin = op === '**' ? prec : prec + 1; // ** right-assoc
      const right = this.parseBinary(nextMin);
      left = LOGICAL.has(op)
        ? this.fin(start, { kind: 'LogicalExpression', operator: op as LogicalOperator, left, right })
        : this.fin(start, { kind: 'BinaryExpression', operator: op as BinaryOperator, left, right });
    }
    return left;
  }

  private parseUnary(): Expression {
    const start = this.pos();
    const k = this.c.current.kind;
    if (k === 'typeof' || k === 'void' || k === 'delete' || k === '!' || k === '~' || k === '+' || k === '-') {
      this.c.advance();
      const argument = this.parseUnary();
      return this.fin(start, { kind: 'UnaryExpression', operator: k, argument });
    }
    if (k === 'await') {
      this.c.advance();
      const argument = this.parseUnary();
      return this.fin(start, { kind: 'AwaitExpression', argument });
    }
    if (k === '++' || k === '--') {
      this.c.advance();
      const argument = this.parseUnary();
      return this.fin(start, { kind: 'UpdateExpression', operator: k, prefix: true, argument });
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parseCallMember();
    if ((this.c.is('++') || this.c.is('--')) && !this.c.current.precededByLineBreak) {
      const op = this.c.advance().kind as '++' | '--';
      expr = this.fin(expr.span.start, { kind: 'UpdateExpression', operator: op, prefix: false, argument: expr });
    }
    return expr;
  }

  private parseCallMember(): Expression {
    let expr = this.c.is('new') ? this.parseNew() : this.parsePrimary();
    for (;;) {
      const start = expr.span.start;
      if (this.c.eat('.')) {
        const property = this.parseIdentifier();
        expr = this.fin(start, { kind: 'MemberExpression', object: expr, computed: false, property, optional: false });
      } else if (this.c.eat('?.')) {
        if (this.c.is('(')) {
          const args = this.parseArguments();
          expr = this.fin(start, { kind: 'CallExpression', callee: expr, args, optional: true });
        } else if (this.c.eat('[')) {
          const property = this.parseExpression();
          this.c.expect(']');
          expr = this.fin(start, { kind: 'MemberExpression', object: expr, computed: true, property, optional: true });
        } else {
          const property = this.parseIdentifier();
          expr = this.fin(start, { kind: 'MemberExpression', object: expr, computed: false, property, optional: true });
        }
      } else if (this.c.eat('[')) {
        const property = this.parseExpression();
        this.c.expect(']');
        expr = this.fin(start, { kind: 'MemberExpression', object: expr, computed: true, property, optional: false });
      } else if (this.c.is('(')) {
        const args = this.parseArguments();
        expr = this.fin(start, { kind: 'CallExpression', callee: expr, args, optional: false });
      } else if (this.c.is('<')) {
        // Possibly a generic call `f<T>(...)`. Speculate; on failure, leave `<`
        // for the binary (less-than) parser.
        const typeArgs = this.tryCallTypeArgs();
        if (!typeArgs) break;
        const args = this.parseArguments();
        expr = this.fin(start, { kind: 'CallExpression', callee: expr, typeArgs, args, optional: false });
      } else if (this.c.is('as')) {
        this.c.advance();
        const type = this.parseType();
        expr = this.fin(start, { kind: 'TypeAssertion', expression: expr, type });
      } else {
        break;
      }
    }
    return expr;
  }

  private parseNew(): Expression {
    const start = this.pos();
    this.c.advance();
    const callee = this.parseCallMemberNoCall();
    const typeArgs = this.c.is('<') ? this.tryCallTypeArgs() : null;
    const args = this.c.is('(') ? this.parseArguments() : [];
    return this.fin(start, { kind: 'NewExpression', callee, ...(typeArgs ? { typeArgs } : {}), args });
  }

  /**
   * Speculatively parse a generic call's `<TypeArguments>` — only commits when
   * the list closes and is immediately followed by `(`, disambiguating
   * `f<T>(x)` from the comparison `f < T > (x)`. Restores the cursor (and rolls
   * back any diagnostics) on failure.
   */
  private tryCallTypeArgs(): TypeNode[] | null {
    if (!this.c.is('<')) return null;
    const snap = this.c.snapshot();
    try {
      const typeArgs = this.parseTypeArgsOpt();
      if (typeArgs && this.c.is('(')) return typeArgs;
    } catch {
      // not a type-argument list — fall through to restore
    }
    this.c.restore(snap);
    return null;
  }

  /** Member chain without trailing call (so `new A.B()` binds the call to new). */
  private parseCallMemberNoCall(): Expression {
    let expr = this.parsePrimary();
    for (;;) {
      const start = expr.span.start;
      if (this.c.eat('.')) {
        const property = this.parseIdentifier();
        expr = this.fin(start, { kind: 'MemberExpression', object: expr, computed: false, property, optional: false });
      } else if (this.c.eat('[')) {
        const property = this.parseExpression();
        this.c.expect(']');
        expr = this.fin(start, { kind: 'MemberExpression', object: expr, computed: true, property, optional: false });
      } else break;
    }
    return expr;
  }

  private parseArguments(): Expression[] {
    this.c.expect('(');
    const args: Expression[] = [];
    while (!this.c.is(')') && !this.c.atEnd) {
      if (this.c.is('...')) {
        const s = this.pos();
        this.c.advance();
        args.push(this.fin(s, { kind: 'SpreadElement', argument: this.parseAssignment() }));
      } else {
        args.push(this.parseAssignment());
      }
      if (!this.c.eat(',')) break;
    }
    this.c.expect(')');
    return args;
  }

  private parsePrimary(): Expression {
    const start = this.pos();
    const t = this.c.current;
    switch (t.kind) {
      case 'number': this.c.advance(); return this.fin(start, { kind: 'NumberLiteral', value: Number(t.value.replace(/_/g, '')), raw: t.value });
      case 'bigint': this.c.advance(); return this.fin(start, { kind: 'BigIntLiteral', value: BigInt(t.value.replace(/_/g, '').replace(/n$/, '')), raw: t.value });
      case 'string': return this.parseStringLiteral();
      case 'regex': { this.c.advance(); const m = /^\/(.*)\/([a-z]*)$/s.exec(t.value); return this.fin(start, { kind: 'RegexLiteral', pattern: m?.[1] ?? '', flags: m?.[2] ?? '' }); }
      case 'true': this.c.advance(); return this.fin(start, { kind: 'BooleanLiteral', value: true });
      case 'false': this.c.advance(); return this.fin(start, { kind: 'BooleanLiteral', value: false });
      case 'null': this.c.advance(); return this.fin(start, { kind: 'NullLiteral' });
      case 'undefined': this.c.advance(); return this.fin(start, { kind: 'UndefinedLiteral' });
      case 'this': this.c.advance(); return this.fin(start, { kind: 'ThisExpression' });
      case 'super': this.c.advance(); return this.fin(start, { kind: 'SuperExpression' });
      case 'identifier': return this.parseIdentifier();
      case 'match': return this.parseMatch();
      case 'template-full': case 'template-head': return this.parseTemplate();
      case '(': return this.parseParenOrArrowFallback();
      case '[': return this.parseArrayLiteral();
      case '{': return this.parseObjectLiteral();
      case 'function': return this.parseFunctionExpr();
      case 'class': return this.parseClassExpr();
      case 'async': return this.parseAsyncPrimary();
      case '<': return this.parseJsx();
      default:
        this.c.error(Codes['P001'], `Unexpected token '${t.kind}' in expression`);
        throw new ParseError();
    }
  }

  private parseAsyncPrimary(): Expression {
    if (this.c.peek(1).kind === 'function') return this.parseFunctionExpr();
    // `async x =>` / `async () =>` handled by tryParseArrow; fall back to identifier.
    return this.parseIdentifier();
  }

  private parseParenOrArrowFallback(): Expression {
    const start = this.pos();
    this.c.expect('(');
    const expr = this.parseExpression();
    this.c.expect(')');
    return this.fin(start, { kind: 'ParenthesizedExpression', expression: expr });
  }

  private parseArrayLiteral(): Expression {
    const start = this.pos();
    this.c.expect('[');
    const elements: (Expression | SpreadElement | null)[] = [];
    while (!this.c.is(']') && !this.c.atEnd) {
      if (this.c.is(',')) { elements.push(null); this.c.advance(); continue; }
      if (this.c.is('...')) {
        const s = this.pos();
        this.c.advance();
        elements.push(this.fin(s, { kind: 'SpreadElement', argument: this.parseAssignment() }));
      } else {
        elements.push(this.parseAssignment());
      }
      if (!this.c.eat(',')) break;
    }
    this.c.expect(']');
    return this.fin(start, { kind: 'ArrayLiteral', elements });
  }

  private parseObjectLiteral(): Expression {
    const start = this.pos();
    this.c.expect('{');
    const properties: (PropertyDef | SpreadElement | ObjectMethod)[] = [];
    while (!this.c.is('}') && !this.c.atEnd) {
      const ps = this.pos();
      if (this.c.is('...')) {
        this.c.advance();
        properties.push(this.fin(ps, { kind: 'SpreadElement', argument: this.parseAssignment() }));
      } else {
        const key = this.parsePropertyKey();
        if (this.c.is('(')) {
          const params = this.parseParams();
          const body = this.parseBlock();
          properties.push(this.fin(ps, { kind: 'ObjectMethod', key, async: false, generator: false, params, body }));
        } else if (this.c.eat(':')) {
          const value = this.parseAssignment();
          properties.push(this.fin(ps, { kind: 'PropertyDef', key, value, shorthand: false }));
        } else {
          properties.push(this.fin(ps, { kind: 'PropertyDef', key, value: key as unknown as Expression, shorthand: true }));
        }
      }
      if (!this.c.eat(',')) break;
    }
    this.c.expect('}');
    return this.fin(start, { kind: 'ObjectLiteral', properties });
  }

  private parseFunctionExpr(): Expression {
    const start = this.pos();
    const async = this.c.eat('async');
    this.c.expect('function');
    const generator = this.c.eat('*');
    const id = this.c.is('identifier') ? this.parseIdentifier() : undefined;
    const typeParams = this.parseTypeParamsOpt();
    const params = this.parseParams();
    const returnType = this.c.eat(':') ? this.parseType() : undefined;
    const body = this.parseBlock();
    return this.fin(start, { kind: 'FunctionExpression', ...(id ? { id } : {}), async, generator, ...(typeParams ? { typeParams } : {}), params, ...(returnType ? { returnType } : {}), body });
  }

  private parseClassExpr(): Expression {
    const start = this.pos();
    this.c.advance();
    const id = this.c.is('identifier') ? this.parseIdentifier() : undefined;
    const typeParams = this.parseTypeParamsOpt();
    const superClass = this.c.eat('extends') ? this.parseTypeRef() : undefined;
    const members = this.parseClassBody();
    return this.fin(start, { kind: 'ClassExpression', ...(id ? { id } : {}), ...(typeParams ? { typeParams } : {}), ...(superClass ? { superClass } : {}), members });
  }

  // ── match (SJS) ─────────────────────────────────────────────────────────────
  private parseMatch(): Expression {
    const start = this.pos();
    this.c.advance(); // match
    const subject = this.parseExpression();
    this.c.expect('{');
    const arms: MatchArm[] = [];
    while (!this.c.is('}') && !this.c.atEnd) {
      const as = this.pos();
      const pattern = this.parseMatchPattern();
      this.c.expect('=>');
      const body = this.c.is('{') ? this.parseBlock() : this.parseAssignment();
      arms.push(this.fin(as, { kind: 'MatchArm', pattern, body }));
      if (!this.c.eat(',')) break;
    }
    this.c.expect('}');
    return this.fin(start, { kind: 'MatchExpression', subject, arms });
  }

  private parseMatchPattern(): MatchPattern {
    const start = this.pos();
    if (this.c.is('default')) { this.c.advance(); return this.fin(start, { kind: 'DefaultPattern' }); }
    const variant = this.parseIdentifier();
    if (this.c.eat('(')) {
      if (this.c.eat('{')) {
        const fields: RecordPatternField[] = [];
        while (!this.c.is('}') && !this.c.atEnd) {
          const fs = this.pos();
          const field = this.parseIdentifier();
          const binding = this.c.eat(':') ? this.parseIdentifier() : undefined;
          fields.push(this.fin(fs, { kind: 'RecordPatternField', field, ...(binding ? { binding } : {}) }));
          if (!this.c.eat(',')) break;
        }
        this.c.expect('}');
        this.c.expect(')');
        return this.fin(start, { kind: 'RecordVariantPattern', variant, fields });
      }
      if (this.c.is(')')) { this.c.advance(); return this.fin(start, { kind: 'UnitVariantPattern', variant }); }
      const binding = this.parseIdentifier();
      this.c.expect(')');
      return this.fin(start, { kind: 'TupleVariantPattern', variant, binding });
    }
    return this.fin(start, { kind: 'UnitVariantPattern', variant });
  }

  // ── templates / literals ────────────────────────────────────────────────────
  private parseTemplate(): Expression {
    const start = this.pos();
    const quasis: string[] = [];
    const expressions: Expression[] = [];
    const first = this.c.advance();
    if (first.kind === 'template-full') {
      quasis.push(cookTemplate(first.value));
      return this.fin(start, { kind: 'TemplateLiteral', quasis, expressions });
    }
    quasis.push(cookTemplate(first.value));
    for (;;) {
      expressions.push(this.parseExpression());
      const t = this.c.current;
      if (t.kind === 'template-tail') { this.c.advance(); quasis.push(cookTemplate(t.value)); break; }
      if (t.kind === 'template-middle') { this.c.advance(); quasis.push(cookTemplate(t.value)); continue; }
      this.c.error(Codes['P001'], 'Malformed template literal');
      break;
    }
    return this.fin(start, { kind: 'TemplateLiteral', quasis, expressions });
  }

  private parseStringLiteral(): StringLiteral {
    const start = this.pos();
    const t = this.c.advance();
    return this.fin(start, { kind: 'StringLiteral', value: cookString(t.value), raw: t.value });
  }

  private parseIdentifier(): Identifier {
    const start = this.pos();
    if (!this.c.is('identifier') && !this.isContextualName(this.c.current.kind)) {
      this.c.error(Codes['P001'], `Expected identifier but found '${this.c.current.kind}'`);
      throw new ParseError();
    }
    const t = this.c.advance();
    return this.fin(start, { kind: 'Identifier', name: t.value });
  }

  /** Keywords usable as identifiers/property names in value position. */
  private isContextualName(k: TokenKind): boolean {
    return ['get', 'set', 'as', 'from', 'of', 'async', 'type', 'declare', 'object', 'readonly', 'dynamic'].includes(k);
  }

  private parsePropertyKey(): PropertyKey {
    const start = this.pos();
    if (this.c.is('[')) {
      this.c.advance();
      const expression = this.parseAssignment();
      this.c.expect(']');
      return this.fin(start, { kind: 'ComputedKey', expression });
    }
    if (this.c.is('string')) return this.parseStringLiteral();
    if (this.c.is('number')) { const t = this.c.advance(); return this.fin(start, { kind: 'NumberLiteral', value: Number(t.value), raw: t.value }); }
    return this.parseIdentifier();
  }

  // ── arrow detection (backtracking) ──────────────────────────────────────────
  private tryParseArrow(): ArrowFunction | undefined {
    const snap = this.c.snapshot();
    const start = this.pos();
    const async = this.c.is('async') && (this.c.peek(1).kind === '(' || this.c.peek(1).kind === 'identifier')
      ? (this.c.advance(), true) : false;

    // `ident =>`
    if (this.c.is('identifier') && this.c.peek(1).kind === '=>') {
      const param = this.simpleParam();
      this.c.expect('=>');
      return this.finishArrow(start, async, [param], undefined);
    }
    // `( ... ) [: Type] =>`
    if (this.c.is('(')) {
      try {
        const params = this.parseParams();
        const returnType = this.c.eat(':') ? this.parseType() : undefined;
        if (this.c.is('=>')) {
          this.c.advance();
          return this.finishArrow(start, async, params, returnType);
        }
      } catch {
        // fall through to backtrack
      }
    }
    this.c.restore(snap);
    return undefined;
  }

  private finishArrow(start: Position, async: boolean, params: Parameter[], returnType: TypeNode | undefined): ArrowFunction {
    const body = this.c.is('{') ? this.parseBlock() : this.parseAssignment();
    return this.fin(start, { kind: 'ArrowFunction', async, params, ...(returnType ? { returnType } : {}), body });
  }

  private simpleParam(): Parameter {
    const start = this.pos();
    const id = this.parseIdentifier();
    return this.fin(start, { kind: 'Parameter', pattern: id, optional: false, rest: false });
  }

  // ── parameters / patterns ───────────────────────────────────────────────────
  private parseParams(): Parameter[] {
    this.c.expect('(');
    const params: Parameter[] = [];
    while (!this.c.is(')') && !this.c.atEnd) {
      params.push(this.parseParam());
      if (!this.c.eat(',')) break;
    }
    this.c.expect(')');
    return params;
  }

  private parseParam(): Parameter {
    const start = this.pos();
    const accessModifier = this.accessModifierHere();
    if (accessModifier) this.c.advance();
    const rest = this.c.eat('...');
    const pattern = this.parseBindingPattern();
    const optional = this.c.eat('?');
    const typeAnnotation = this.c.eat(':') ? this.parseType() : undefined;
    const def = this.c.eat('=') ? this.parseAssignment() : undefined;
    return this.fin(start, { kind: 'Parameter', ...(accessModifier ? { accessModifier } : {}), pattern, optional, ...(typeAnnotation ? { typeAnnotation } : {}), ...(def ? { default: def } : {}), rest });
  }

  private parseBindingPattern(): Pattern {
    const start = this.pos();
    if (this.c.is('[')) {
      this.c.advance();
      const elements: (Pattern | null)[] = [];
      while (!this.c.is(']') && !this.c.atEnd) {
        if (this.c.is(',')) { elements.push(null); this.c.advance(); continue; }
        if (this.c.is('...')) { this.c.advance(); const rs = this.pos(); const arg = this.parseIdentifier(); elements.push(this.fin(rs, { kind: 'RestElement', argument: arg })); break; }
        let p = this.parseBindingPattern();
        if (this.c.eat('=')) p = this.fin(p.span.start, { kind: 'AssignmentPattern', left: p, right: this.parseAssignment() });
        elements.push(p);
        if (!this.c.eat(',')) break;
      }
      this.c.expect(']');
      return this.fin(start, { kind: 'ArrayPattern', elements });
    }
    if (this.c.is('{')) {
      this.c.advance();
      const properties: (ObjectPatternProperty | RestElement)[] = [];
      while (!this.c.is('}') && !this.c.atEnd) {
        if (this.c.is('...')) { this.c.advance(); const rs = this.pos(); properties.push(this.fin(rs, { kind: 'RestElement', argument: this.parseIdentifier() })); break; }
        const ps = this.pos();
        const key = this.parseIdentifier();
        let value: Pattern = key;
        let shorthand = true;
        if (this.c.eat(':')) { value = this.parseBindingPattern(); shorthand = false; }
        if (this.c.eat('=')) value = this.fin(value.span.start, { kind: 'AssignmentPattern', left: value, right: this.parseAssignment() });
        properties.push(this.fin(ps, { kind: 'ObjectPatternProperty', key, value, shorthand }));
        if (!this.c.eat(',')) break;
      }
      this.c.expect('}');
      return this.fin(start, { kind: 'ObjectPattern', properties });
    }
    return this.parseIdentifier();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TYPES
  // ════════════════════════════════════════════════════════════════════════════
  private parseType(): TypeNode {
    const start = this.pos();
    // Tolerate a leading `|` so multi-line unions can be written
    // `type T =\n  | A\n  | B`. A lone `| A` collapses to just `A`.
    const leading = this.c.eat('|');
    let type = this.parseTypePostfix();
    if (leading || this.c.is('|')) {
      const types = [type];
      while (this.c.eat('|')) types.push(this.parseTypePostfix());
      type = types.length === 1 ? type : this.fin(start, { kind: 'UnionTypeNode', types });
    }
    return type;
  }

  private parseTypePostfix(): TypeNode {
    let type = this.parsePrimaryType();
    for (;;) {
      if (this.c.is('[') && this.c.peek(1).kind === ']') {
        this.c.advance(); this.c.advance();
        type = this.fin(type.span.start, { kind: 'ArrayTypeNode', element: type });
      } else if (this.c.is('?')) {
        this.c.advance();
        type = this.fin(type.span.start, { kind: 'NullableTypeNode', inner: type });
      } else break;
    }
    return type;
  }

  private parsePrimaryType(): TypeNode {
    const start = this.pos();
    const t = this.c.current;
    if (t.kind === 'identifier' && PRIMITIVE_TYPES.has(t.value)) {
      this.c.advance();
      return this.fin(start, { kind: 'PrimitiveTypeNode', name: t.value as PrimitiveTypeName });
    }
    if (PRIMITIVE_TYPES.has(t.kind as string)) {
      this.c.advance();
      return this.fin(start, { kind: 'PrimitiveTypeNode', name: t.kind as PrimitiveTypeName });
    }
    if (t.kind === 'identifier') return this.parseTypeRef();
    if (t.kind === '{') return this.parseObjectType();
    if (t.kind === '[') return this.parseTupleType();
    if (t.kind === '(') return this.parseFunctionOrParenType();
    this.c.error(Codes['P003'], `Expected a type but found '${t.kind}'`);
    throw new ParseError();
  }

  private parseTypeRef(): TypeRefNode {
    const start = this.pos();
    const name = [this.parseIdentifier().name];
    while (this.c.eat('.')) name.push(this.parseIdentifier().name);
    const typeArgs = this.parseTypeArgsOpt();
    return this.fin(start, { kind: 'TypeRefNode', name, ...(typeArgs ? { typeArgs } : {}) });
  }

  private parseTypeArgsOpt(): TypeNode[] | undefined {
    if (!this.c.is('<')) return undefined;
    this.c.advance();
    const args = [this.parseType()];
    while (this.c.eat(',')) args.push(this.parseType());
    this.c.expectCloseAngle();
    return args;
  }

  private parseTupleType(): TypeNode {
    const start = this.pos();
    this.c.expect('[');
    const elements: TypeNode[] = [];
    while (!this.c.is(']') && !this.c.atEnd) {
      elements.push(this.parseType());
      if (!this.c.eat(',')) break;
    }
    this.c.expect(']');
    return this.fin(start, { kind: 'TupleTypeNode', elements });
  }

  private parseObjectType(): TypeNode {
    const start = this.pos();
    this.c.expect('{');
    const members: Node[] = [];
    while (!this.c.is('}') && !this.c.atEnd) {
      if (this.c.eat(';') || this.c.eat(',')) continue;
      const ms = this.pos();
      // Index signature: `[ name : KeyType ] : ValueType`.
      if (this.c.is('[')) {
        this.c.advance();
        const keyName = this.parseIdentifier();
        this.c.expect(':');
        const keyType = this.parseType();
        this.c.expect(']');
        this.c.expect(':');
        const valueType = this.parseType();
        members.push(this.fin(ms, { kind: 'IndexSignature', keyName, keyType, valueType }));
        continue;
      }
      const readonly = this.eatModifier('readonly');
      const name = this.parsePropertyKey();
      if (this.c.is('(')) {
        const params = this.parseParams();
        this.c.expect(':');
        const returnType = this.parseType();
        members.push(this.fin(ms, { kind: 'InterfaceMethod', name, params, returnType }));
      } else {
        const optional = this.c.eat('?');
        this.c.expect(':');
        const type = this.parseType();
        members.push(this.fin(ms, { kind: 'InterfaceProperty', readonly, name, optional, type }));
      }
    }
    this.c.expect('}');
    return this.fin(start, { kind: 'ObjectTypeNode', members: members as unknown as ObjectTypeNode['members'] });
  }

  private parseFunctionOrParenType(): TypeNode {
    const start = this.pos();
    this.c.expect('(');
    // Speculate a function type `( [params] ) =>`; on any mismatch, fall back to
    // a parenthesized type group `( Type )` (e.g. `(number | string)[]`).
    const afterParen = this.c.snapshot();
    const fn = this.tryFunctionType(start);
    if (fn) return fn;
    this.c.restore(afterParen);
    const inner = this.parseType();
    this.c.expect(')');
    return this.fin(start, { kind: 'ParenthesizedTypeNode', inner });
  }

  /** Parse the rest of a function type after `(`, or return null (no commit on failure). */
  private tryFunctionType(start: Position): FunctionTypeNode | null {
    try {
      const params: Node[] = [];
      while (!this.c.is(')') && !this.c.atEnd) {
        const ps = this.pos();
        const rest = this.c.eat('...');
        const name = this.parseIdentifier();
        const optional = this.c.eat('?');
        this.c.expect(':');
        const type = this.parseType();
        params.push(this.fin(ps, { kind: 'FunctionTypeParam', name, optional, rest, type }));
        if (!this.c.eat(',')) break;
      }
      if (!this.c.is(')') || this.c.peek(1).kind !== '=>') return null;
      this.c.expect(')');
      this.c.expect('=>');
      const returnType = this.parseType();
      return this.fin(start, { kind: 'FunctionTypeNode', params: params as unknown as FunctionTypeNode['params'], returnType });
    } catch {
      return null;
    }
  }

  private parseTypeParamsOpt(): TypeParam[] | undefined {
    if (!this.c.is('<')) return undefined;
    this.c.advance();
    const params: TypeParam[] = [];
    while (!this.c.is('>') && !this.c.atEnd) {
      const ps = this.pos();
      const name = this.parseIdentifier();
      const def = this.c.eat('=') ? this.parseType() : undefined;
      params.push(this.fin(ps, { kind: 'TypeParam', name, ...(def ? { default: def } : {}) }));
      if (!this.c.eat(',')) break;
    }
    this.c.expectCloseAngle();
    return params;
  }

  // ── JSX (basic) ─────────────────────────────────────────────────────────────
  private parseJsx(): Expression {
    const start = this.pos();
    this.c.expect('<');
    if (this.c.is('>')) { // fragment
      this.c.advance();
      const children = this.parseJsxChildren();
      this.c.expect('<'); this.c.expect('/'); this.c.expect('>');
      return this.fin(start, { kind: 'JsxFragment', children });
    }
    const name = this.parseJsxName();
    const attributes = this.parseJsxAttributes();
    if (this.c.eat('/')) {
      this.c.expect('>');
      const opening = this.fin(start, { kind: 'JsxOpeningElement', name, attributes, selfClosing: true });
      return this.fin(start, { kind: 'JsxElement', opening, children: [] });
    }
    this.c.expect('>');
    const opening = this.fin(start, { kind: 'JsxOpeningElement', name, attributes, selfClosing: false });
    const children = this.parseJsxChildren();
    this.c.expect('<'); this.c.expect('/');
    const closingName = this.parseJsxName();
    this.c.expect('>');
    const closing = this.fin(start, { kind: 'JsxClosingElement', name: closingName });
    return this.fin(start, { kind: 'JsxElement', opening, children, closing });
  }

  private parseJsxName(): JsxElementName {
    const start = this.pos();
    const object = this.parseIdentifier();
    if (this.c.eat('.')) {
      const property = this.parseIdentifier();
      return this.fin(start, { kind: 'JsxMemberName', object, property });
    }
    return object;
  }

  private parseJsxAttributes(): (JsxAttribute | JsxSpreadAttribute)[] {
    const attrs: (JsxAttribute | JsxSpreadAttribute)[] = [];
    while (!this.c.isAny('>', '/', 'eof')) {
      const as = this.pos();
      if (this.c.eat('{')) {
        this.c.expect('...');
        const argument = this.parseAssignment();
        this.c.expect('}');
        attrs.push(this.fin(as, { kind: 'JsxSpreadAttribute', argument }));
        continue;
      }
      const name = this.parseIdentifier();
      let value: StringLiteral | JsxExpressionContainer | JsxElement | undefined;
      if (this.c.eat('=')) {
        if (this.c.is('string')) value = this.parseStringLiteral();
        else if (this.c.eat('{')) { const e = this.parseAssignment(); this.c.expect('}'); value = this.fin(as, { kind: 'JsxExpressionContainer', expression: e }); }
        else value = this.parseJsx() as JsxElement;
      }
      attrs.push(this.fin(as, { kind: 'JsxAttribute', name, ...(value ? { value } : {}) }) as JsxAttribute);
    }
    return attrs;
  }

  private parseJsxChildren(): JsxChild[] {
    const children: JsxChild[] = [];
    let guard = 0;
    while (!this.c.atEnd && guard++ < 10000) {
      if (this.c.is('<') && this.c.peek(1).kind === '/') break;
      if (this.c.is('<')) { children.push(this.parseJsx() as JsxChild); continue; }
      if (this.c.eat('{')) {
        const cs = this.pos();
        if (this.c.is('}')) { this.c.advance(); continue; }
        const expression = this.parseExpression();
        this.c.expect('}');
        children.push(this.fin(cs, { kind: 'JsxExpressionContainer', expression }));
        continue;
      }
      // Treat any other token as JSX text (coarse — lexer is not JSX-aware).
      const ts = this.pos();
      const tok = this.c.advance();
      children.push(this.fin(ts, { kind: 'JsxText', value: tok.value }));
    }
    return children;
  }
}

// ── template/string cooking ───────────────────────────────────────────────────
function cookTemplate(raw: string): string {
  let inner = raw;
  if (inner.startsWith('`')) inner = inner.slice(1);
  else if (inner.startsWith('}')) inner = inner.slice(1);
  if (inner.endsWith('${')) inner = inner.slice(0, -2);
  else if (inner.endsWith('`')) inner = inner.slice(0, -1);
  return cookEscapes(inner);
}

function cookString(raw: string): string {
  return cookEscapes(raw.slice(1, -1));
}

function cookEscapes(s: string): string {
  return s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/gs, (_m, esc: string) => {
    switch (esc[0]) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case '0': return '\0';
      case 'x': return String.fromCharCode(parseInt(esc.slice(1), 16));
      case 'u':
        return esc[1] === '{'
          ? String.fromCodePoint(parseInt(esc.slice(2, -1), 16))
          : String.fromCharCode(parseInt(esc.slice(1), 16));
      case '\n': return '';
      default: return esc;
    }
  });
}
