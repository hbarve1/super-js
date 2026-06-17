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
  TypeNode, FunctionTypeParam, InterfaceProperty, InterfaceMethod, IndexSignature,
  Identifier, PrimitiveTypeName,
} from '@superjs/types';
import { SYNTHETIC_SPAN } from '@superjs/types';
import { emitTypeDecl } from '@superjs/compiler';

/**
 * Translation-time typed-surface estimate: how many named identifier positions
 * (declaration names, object members, function parameters) resolved to a real
 * type vs degraded to `dynamic`. A coverage signal for `add` / `doctor` — not
 * the locked B7 benchmark metric (that ships as a separate, version-locked tool).
 */
export interface Surface {
  /** Identifier positions whose immediate type is not `dynamic`. */
  readonly typed: number;
  /** Total counted identifier positions. */
  readonly total: number;
}

export interface TranslateResult {
  /** The emitted `.d.sjs` source. */
  readonly code: string;
  /** Human-readable notes for TS forms that degraded to `dynamic`. */
  readonly unsupported: string[];
  /** Typed-surface estimate over the translated declarations. */
  readonly surface: Surface;
}

const S = SYNTHETIC_SPAN;

/** `'export '` when the declaration carries the `export` modifier, else `''`. */
function keyword(stmt: ts.Statement): string {
  const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
  return mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ? 'export ' : '';
}

const id = (name: string): Identifier => ({ kind: 'Identifier', name, span: S });
const prim = (name: PrimitiveTypeName): TypeNode => ({ kind: 'PrimitiveTypeNode', name, span: S });

/** Translate a `.d.ts` source string to `.d.sjs`. */
export function translateDts(source: string, fileName = 'input.d.ts'): TranslateResult {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, /*setParentNodes*/ true);
  const unsupported: string[] = [];
  const lines: string[] = [];
  const surface = { typed: 0, total: 0 };

  for (const stmt of sf.statements) {
    if (ts.isTypeAliasDeclaration(stmt)) {
      const params = typeParams(stmt.typeParameters, unsupported);
      const node = mapType(stmt.type, unsupported);
      countDecl(node, surface);
      lines.push(`${keyword(stmt)}type ${stmt.name.text}${params} = ${emitTypeDecl(node)};`);
    } else if (ts.isInterfaceDeclaration(stmt)) {
      const params = typeParams(stmt.typeParameters, unsupported);
      // Emit as a structural object-type alias (SuperJS interfaces are structural).
      const obj = objectFromMembers(stmt.members, unsupported);
      countDecl(obj, surface);
      lines.push(`${keyword(stmt)}type ${stmt.name.text}${params} = ${emitTypeDecl(obj)};`);
    } else if (ts.isEnumDeclaration(stmt)) {
      mapEnum(stmt, lines, unsupported, surface);
    } else {
      // Everything else (functions, classes, namespaces, var/const declares) is
      // not yet translated — but it is *reported*, never silently dropped.
      reportSkipped(stmt, unsupported);
    }
  }

  return { code: lines.join('\n') + (lines.length ? '\n' : ''), unsupported, surface };
}

/** True when a type is `dynamic` in immediate position (`dynamic` or `dynamic?`). */
function isImmediateDynamic(t: TypeNode): boolean {
  if (t.kind === 'PrimitiveTypeNode') return t.name === 'dynamic';
  if (t.kind === 'NullableTypeNode') return isImmediateDynamic(t.inner);
  return false;
}

/** Count a declaration's name as one identifier position, then its members. */
function countDecl(body: TypeNode, s: { typed: number; total: number }): void {
  s.total++;
  if (!isImmediateDynamic(body)) s.typed++;
  countType(body, s);
}

/** Recursively count member/parameter identifier positions inside a type. */
function countType(t: TypeNode, s: { typed: number; total: number }): void {
  switch (t.kind) {
    case 'ObjectTypeNode':
      for (const m of t.members) {
        if (m.kind === 'IndexSignature') { countType(m.valueType, s); continue; }
        s.total++;
        if (m.kind === 'InterfaceProperty') {
          if (!isImmediateDynamic(m.type)) s.typed++;
          countType(m.type, s);
        } else {
          // InterfaceMethod — name is a typed position; recurse the return type.
          s.typed++;
          countType(m.returnType, s);
        }
      }
      break;
    case 'FunctionTypeNode':
      for (const p of t.params) {
        s.total++;
        if (!isImmediateDynamic(p.type)) s.typed++;
        countType(p.type, s);
      }
      countType(t.returnType, s);
      break;
    case 'ArrayTypeNode': countType(t.element, s); break;
    case 'NullableTypeNode': countType(t.inner, s); break;
    case 'ParenthesizedTypeNode': countType(t.inner, s); break;
    case 'TupleTypeNode': for (const e of t.elements) countType(e, s); break;
    case 'UnionTypeNode': for (const u of t.types) countType(u, s); break;
    case 'TypeRefNode': if (t.typeArgs) for (const a of t.typeArgs) countType(a, s); break;
    // PrimitiveTypeNode — leaf, nothing to count.
  }
}

/**
 * Translate a TS `enum` to a SuperJS sum type: `enum Color { Red, Green }` →
 * `type Color = Red | Green;`. Member *values* (numeric/string initialisers) are
 * runtime data, not type surface, so they are dropped — the variant names carry
 * the full type surface. A sum type needs at least two named variants; a 0- or
 * 1-member enum can't form one, so it is reported instead of emitting broken code.
 */
function mapEnum(
  stmt: ts.EnumDeclaration,
  lines: string[],
  unsupported: string[],
  surface: { typed: number; total: number },
): void {
  const names = stmt.members
    .map((m) => ts.isIdentifier(m.name) ? m.name.text
      : ts.isStringLiteral(m.name) ? m.name.text
      : null)
    .filter((n): n is string => n !== null);
  if (names.length < 2) {
    unsupported.push(`enum \`${stmt.name.text}\` with ${names.length} usable member${names.length === 1 ? '' : 's'} skipped (a sum type needs ≥ 2 variants)`);
    return;
  }
  surface.total++;
  surface.typed++; // a sum type is a fully-typed declaration
  lines.push(`${keyword(stmt)}type ${stmt.name.text} = ${names.join(' | ')};`);
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
  if (ts.isIntersectionTypeNode(node)) {
    return mapIntersection(node, unsupported);
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

  // Conditional / mapped / keyof / typeof / indexed-access / infer …
  unsupported.push(`unsupported type \`${shortText(node)}\` mapped to \`dynamic\``);
  return prim('dynamic');
}

type ObjectType = Extract<TypeNode, { kind: 'ObjectTypeNode' }>;
type ObjectMember = InterfaceProperty | InterfaceMethod | IndexSignature;

/**
 * Auto-merge an intersection of object-type literals into one object type:
 * `{ a: number } & { b: string }` → `{ a: number; b: string }`. Recovers real
 * type surface that would otherwise fall back to `dynamic`.
 *
 * Sound only when every branch is a structural object literal and no property
 * name collides. A named branch (`A & B`) can't be merged without resolving it,
 * and a property-name conflict can't be reconciled — both degrade to `dynamic`
 * with `reason="intersection-not-mergeable"` (closed reason set, M8).
 */
function mapIntersection(node: ts.IntersectionTypeNode, unsupported: string[]): TypeNode {
  const childNotes: string[] = [];
  const branches = node.types.map((t) => mapType(t, childNotes));
  const objects = branches.filter((b): b is ObjectType => b.kind === 'ObjectTypeNode');

  if (objects.length === branches.length && objects.length > 0) {
    const merged: ObjectMember[] = [];
    const seen = new Set<string>();
    let conflict = false;
    for (const obj of objects) {
      for (const m of obj.members) {
        const key = m.kind !== 'IndexSignature' && m.name.kind === 'Identifier' ? m.name.name : null;
        if (key !== null) {
          if (seen.has(key)) { conflict = true; break; }
          seen.add(key);
        }
        merged.push(m);
      }
      if (conflict) break;
    }
    if (!conflict) {
      unsupported.push(...childNotes); // keep notes from inside the merged branches
      return { kind: 'ObjectTypeNode', members: merged, span: S };
    }
  }

  unsupported.push(`intersection \`${shortText(node)}\` mapped to \`dynamic\` (reason: intersection-not-mergeable)`);
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
