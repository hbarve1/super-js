/**
 * SJS-IR — the lowered, target-agnostic JavaScript intermediate representation.
 *
 * A compact ESTree-flavoured subset. By the time the AST reaches IR, every
 * SJS-specific construct has been desugared:
 *   - All type-level syntax is erased (annotations, interfaces, `type` aliases,
 *     `as` casts, access modifiers, generics).
 *   - Sum-type constructors become tagged object literals (`{ _tag, _0, … }`)
 *     per specs/language/052-sum-type-encoding.md.
 *   - `match` becomes an IIFE of `_tag` checks per 053-match-lowering.md.
 *   - Constructor parameter-properties become `this.x = x` assignments.
 *   - JSX becomes `React.createElement(...)` calls.
 *
 * The IR is plain JSON (every node is a data object), so `.sjsir` serialization
 * is structural — see serialize.ts. ES-target-specific lowering (es5 `var`,
 * `Math.pow`, etc.) is the codegen backend's responsibility, not the IR's.
 */

export type IrNode = IrProgram | IrStatement | IrExpression;

export interface IrProgram {
  readonly type: 'Program';
  readonly body: readonly IrStatement[];
}

// ── Statements ────────────────────────────────────────────────────────────────
export type IrStatement =
  | IrVarDecl
  | IrFunctionDecl
  | IrClassDecl
  | IrReturn
  | IrIf
  | IrFor
  | IrForOf
  | IrForIn
  | IrWhile
  | IrDoWhile
  | IrSwitch
  | IrBreak
  | IrContinue
  | IrThrow
  | IrTry
  | IrBlock
  | IrExpressionStatement
  | IrImport
  | IrExport
  | IrExportDefault
  | IrEmpty;

export interface IrVarDecl {
  readonly type: 'VariableDeclaration';
  readonly kind: 'const' | 'let' | 'var';
  readonly declarations: readonly IrVarDeclarator[];
}
export interface IrVarDeclarator {
  readonly type: 'VariableDeclarator';
  readonly id: IrPattern;
  readonly init?: IrExpression;
}

export interface IrFunctionDecl {
  readonly type: 'FunctionDeclaration';
  readonly id: string;
  readonly async: boolean;
  readonly generator: boolean;
  readonly params: readonly IrPattern[];
  readonly body: IrBlock;
}

export interface IrClassDecl {
  readonly type: 'ClassDeclaration';
  readonly id: string;
  readonly superClass?: IrExpression;
  readonly body: readonly IrClassMember[];
}
export type IrClassMember = IrMethod | IrField;
export interface IrMethod {
  readonly type: 'MethodDefinition';
  readonly kind: 'constructor' | 'method' | 'get' | 'set';
  readonly key: IrPropertyKey;
  readonly static: boolean;
  readonly computed: boolean;
  readonly value: IrFunctionExpression;
}
export interface IrField {
  readonly type: 'PropertyDefinition';
  readonly key: IrPropertyKey;
  readonly static: boolean;
  readonly computed: boolean;
  readonly value?: IrExpression;
}

export interface IrReturn { readonly type: 'ReturnStatement'; readonly argument?: IrExpression }
export interface IrIf {
  readonly type: 'IfStatement';
  readonly test: IrExpression;
  readonly consequent: IrStatement;
  readonly alternate?: IrStatement;
}
export interface IrFor {
  readonly type: 'ForStatement';
  readonly init?: IrVarDecl | IrExpression;
  readonly test?: IrExpression;
  readonly update?: IrExpression;
  readonly body: IrStatement;
}
export interface IrForOf {
  readonly type: 'ForOfStatement';
  readonly await: boolean;
  readonly left: IrVarDecl;
  readonly right: IrExpression;
  readonly body: IrStatement;
}
export interface IrForIn {
  readonly type: 'ForInStatement';
  readonly left: IrVarDecl;
  readonly right: IrExpression;
  readonly body: IrStatement;
}
export interface IrWhile { readonly type: 'WhileStatement'; readonly test: IrExpression; readonly body: IrStatement }
export interface IrDoWhile { readonly type: 'DoWhileStatement'; readonly body: IrStatement; readonly test: IrExpression }
export interface IrSwitch {
  readonly type: 'SwitchStatement';
  readonly discriminant: IrExpression;
  readonly cases: readonly IrSwitchCase[];
}
export interface IrSwitchCase { readonly type: 'SwitchCase'; readonly test?: IrExpression; readonly body: readonly IrStatement[] }
export interface IrBreak { readonly type: 'BreakStatement'; readonly label?: string }
export interface IrContinue { readonly type: 'ContinueStatement'; readonly label?: string }
export interface IrThrow { readonly type: 'ThrowStatement'; readonly argument: IrExpression }
export interface IrTry {
  readonly type: 'TryStatement';
  readonly block: IrBlock;
  readonly handler?: IrCatch;
  readonly finalizer?: IrBlock;
}
export interface IrCatch { readonly type: 'CatchClause'; readonly param?: IrPattern; readonly body: IrBlock }
export interface IrBlock { readonly type: 'BlockStatement'; readonly body: readonly IrStatement[] }
export interface IrExpressionStatement { readonly type: 'ExpressionStatement'; readonly expression: IrExpression }
export interface IrEmpty { readonly type: 'EmptyStatement' }

export interface IrImport {
  readonly type: 'ImportDeclaration';
  readonly source: string;
  readonly defaultImport?: string;
  readonly namespaceImport?: string;
  readonly named: readonly { readonly imported: string; readonly local: string }[];
}
export interface IrExport {
  readonly type: 'ExportNamedDeclaration';
  readonly declaration?: IrStatement;
  readonly specifiers: readonly { readonly local: string; readonly exported: string }[];
  readonly source?: string;
}
export interface IrExportDefault { readonly type: 'ExportDefaultDeclaration'; readonly declaration: IrExpression | IrFunctionDecl | IrClassDecl }

// ── Patterns ──────────────────────────────────────────────────────────────────
export type IrPattern = IrIdentifier | IrArrayPattern | IrObjectPattern | IrRestElement | IrAssignmentPattern;
export interface IrArrayPattern { readonly type: 'ArrayPattern'; readonly elements: readonly (IrPattern | null)[] }
export interface IrObjectPattern { readonly type: 'ObjectPattern'; readonly properties: readonly (IrPatternProp | IrRestElement)[] }
export interface IrPatternProp { readonly type: 'Property'; readonly key: IrPropertyKey; readonly value: IrPattern; readonly shorthand: boolean; readonly computed: boolean }
export interface IrRestElement { readonly type: 'RestElement'; readonly argument: IrPattern }
export interface IrAssignmentPattern { readonly type: 'AssignmentPattern'; readonly left: IrPattern; readonly right: IrExpression }

// ── Expressions ───────────────────────────────────────────────────────────────
export type IrExpression =
  | IrIdentifier
  | IrLiteral
  | IrTemplate
  | IrArray
  | IrObject
  | IrArrow
  | IrFunctionExpression
  | IrClassExpression
  | IrUnary
  | IrUpdate
  | IrBinary
  | IrLogical
  | IrAssignment
  | IrConditional
  | IrCall
  | IrNew
  | IrMember
  | IrSequence
  | IrSpread
  | IrAwait
  | IrYield
  | IrThis
  | IrSuper;

export interface IrIdentifier { readonly type: 'Identifier'; readonly name: string }
export interface IrLiteral {
  readonly type: 'Literal';
  readonly value: string | number | boolean | null;
  /** Set for bigint literals — rendered verbatim (e.g. "10n"). */
  readonly bigint?: string;
  /** Set for regex literals. */
  readonly regex?: { readonly pattern: string; readonly flags: string };
}
export interface IrTemplate {
  readonly type: 'TemplateLiteral';
  readonly quasis: readonly string[];
  readonly expressions: readonly IrExpression[];
}
export interface IrArray { readonly type: 'ArrayExpression'; readonly elements: readonly (IrExpression | IrSpread | null)[] }
export interface IrObject { readonly type: 'ObjectExpression'; readonly properties: readonly (IrProperty | IrSpread)[] }
export interface IrProperty {
  readonly type: 'Property';
  readonly key: IrPropertyKey;
  readonly value: IrExpression;
  readonly kind: 'init' | 'get' | 'set';
  readonly shorthand: boolean;
  readonly computed: boolean;
  readonly method: boolean;
}
export type IrPropertyKey = IrIdentifier | IrLiteral;

export interface IrArrow {
  readonly type: 'ArrowFunctionExpression';
  readonly async: boolean;
  readonly params: readonly IrPattern[];
  readonly body: IrBlock | IrExpression;
}
export interface IrFunctionExpression {
  readonly type: 'FunctionExpression';
  readonly id?: string;
  readonly async: boolean;
  readonly generator: boolean;
  readonly params: readonly IrPattern[];
  readonly body: IrBlock;
}
export interface IrClassExpression {
  readonly type: 'ClassExpression';
  readonly id?: string;
  readonly superClass?: IrExpression;
  readonly body: readonly IrClassMember[];
}

export interface IrUnary { readonly type: 'UnaryExpression'; readonly operator: string; readonly prefix: boolean; readonly argument: IrExpression }
export interface IrUpdate { readonly type: 'UpdateExpression'; readonly operator: '++' | '--'; readonly prefix: boolean; readonly argument: IrExpression }
export interface IrBinary { readonly type: 'BinaryExpression'; readonly operator: string; readonly left: IrExpression; readonly right: IrExpression }
export interface IrLogical { readonly type: 'LogicalExpression'; readonly operator: '&&' | '||' | '??'; readonly left: IrExpression; readonly right: IrExpression }
export interface IrAssignment { readonly type: 'AssignmentExpression'; readonly operator: string; readonly left: IrExpression | IrPattern; readonly right: IrExpression }
export interface IrConditional { readonly type: 'ConditionalExpression'; readonly test: IrExpression; readonly consequent: IrExpression; readonly alternate: IrExpression }
export interface IrCall { readonly type: 'CallExpression'; readonly callee: IrExpression; readonly arguments: readonly (IrExpression | IrSpread)[]; readonly optional: boolean }
export interface IrNew { readonly type: 'NewExpression'; readonly callee: IrExpression; readonly arguments: readonly (IrExpression | IrSpread)[] }
export interface IrMember { readonly type: 'MemberExpression'; readonly object: IrExpression; readonly property: IrExpression; readonly computed: boolean; readonly optional: boolean }
export interface IrSequence { readonly type: 'SequenceExpression'; readonly expressions: readonly IrExpression[] }
export interface IrSpread { readonly type: 'SpreadElement'; readonly argument: IrExpression }
export interface IrAwait { readonly type: 'AwaitExpression'; readonly argument: IrExpression }
export interface IrYield { readonly type: 'YieldExpression'; readonly delegate: boolean; readonly argument?: IrExpression }
export interface IrThis { readonly type: 'ThisExpression' }
export interface IrSuper { readonly type: 'Super' }

// ── Builders (terse, used heavily by the lowerer) ─────────────────────────────
export const id = (name: string): IrIdentifier => ({ type: 'Identifier', name });
export const lit = (value: string | number | boolean | null): IrLiteral => ({ type: 'Literal', value });
export const member = (object: IrExpression, prop: string, optional = false): IrMember =>
  ({ type: 'MemberExpression', object, property: id(prop), computed: false, optional });
export const call = (callee: IrExpression, args: (IrExpression | IrSpread)[]): IrCall =>
  ({ type: 'CallExpression', callee, arguments: args, optional: false });
