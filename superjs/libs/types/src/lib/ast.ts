/**
 * SJS Abstract Syntax Tree.
 *
 * A discriminated union over the `kind` field, covering the whole of
 * specs/grammar.ebnf. Every node extends {@link NodeBase} (carries a `span`).
 *
 * Type *annotations* are syntactic ({@link TypeNode}); they are distinct from
 * the semantic type model in `sjs-type.ts`, which the checker resolves them to.
 */

import type { Span } from './span.js';

export interface NodeBase {
  readonly span: Span;
}

export type AccessModifier = 'public' | 'private' | 'protected';
export type VariableKind = 'const' | 'let' | 'var';

// ── Program ───────────────────────────────────────────────────────────────────
export interface Program extends NodeBase {
  readonly kind: 'Program';
  readonly body: readonly Statement[];
}

// ════════════════════════════════════════════════════════════════════════════
// STATEMENTS
// ════════════════════════════════════════════════════════════════════════════
export type Statement =
  | VariableDecl
  | FunctionDecl
  | ClassDecl
  | InterfaceDecl
  | TypeDecl
  | ImportDecl
  | ExportNamedDecl
  | ExportDefaultDecl
  | ExportAllDecl
  | ExpressionStatement
  | ReturnStatement
  | IfStatement
  | WhileStatement
  | DoWhileStatement
  | ForStatement
  | ForOfStatement
  | ForInStatement
  | SwitchStatement
  | BreakStatement
  | ContinueStatement
  | ThrowStatement
  | TryStatement
  | BlockStatement
  | LabeledStatement
  | EmptyStatement
  | DebuggerStatement;

export interface VariableDecl extends NodeBase {
  readonly kind: 'VariableDecl';
  readonly declKind: VariableKind;
  readonly declarators: readonly VariableDeclarator[];
}

export interface VariableDeclarator extends NodeBase {
  readonly kind: 'VariableDeclarator';
  readonly id: Pattern;
  readonly typeAnnotation?: TypeNode;
  readonly init?: Expression;
}

export interface FunctionDecl extends NodeBase {
  readonly kind: 'FunctionDecl';
  readonly id: Identifier;
  readonly async: boolean;
  readonly generator: boolean;
  readonly typeParams?: readonly TypeParam[];
  readonly params: readonly Parameter[];
  readonly returnType?: TypeNode;
  readonly body: BlockStatement;
}

export interface ClassDecl extends NodeBase {
  readonly kind: 'ClassDecl';
  readonly id: Identifier;
  readonly abstract: boolean;
  readonly typeParams?: readonly TypeParam[];
  readonly superClass?: TypeRefNode;
  readonly members: readonly ClassMember[];
}

export interface InterfaceDecl extends NodeBase {
  readonly kind: 'InterfaceDecl';
  readonly id: Identifier;
  readonly typeParams?: readonly TypeParam[];
  readonly extends: readonly TypeRefNode[];
  readonly members: readonly InterfaceMember[];
}

export interface TypeDecl extends NodeBase {
  readonly kind: 'TypeDecl';
  readonly id: Identifier;
  readonly typeParams?: readonly TypeParam[];
  /** Either a plain alias (`TypeNode`) or a sum type definition. */
  readonly value: TypeNode | SumTypeDef;
}

export interface ExpressionStatement extends NodeBase {
  readonly kind: 'ExpressionStatement';
  readonly expression: Expression;
}

export interface ReturnStatement extends NodeBase {
  readonly kind: 'ReturnStatement';
  readonly argument?: Expression;
}

export interface IfStatement extends NodeBase {
  readonly kind: 'IfStatement';
  readonly test: Expression;
  readonly consequent: Statement;
  readonly alternate?: Statement;
}

export interface WhileStatement extends NodeBase {
  readonly kind: 'WhileStatement';
  readonly test: Expression;
  readonly body: Statement;
}

export interface DoWhileStatement extends NodeBase {
  readonly kind: 'DoWhileStatement';
  readonly body: Statement;
  readonly test: Expression;
}

export interface ForStatement extends NodeBase {
  readonly kind: 'ForStatement';
  readonly init?: VariableDecl | Expression;
  readonly test?: Expression;
  readonly update?: Expression;
  readonly body: Statement;
}

export interface ForOfStatement extends NodeBase {
  readonly kind: 'ForOfStatement';
  readonly await: boolean;
  readonly declKind: VariableKind;
  readonly left: Pattern;
  readonly typeAnnotation?: TypeNode;
  readonly right: Expression;
  readonly body: Statement;
}

export interface ForInStatement extends NodeBase {
  readonly kind: 'ForInStatement';
  readonly declKind: VariableKind;
  readonly left: Identifier;
  readonly right: Expression;
  readonly body: Statement;
}

export interface SwitchStatement extends NodeBase {
  readonly kind: 'SwitchStatement';
  readonly discriminant: Expression;
  readonly cases: readonly SwitchCase[];
}

export interface SwitchCase extends NodeBase {
  readonly kind: 'SwitchCase';
  /** `undefined` test = the `default` case. */
  readonly test?: Expression;
  readonly body: readonly Statement[];
}

export interface BreakStatement extends NodeBase {
  readonly kind: 'BreakStatement';
  readonly label?: Identifier;
}

export interface ContinueStatement extends NodeBase {
  readonly kind: 'ContinueStatement';
  readonly label?: Identifier;
}

export interface ThrowStatement extends NodeBase {
  readonly kind: 'ThrowStatement';
  readonly argument: Expression;
}

export interface TryStatement extends NodeBase {
  readonly kind: 'TryStatement';
  readonly block: BlockStatement;
  readonly handler?: CatchClause;
  readonly finalizer?: BlockStatement;
}

export interface CatchClause extends NodeBase {
  readonly kind: 'CatchClause';
  readonly param?: Identifier;
  readonly paramType?: TypeNode;
  readonly body: BlockStatement;
}

export interface BlockStatement extends NodeBase {
  readonly kind: 'BlockStatement';
  readonly body: readonly Statement[];
}

export interface LabeledStatement extends NodeBase {
  readonly kind: 'LabeledStatement';
  readonly label: Identifier;
  readonly body: Statement;
}

export interface EmptyStatement extends NodeBase {
  readonly kind: 'EmptyStatement';
}

export interface DebuggerStatement extends NodeBase {
  readonly kind: 'DebuggerStatement';
}

// ── Imports / Exports ─────────────────────────────────────────────────────────
export interface ImportDecl extends NodeBase {
  readonly kind: 'ImportDecl';
  readonly typeOnly: boolean;
  readonly defaultImport?: Identifier;
  readonly namespaceImport?: Identifier;
  readonly named: readonly ImportSpecifier[];
  readonly source: StringLiteral;
}

export interface ImportSpecifier extends NodeBase {
  readonly kind: 'ImportSpecifier';
  readonly imported: Identifier;
  readonly local: Identifier;
}

export interface ExportNamedDecl extends NodeBase {
  readonly kind: 'ExportNamedDecl';
  readonly typeOnly: boolean;
  /** Inline declaration (`export const x = …`). */
  readonly declaration?: Statement;
  readonly specifiers: readonly ExportSpecifier[];
  readonly source?: StringLiteral;
}

export interface ExportSpecifier extends NodeBase {
  readonly kind: 'ExportSpecifier';
  readonly local: Identifier;
  readonly exported: Identifier;
}

export interface ExportDefaultDecl extends NodeBase {
  readonly kind: 'ExportDefaultDecl';
  readonly declaration: Expression | FunctionDecl | ClassDecl;
}

export interface ExportAllDecl extends NodeBase {
  readonly kind: 'ExportAllDecl';
  readonly exported?: Identifier;
  readonly source: StringLiteral;
}

// ── Sum type definition (RHS of a `type` decl) ────────────────────────────────
export interface SumTypeDef extends NodeBase {
  readonly kind: 'SumTypeDef';
  readonly variants: readonly VariantDef[];
}

export interface VariantDef extends NodeBase {
  readonly kind: 'VariantDef';
  readonly name: Identifier;
  /** Unit variant: no payload. Tuple: single TypeNode. Record: field list. */
  readonly form: 'unit' | 'tuple' | 'record';
  readonly tupleType?: TypeNode;
  readonly fields?: readonly VariantField[];
}

export interface VariantField extends NodeBase {
  readonly kind: 'VariantField';
  readonly name: Identifier;
  readonly optional: boolean;
  readonly type: TypeNode;
}

// ════════════════════════════════════════════════════════════════════════════
// PATTERNS (binding & destructuring)
// ════════════════════════════════════════════════════════════════════════════
export type Pattern =
  | Identifier
  | ArrayPattern
  | ObjectPattern
  | RestElement
  | AssignmentPattern;

export interface ArrayPattern extends NodeBase {
  readonly kind: 'ArrayPattern';
  /** `null` entries are elision (empty slots). */
  readonly elements: readonly (Pattern | null)[];
}

export interface ObjectPattern extends NodeBase {
  readonly kind: 'ObjectPattern';
  readonly properties: readonly (ObjectPatternProperty | RestElement)[];
}

export interface ObjectPatternProperty extends NodeBase {
  readonly kind: 'ObjectPatternProperty';
  readonly key: Identifier;
  readonly value: Pattern;
  readonly shorthand: boolean;
}

export interface RestElement extends NodeBase {
  readonly kind: 'RestElement';
  readonly argument: Identifier;
}

export interface AssignmentPattern extends NodeBase {
  readonly kind: 'AssignmentPattern';
  readonly left: Pattern;
  readonly right: Expression;
}

export interface Parameter extends NodeBase {
  readonly kind: 'Parameter';
  readonly accessModifier?: AccessModifier;
  readonly pattern: Pattern;
  readonly optional: boolean;
  readonly typeAnnotation?: TypeNode;
  readonly default?: Expression;
  readonly rest: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// CLASS & INTERFACE MEMBERS
// ════════════════════════════════════════════════════════════════════════════
export type ClassMember =
  | ClassProperty
  | ClassMethod
  | ClassConstructor
  | IndexSignature;

export interface ClassProperty extends NodeBase {
  readonly kind: 'ClassProperty';
  readonly accessModifier?: AccessModifier;
  readonly static: boolean;
  readonly readonly: boolean;
  readonly abstract: boolean;
  readonly name: PropertyKey;
  readonly optional: boolean;
  readonly typeAnnotation?: TypeNode;
  readonly value?: Expression;
}

export interface ClassMethod extends NodeBase {
  readonly kind: 'ClassMethod';
  readonly accessModifier?: AccessModifier;
  readonly static: boolean;
  readonly abstract: boolean;
  readonly async: boolean;
  readonly generator: boolean;
  readonly accessor?: 'get' | 'set';
  readonly name: PropertyKey;
  readonly typeParams?: readonly TypeParam[];
  readonly params: readonly Parameter[];
  readonly returnType?: TypeNode;
  /** `undefined` body = abstract method declaration. */
  readonly body?: BlockStatement;
}

export interface ClassConstructor extends NodeBase {
  readonly kind: 'ClassConstructor';
  readonly accessModifier?: AccessModifier;
  readonly params: readonly Parameter[];
  readonly body: BlockStatement;
}

export interface IndexSignature extends NodeBase {
  readonly kind: 'IndexSignature';
  readonly keyName: Identifier;
  readonly keyType: TypeNode;
  readonly valueType: TypeNode;
}

export type InterfaceMember =
  | InterfaceProperty
  | InterfaceMethod
  | IndexSignature;

export interface InterfaceProperty extends NodeBase {
  readonly kind: 'InterfaceProperty';
  readonly readonly: boolean;
  readonly name: PropertyKey;
  readonly optional: boolean;
  readonly type: TypeNode;
}

export interface InterfaceMethod extends NodeBase {
  readonly kind: 'InterfaceMethod';
  readonly name: PropertyKey;
  readonly typeParams?: readonly TypeParam[];
  readonly params: readonly Parameter[];
  readonly returnType: TypeNode;
}

/** Property key: identifier, string/number literal, or computed `[expr]`. */
export type PropertyKey = Identifier | StringLiteral | NumberLiteral | ComputedKey;

export interface ComputedKey extends NodeBase {
  readonly kind: 'ComputedKey';
  readonly expression: Expression;
}

// ════════════════════════════════════════════════════════════════════════════
// TYPE NODES (syntactic annotations)
// ════════════════════════════════════════════════════════════════════════════
export type TypeNode =
  | PrimitiveTypeNode
  | TypeRefNode
  | ArrayTypeNode
  | TupleTypeNode
  | FunctionTypeNode
  | ObjectTypeNode
  | NullableTypeNode
  | UnionTypeNode
  | ParenthesizedTypeNode;

export type PrimitiveTypeName =
  | 'number' | 'string' | 'boolean' | 'bigint' | 'symbol' | 'void'
  | 'null' | 'never' | 'dynamic' | 'unknown' | 'object' | 'undefined';

export interface PrimitiveTypeNode extends NodeBase {
  readonly kind: 'PrimitiveTypeNode';
  readonly name: PrimitiveTypeName;
}

export interface TypeRefNode extends NodeBase {
  readonly kind: 'TypeRefNode';
  /** Dotted path segments, e.g. `Module.Type` → ['Module','Type']. */
  readonly name: readonly string[];
  readonly typeArgs?: readonly TypeNode[];
}

export interface ArrayTypeNode extends NodeBase {
  readonly kind: 'ArrayTypeNode';
  readonly element: TypeNode;
}

export interface TupleTypeNode extends NodeBase {
  readonly kind: 'TupleTypeNode';
  readonly elements: readonly TypeNode[];
}

export interface FunctionTypeNode extends NodeBase {
  readonly kind: 'FunctionTypeNode';
  readonly params: readonly FunctionTypeParam[];
  readonly returnType: TypeNode;
}

export interface FunctionTypeParam extends NodeBase {
  readonly kind: 'FunctionTypeParam';
  readonly name: Identifier;
  readonly optional: boolean;
  readonly rest: boolean;
  readonly type: TypeNode;
}

export interface ObjectTypeNode extends NodeBase {
  readonly kind: 'ObjectTypeNode';
  readonly members: readonly (InterfaceProperty | InterfaceMethod | IndexSignature)[];
}

export interface NullableTypeNode extends NodeBase {
  readonly kind: 'NullableTypeNode';
  readonly inner: TypeNode;
}

export interface UnionTypeNode extends NodeBase {
  readonly kind: 'UnionTypeNode';
  readonly types: readonly TypeNode[];
}

export interface ParenthesizedTypeNode extends NodeBase {
  readonly kind: 'ParenthesizedTypeNode';
  readonly inner: TypeNode;
}

export interface TypeParam extends NodeBase {
  readonly kind: 'TypeParam';
  readonly name: Identifier;
  /** Default type. Note: SJS bans `extends` constraints (grammar §TypeParameter). */
  readonly default?: TypeNode;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPRESSIONS
// ════════════════════════════════════════════════════════════════════════════
export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | UndefinedLiteral
  | BigIntLiteral
  | RegexLiteral
  | TemplateLiteral
  | Identifier
  | ThisExpression
  | SuperExpression
  | MatchExpression
  | VariantConstructorExpression
  | ArrayLiteral
  | ObjectLiteral
  | ArrowFunction
  | FunctionExpression
  | ClassExpression
  | JsxElement
  | JsxFragment
  | TypeAssertion
  | UnaryExpression
  | UpdateExpression
  | BinaryExpression
  | LogicalExpression
  | AssignmentExpression
  | ConditionalExpression
  | CallExpression
  | NewExpression
  | MemberExpression
  | SequenceExpression
  | SpreadElement
  | AwaitExpression
  | YieldExpression
  | ParenthesizedExpression;

export interface Identifier extends NodeBase {
  readonly kind: 'Identifier';
  readonly name: string;
}

export interface NumberLiteral extends NodeBase {
  readonly kind: 'NumberLiteral';
  readonly value: number;
  readonly raw: string;
}

export interface StringLiteral extends NodeBase {
  readonly kind: 'StringLiteral';
  readonly value: string;
  readonly raw: string;
}

export interface BooleanLiteral extends NodeBase {
  readonly kind: 'BooleanLiteral';
  readonly value: boolean;
}

export interface NullLiteral extends NodeBase {
  readonly kind: 'NullLiteral';
}

export interface UndefinedLiteral extends NodeBase {
  readonly kind: 'UndefinedLiteral';
}

export interface BigIntLiteral extends NodeBase {
  readonly kind: 'BigIntLiteral';
  readonly value: bigint;
  readonly raw: string;
}

export interface RegexLiteral extends NodeBase {
  readonly kind: 'RegexLiteral';
  readonly pattern: string;
  readonly flags: string;
}

export interface TemplateLiteral extends NodeBase {
  readonly kind: 'TemplateLiteral';
  /** Static string chunks; `quasis.length === expressions.length + 1`. */
  readonly quasis: readonly string[];
  readonly expressions: readonly Expression[];
}

export interface ThisExpression extends NodeBase {
  readonly kind: 'ThisExpression';
}

export interface SuperExpression extends NodeBase {
  readonly kind: 'SuperExpression';
}

export interface ArrayLiteral extends NodeBase {
  readonly kind: 'ArrayLiteral';
  /** `null` = elision. */
  readonly elements: readonly (Expression | SpreadElement | null)[];
}

export interface ObjectLiteral extends NodeBase {
  readonly kind: 'ObjectLiteral';
  readonly properties: readonly (PropertyDef | SpreadElement | ObjectMethod)[];
}

export interface PropertyDef extends NodeBase {
  readonly kind: 'PropertyDef';
  readonly key: PropertyKey;
  readonly value: Expression;
  readonly shorthand: boolean;
}

export interface ObjectMethod extends NodeBase {
  readonly kind: 'ObjectMethod';
  readonly key: PropertyKey;
  readonly accessor?: 'get' | 'set';
  readonly async: boolean;
  readonly generator: boolean;
  readonly typeParams?: readonly TypeParam[];
  readonly params: readonly Parameter[];
  readonly returnType?: TypeNode;
  readonly body: BlockStatement;
}

export interface ArrowFunction extends NodeBase {
  readonly kind: 'ArrowFunction';
  readonly async: boolean;
  readonly params: readonly Parameter[];
  readonly returnType?: TypeNode;
  readonly body: Expression | BlockStatement;
}

export interface FunctionExpression extends NodeBase {
  readonly kind: 'FunctionExpression';
  readonly id?: Identifier;
  readonly async: boolean;
  readonly generator: boolean;
  readonly typeParams?: readonly TypeParam[];
  readonly params: readonly Parameter[];
  readonly returnType?: TypeNode;
  readonly body: BlockStatement;
}

export interface ClassExpression extends NodeBase {
  readonly kind: 'ClassExpression';
  readonly id?: Identifier;
  readonly typeParams?: readonly TypeParam[];
  readonly superClass?: TypeRefNode;
  readonly members: readonly ClassMember[];
}

export interface TypeAssertion extends NodeBase {
  readonly kind: 'TypeAssertion';
  readonly expression: Expression;
  readonly type: TypeNode;
}

export type UnaryOperator =
  | 'typeof' | 'void' | 'delete' | '!' | '~' | '+' | '-';

export interface UnaryExpression extends NodeBase {
  readonly kind: 'UnaryExpression';
  readonly operator: UnaryOperator;
  readonly argument: Expression;
}

export interface UpdateExpression extends NodeBase {
  readonly kind: 'UpdateExpression';
  readonly operator: '++' | '--';
  readonly prefix: boolean;
  readonly argument: Expression;
}

export type BinaryOperator =
  | '===' | '!==' | '==' | '!=' | '<' | '>' | '<=' | '>='
  | '+' | '-' | '*' | '/' | '%' | '**'
  | '<<' | '>>' | '>>>' | '&' | '|' | '^'
  | 'instanceof' | 'in';

export interface BinaryExpression extends NodeBase {
  readonly kind: 'BinaryExpression';
  readonly operator: BinaryOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export type LogicalOperator = '&&' | '||' | '??';

export interface LogicalExpression extends NodeBase {
  readonly kind: 'LogicalExpression';
  readonly operator: LogicalOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export type AssignmentOperator =
  | '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '**='
  | '&&=' | '||=' | '??=' | '&=' | '|=' | '^=' | '<<=' | '>>=' | '>>>=';

export interface AssignmentExpression extends NodeBase {
  readonly kind: 'AssignmentExpression';
  readonly operator: AssignmentOperator;
  readonly left: Expression | Pattern;
  readonly right: Expression;
}

export interface ConditionalExpression extends NodeBase {
  readonly kind: 'ConditionalExpression';
  readonly test: Expression;
  readonly consequent: Expression;
  readonly alternate: Expression;
}

export interface CallExpression extends NodeBase {
  readonly kind: 'CallExpression';
  readonly callee: Expression;
  readonly typeArgs?: readonly TypeNode[];
  readonly args: readonly (Expression | SpreadElement)[];
  /** True for `?.()` optional call. */
  readonly optional: boolean;
}

export interface NewExpression extends NodeBase {
  readonly kind: 'NewExpression';
  readonly callee: Expression;
  readonly typeArgs?: readonly TypeNode[];
  readonly args: readonly (Expression | SpreadElement)[];
}

export interface MemberExpression extends NodeBase {
  readonly kind: 'MemberExpression';
  readonly object: Expression;
  /** Computed `a[b]` vs static `a.b`. */
  readonly computed: boolean;
  readonly property: Expression | Identifier;
  /** True for `?.` optional member access. */
  readonly optional: boolean;
}

export interface SequenceExpression extends NodeBase {
  readonly kind: 'SequenceExpression';
  readonly expressions: readonly Expression[];
}

export interface SpreadElement extends NodeBase {
  readonly kind: 'SpreadElement';
  readonly argument: Expression;
}

export interface AwaitExpression extends NodeBase {
  readonly kind: 'AwaitExpression';
  readonly argument: Expression;
}

export interface YieldExpression extends NodeBase {
  readonly kind: 'YieldExpression';
  readonly delegate: boolean;
  readonly argument?: Expression;
}

export interface ParenthesizedExpression extends NodeBase {
  readonly kind: 'ParenthesizedExpression';
  readonly expression: Expression;
}

// ── Match expression (SJS-specific) ───────────────────────────────────────────
export interface MatchExpression extends NodeBase {
  readonly kind: 'MatchExpression';
  readonly subject: Expression;
  readonly arms: readonly MatchArm[];
}

export interface MatchArm extends NodeBase {
  readonly kind: 'MatchArm';
  readonly pattern: MatchPattern;
  readonly body: Expression | BlockStatement;
}

export type MatchPattern =
  | TupleVariantPattern
  | RecordVariantPattern
  | UnitVariantPattern
  | DefaultPattern;

export interface TupleVariantPattern extends NodeBase {
  readonly kind: 'TupleVariantPattern';
  readonly variant: Identifier;
  readonly binding: Identifier;
}

export interface RecordVariantPattern extends NodeBase {
  readonly kind: 'RecordVariantPattern';
  readonly variant: Identifier;
  readonly fields: readonly RecordPatternField[];
}

export interface RecordPatternField extends NodeBase {
  readonly kind: 'RecordPatternField';
  readonly field: Identifier;
  /** Rebinding (`field: binding`); falls back to `field` shorthand. */
  readonly binding?: Identifier;
}

export interface UnitVariantPattern extends NodeBase {
  readonly kind: 'UnitVariantPattern';
  readonly variant: Identifier;
}

export interface DefaultPattern extends NodeBase {
  readonly kind: 'DefaultPattern';
}

export interface VariantConstructorExpression extends NodeBase {
  readonly kind: 'VariantConstructorExpression';
  readonly variant: Identifier;
  /** `undefined` for unit variants; present for tuple variants. */
  readonly argument?: Expression;
}

// ════════════════════════════════════════════════════════════════════════════
// JSX
// ════════════════════════════════════════════════════════════════════════════
export interface JsxElement extends NodeBase {
  readonly kind: 'JsxElement';
  readonly opening: JsxOpeningElement;
  readonly children: readonly JsxChild[];
  /** `undefined` for self-closing elements. */
  readonly closing?: JsxClosingElement;
}

export interface JsxFragment extends NodeBase {
  readonly kind: 'JsxFragment';
  readonly children: readonly JsxChild[];
}

export interface JsxOpeningElement extends NodeBase {
  readonly kind: 'JsxOpeningElement';
  readonly name: JsxElementName;
  readonly attributes: readonly (JsxAttribute | JsxSpreadAttribute)[];
  readonly selfClosing: boolean;
}

export interface JsxClosingElement extends NodeBase {
  readonly kind: 'JsxClosingElement';
  readonly name: JsxElementName;
}

export type JsxElementName = Identifier | JsxMemberName;

export interface JsxMemberName extends NodeBase {
  readonly kind: 'JsxMemberName';
  readonly object: Identifier;
  readonly property: Identifier;
}

export interface JsxAttribute extends NodeBase {
  readonly kind: 'JsxAttribute';
  readonly name: Identifier;
  readonly value?: StringLiteral | JsxExpressionContainer | JsxElement;
}

export interface JsxSpreadAttribute extends NodeBase {
  readonly kind: 'JsxSpreadAttribute';
  readonly argument: Expression;
}

export type JsxChild = JsxElement | JsxFragment | JsxExpressionContainer | JsxText;

export interface JsxExpressionContainer extends NodeBase {
  readonly kind: 'JsxExpressionContainer';
  readonly expression: Expression;
}

export interface JsxText extends NodeBase {
  readonly kind: 'JsxText';
  readonly value: string;
}

// ── Any-node convenience union ────────────────────────────────────────────────
export type Node =
  | Program
  | Statement
  | Expression
  | Pattern
  | TypeNode
  | ClassMember
  | InterfaceMember
  | Parameter
  | TypeParam
  | SwitchCase
  | CatchClause
  | ImportSpecifier
  | ExportSpecifier
  | SumTypeDef
  | VariantDef
  | VariantField
  | MatchArm
  | MatchPattern
  | PropertyDef
  | ObjectMethod
  | ObjectPatternProperty
  | RecordPatternField
  | ComputedKey
  | FunctionTypeParam
  | JsxOpeningElement
  | JsxClosingElement
  | JsxAttribute
  | JsxSpreadAttribute
  | JsxMemberName;

/** Discriminant string of any AST node. */
export type NodeKind = Node['kind'];
