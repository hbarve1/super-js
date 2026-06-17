/**
 * TypeScript `.d.ts` → SuperJS `.d.sjs` type translation.
 *
 * Parses declarations with the official TypeScript compiler API (the only place
 * in the workspace that depends on `typescript` — kept to this Tier-4 tool, never
 * the core pipeline), maps each `ts.TypeNode` to a SuperJS {@link TypeNode}, and
 * prints it via `@superjs/compiler`'s `emitTypeDecl`.
 *
 * TS forms SuperJS bans or doesn't model (intersection, conditional, mapped,
 * `infer`, keyof/typeof, …) degrade to `dynamic` and are reported in
 * `unsupported` — never silently dropped. `any` maps to `dynamic` by design.
 * `enum` becomes a sum type; top-level functions/classes/namespaces are not yet
 * translated but are reported, never dropped silently.
 */

import ts from 'typescript';
import type {
  TypeNode, FunctionTypeParam, InterfaceProperty, IndexSignature, Identifier,
  PrimitiveTypeName,
} from '@superjs/types';
import { SYNTHETIC_SPAN } from '@superjs/types';
import { emitTypeDecl } from '@superjs/compiler';

export interface TranslateResult {
  /** The emitted `.d.sjs` source. */
  readonly code: string;
  /** Human-readable notes for TS forms that degraded to `dynamic`. */
  readonly unsupported: string[];
}

const S = SYNTHETIC_SPAN;
const id = (name: string): Identifier => ({ kind: 'Identifier', name, span: S });
const prim = (name: PrimitiveTypeName): TypeNode => ({ kind: 'PrimitiveTypeNode', name, span: S });

/** Translate a `.d.ts` source string to `.d.sjs`. */
export function translateDts(source: string, fileName = 'input.d.ts'): TranslateResult {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, /*setParentNodes*/ true);
  const unsupported: string[] = [];
  const lines: string[] = [];

  for (const stmt of sf.statements) {
    if (ts.isTypeAliasDeclaration(stmt)) {
      const params = typeParams(stmt.typeParameters, unsupported);
      const body = emitTypeDecl(mapType(stmt.type, unsupported));
      lines.push(`type ${stmt.name.text}${params} = ${body};`);
    } else if (ts.isInterfaceDeclaration(stmt)) {
      const params = typeParams(stmt.typeParameters, unsupported);
      // Emit as a structural object-type alias (SuperJS interfaces are structural).
      const obj = objectFromMembers(stmt.members, unsupported);
      lines.push(`type ${stmt.name.text}${params} = ${emitTypeDecl(obj)};`);
    } else if (ts.isEnumDeclaration(stmt)) {
      mapEnum(stmt, lines, unsupported);
    } else {
      // Everything else (functions, classes, namespaces, var/const declares) is
      // not yet translated — but it is *reported*, never silently dropped.
      reportSkipped(stmt, unsupported);
    }
  }

  return { code: lines.join('\n') + (lines.length ? '\n' : ''), unsupported };
}

/**
 * Translate a TS `enum` to a SuperJS sum type: `enum Color { Red, Green }` →
 * `type Color = Red | Green;`. Member *values* (numeric/string initialisers) are
 * runtime data, not type surface, so they are dropped — the variant names carry
 * the full type surface. A sum type needs at least two named variants; a 0- or
 * 1-member enum can't form one, so it is reported instead of emitting broken code.
 */
function mapEnum(stmt: ts.EnumDeclaration, lines: string[], unsupported: string[]): void {
  const names = stmt.members
    .map((m) => ts.isIdentifier(m.name) ? m.name.text
      : ts.isStringLiteral(m.name) ? m.name.text
      : null)
    .filter((n): n is string => n !== null);
  if (names.length < 2) {
    unsupported.push(`enum \`${stmt.name.text}\` with ${names.length} usable member${names.length === 1 ? '' : 's'} skipped (a sum type needs ≥ 2 variants)`);
    return;
  }
  lines.push(`type ${stmt.name.text} = ${names.join(' | ')};`);
}

/** Report a top-level declaration we don't translate yet — never drop silently. */
function reportSkipped(stmt: ts.Statement, unsupported: string[]): void {
  if (ts.isFunctionDeclaration(stmt)) {
    unsupported.push(`function \`${stmt.name?.text ?? '<anonymous>'}\` skipped (top-level functions not yet translated)`);
  } else if (ts.isClassDeclaration(stmt)) {
    unsupported.push(`class \`${stmt.name?.text ?? '<anonymous>'}\` skipped (classes not yet translated)`);
  } else if (ts.isModuleDeclaration(stmt)) {
    unsupported.push(`namespace/module \`${stmt.name.getText()}\` skipped (not yet translated)`);
  } else if (ts.isVariableStatement(stmt)) {
    const names = stmt.declarationList.declarations
      .map((d) => ts.isIdentifier(d.name) ? d.name.text : null)
      .filter((n): n is string => n !== null);
    unsupported.push(`variable declaration${names.length ? ` \`${names.join(', ')}\`` : ''} skipped (not yet translated)`);
  }
  // Imports, re-exports and export-assignments introduce no new type surface —
  // they reference names handled elsewhere or external modules. Skipped quietly.
}

function typeParams(
  tps: ts.NodeArray<ts.TypeParameterDeclaration> | undefined,
  unsupported: string[],
): string {
  if (!tps || tps.length === 0) return '';
  const names = tps.map((tp) => {
    if (tp.constraint) unsupported.push(`type-parameter constraint on \`${tp.name.text}\` dropped (SuperJS bans \`extends\` constraints)`);
    return tp.name.text;
  });
  return `<${names.join(', ')}>`;
}

/** Map a `ts.TypeNode` to a SuperJS {@link TypeNode}. */
function mapType(node: ts.TypeNode, unsupported: string[]): TypeNode {
  switch (node.kind) {
    case ts.SyntaxKind.NumberKeyword: return prim('number');
    case ts.SyntaxKind.StringKeyword: return prim('string');
    case ts.SyntaxKind.BooleanKeyword: return prim('boolean');
    case ts.SyntaxKind.BigIntKeyword: return prim('bigint');
    case ts.SyntaxKind.SymbolKeyword: return prim('symbol');
    case ts.SyntaxKind.VoidKeyword: return prim('void');
    case ts.SyntaxKind.UndefinedKeyword: return prim('undefined');
    case ts.SyntaxKind.NeverKeyword: return prim('never');
    case ts.SyntaxKind.UnknownKeyword: return prim('unknown');
    case ts.SyntaxKind.ObjectKeyword: return prim('object');
    case ts.SyntaxKind.AnyKeyword:
      unsupported.push('`any` mapped to `dynamic`');
      return prim('dynamic');
  }

  if (ts.isArrayTypeNode(node)) {
    return { kind: 'ArrayTypeNode', element: mapType(node.elementType, unsupported), span: S };
  }
  if (ts.isTupleTypeNode(node)) {
    return { kind: 'TupleTypeNode', elements: node.elements.map((e) => mapType(e as ts.TypeNode, unsupported)), span: S };
  }
  if (ts.isUnionTypeNode(node)) {
    return { kind: 'UnionTypeNode', types: node.types.map((t) => mapType(t, unsupported)), span: S };
  }
  if (ts.isParenthesizedTypeNode(node)) {
    return { kind: 'ParenthesizedTypeNode', inner: mapType(node.type, unsupported), span: S };
  }
  if (ts.isTypeReferenceNode(node)) {
    const name = entityName(node.typeName);
    const typeArgs = node.typeArguments?.map((a) => mapType(a, unsupported));
    return { kind: 'TypeRefNode', name, span: S, ...(typeArgs && typeArgs.length ? { typeArgs } : {}) };
  }
  if (ts.isFunctionTypeNode(node)) {
    return mapFunctionType(node.parameters, node.type, unsupported);
  }
  if (ts.isTypeLiteralNode(node)) {
    return objectFromMembers(node.members, unsupported);
  }
  if (ts.isLiteralTypeNode(node)) {
    if (node.literal.kind === ts.SyntaxKind.NullKeyword) return prim('null');
    unsupported.push(`literal type \`${node.getText()}\` mapped to its base (\`dynamic\`)`);
    return prim('dynamic');
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) return prim('null');

  // Intersection / conditional / mapped / keyof / typeof / indexed-access / infer …
  unsupported.push(`unsupported type \`${shortText(node)}\` mapped to \`dynamic\``);
  return prim('dynamic');
}

/** Map a parameter list + return type to a SuperJS FunctionTypeNode. */
function mapFunctionType(
  params: ts.NodeArray<ts.ParameterDeclaration>,
  retType: ts.TypeNode | undefined,
  unsupported: string[],
): TypeNode {
  return {
    kind: 'FunctionTypeNode',
    params: params.map((p, i): FunctionTypeParam => ({
      kind: 'FunctionTypeParam',
      name: id(ts.isIdentifier(p.name) ? p.name.text : `_${i}`),
      optional: !!p.questionToken,
      rest: !!p.dotDotDotToken,
      type: p.type ? mapType(p.type, unsupported) : prim('dynamic'),
      span: S,
    })),
    returnType: retType ? mapType(retType, unsupported) : prim('void'),
    span: S,
  };
}

/** Build a SuperJS ObjectTypeNode from TS type members. */
function objectFromMembers(
  members: ts.NodeArray<ts.TypeElement>,
  unsupported: string[],
): TypeNode {
  const out: (InterfaceProperty | IndexSignature)[] = [];
  for (const m of members) {
    if (ts.isPropertySignature(m) && m.name && ts.isIdentifier(m.name)) {
      out.push({
        kind: 'InterfaceProperty',
        readonly: hasReadonly(m),
        name: id(m.name.text),
        optional: !!m.questionToken,
        type: m.type ? mapType(m.type, unsupported) : prim('dynamic'),
        span: S,
      });
    } else if (ts.isMethodSignature(m) && m.name && ts.isIdentifier(m.name)) {
      // Map a method to a function-typed property — structurally equivalent.
      out.push({
        kind: 'InterfaceProperty',
        readonly: false,
        name: id(m.name.text),
        optional: !!m.questionToken,
        type: mapFunctionType(m.parameters, m.type, unsupported),
        span: S,
      });
    } else if (ts.isIndexSignatureDeclaration(m)) {
      const p = m.parameters[0];
      out.push({
        kind: 'IndexSignature',
        keyName: id(p && ts.isIdentifier(p.name) ? p.name.text : 'key'),
        keyType: p?.type ? mapType(p.type, unsupported) : prim('string'),
        valueType: mapType(m.type, unsupported),
        span: S,
      });
    } else {
      unsupported.push(`object member \`${shortText(m)}\` skipped`);
    }
  }
  return { kind: 'ObjectTypeNode', members: out, span: S };
}

function hasReadonly(m: ts.PropertySignature): boolean {
  return !!m.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword);
}

function entityName(name: ts.EntityName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return [...entityName(name.left), name.right.text];
}

function shortText(node: ts.Node): string {
  return node.getText().replace(/\s+/g, ' ').slice(0, 40);
}
