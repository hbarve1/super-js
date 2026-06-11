/**
 * `parseTypeDecl` / `emitTypeDecl` — the Stage-2 interop contract (B5).
 *
 * A *type declaration* here is a standalone type expression: a plain
 * {@link TypeNode} (alias body) or a {@link SumTypeDef} (variant list). The pair
 * round-trips: `emitTypeDecl(parseTypeDecl(s))` re-parses to a structurally
 * equal AST. Validated against the 200-fixture corpus the translator depends on.
 */

import type {
  TypeNode, SumTypeDef, VariantDef, FunctionTypeParam,
  InterfaceProperty, InterfaceMethod, IndexSignature, Parameter, PropertyKey,
} from '@superjs/types';
import { parse } from '@superjs/parser';

/** A parsed type declaration: an alias body or a sum-type variant list. */
export type TypeDeclAst = TypeNode | SumTypeDef;

/**
 * Parse a standalone type expression. Wraps the input in a synthetic
 * `type __T = <source>;` so the existing declaration parser handles every form
 * (generics, unions, nullable, variant payloads, function/object types).
 *
 * @throws if the input is not a single well-formed type expression.
 */
export function parseTypeDecl(source: string): TypeDeclAst {
  const wrapped = `type __SJS_TypeDecl__ = ${source};`;
  const { program, diagnostics } = parse(wrapped);
  const fatal = diagnostics.filter((d) => d.severity === 'error');
  if (fatal.length > 0) {
    throw new Error(`parseTypeDecl: invalid type \`${source}\` — ${fatal[0]!.message}`);
  }
  const decl = program.body[0];
  if (!decl || decl.kind !== 'TypeDecl') {
    throw new Error(`parseTypeDecl: expected a type expression, got \`${source}\``);
  }
  return decl.value;
}

/** Print a {@link TypeDeclAst} back to SuperJS type syntax. */
export function emitTypeDecl(decl: TypeDeclAst): string {
  return decl.kind === 'SumTypeDef' ? sumDef(decl) : typeNode(decl);
}

// ── Sum types ────────────────────────────────────────────────────────────────
function sumDef(def: SumTypeDef): string {
  return def.variants.map(variant).join(' | ');
}

function variant(v: VariantDef): string {
  if (v.form === 'unit') return v.name.name;
  if (v.form === 'tuple') return `${v.name.name}(${v.tupleType ? typeNode(v.tupleType) : ''})`;
  const fields = (v.fields ?? []).map((f) => `${f.name.name}: ${typeNode(f.type)}`).join(', ');
  return `${v.name.name}({ ${fields} })`;
}

// ── Type nodes ───────────────────────────────────────────────────────────────
function typeNode(t: TypeNode): string {
  switch (t.kind) {
    case 'PrimitiveTypeNode':
      return t.name;
    case 'TypeRefNode':
      return t.name.join('.') + (t.typeArgs?.length ? `<${t.typeArgs.map(typeNode).join(', ')}>` : '');
    case 'ArrayTypeNode':
      return `${wrapInArray(t.element)}[]`;
    case 'TupleTypeNode':
      return `[${t.elements.map(typeNode).join(', ')}]`;
    case 'FunctionTypeNode':
      return `(${t.params.map(funcParam).join(', ')}) => ${typeNode(t.returnType)}`;
    case 'ObjectTypeNode':
      return t.members.length ? `{ ${t.members.map(objectMember).join('; ')} }` : '{}';
    case 'NullableTypeNode':
      return `${wrapInNullable(t.inner)}?`;
    case 'UnionTypeNode':
      return t.types.map(unionMember).join(' | ');
    case 'ParenthesizedTypeNode':
      return `(${typeNode(t.inner)})`;
  }
}

function funcParam(p: FunctionTypeParam): string {
  const rest = p.rest ? '...' : '';
  const opt = p.optional ? '?' : '';
  return `${rest}${p.name.name}${opt}: ${typeNode(p.type)}`;
}

function objectMember(m: InterfaceProperty | InterfaceMethod | IndexSignature): string {
  if (m.kind === 'IndexSignature') {
    return `[${m.keyName.name}: ${typeNode(m.keyType)}]: ${typeNode(m.valueType)}`;
  }
  if (m.kind === 'InterfaceMethod') {
    return `${propKey(m.name)}(${m.params.map(methodParam).join(', ')}): ${typeNode(m.returnType)}`;
  }
  const ro = m.readonly ? 'readonly ' : '';
  const opt = m.optional ? '?' : '';
  return `${ro}${propKey(m.name)}${opt}: ${typeNode(m.type)}`;
}

function methodParam(p: Parameter): string {
  const name = p.pattern.kind === 'Identifier' ? p.pattern.name : '_';
  const opt = p.optional ? '?' : '';
  return `${name}${opt}: ${p.typeAnnotation ? typeNode(p.typeAnnotation) : 'dynamic'}`;
}

function propKey(k: PropertyKey): string {
  if (k.kind === 'Identifier') return k.name;
  if (k.kind === 'StringLiteral') return JSON.stringify(k.value);
  if (k.kind === 'NumberLiteral') return String(k.value);
  return '[computed]';
}

// Precedence guards: union binds loosest; nullable `?` binds tighter than union;
// `[]` binds tighter than nullable. Parenthesise to preserve structure.
function unionMember(t: TypeNode): string {
  return t.kind === 'FunctionTypeNode' ? `(${typeNode(t)})` : typeNode(t);
}
function wrapInNullable(t: TypeNode): string {
  return t.kind === 'UnionTypeNode' || t.kind === 'FunctionTypeNode' ? `(${typeNode(t)})` : typeNode(t);
}
function wrapInArray(t: TypeNode): string {
  return t.kind === 'UnionTypeNode' || t.kind === 'FunctionTypeNode' || t.kind === 'NullableTypeNode'
    ? `(${typeNode(t)})`
    : typeNode(t);
}
