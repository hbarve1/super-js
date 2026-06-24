/**
 * `doc` — API documentation generation (Stage 3, ADR-009). Extracts every
 * exported declaration from a module and documents it from the type annotations
 * (SJS types are explicit, so the signature *is* the documentation) plus any
 * leading JSDoc-style doc comment. Renders to Markdown or JSON.
 *
 * MVP scope: signatures + doc comments. The full ADR's HTML site, `--serve`,
 * `@example` type-checking and impl-finder are later work.
 */

import type {
  Statement, TypeNode, SumTypeDef, Parameter, TypeParam, ClassDecl,
} from '@superjs/types';
import { parse } from '@superjs/parser';
import { emitTypeDecl } from './type-decl.js';

export type DocKind = 'function' | 'type' | 'class' | 'const' | 'default';

export interface DocTag { readonly tag: string; readonly value: string; }
export interface DocComment { readonly description: string; readonly tags: readonly DocTag[]; }

export interface DocSymbol {
  readonly name: string;
  readonly kind: DocKind;
  /** One-line signature in SJS syntax. */
  readonly signature: string;
  readonly doc: DocComment | null;
}

/** Extract documented exported symbols from a module. */
export function doc(source: string, _file?: string): DocSymbol[] {
  const { program } = parse(source);
  const out: DocSymbol[] = [];
  for (const s of program.body) {
    if (s.kind === 'ExportNamedDecl' && s.declaration) {
      for (const sym of fromDecl(s.declaration)) out.push({ ...sym, doc: leadingDoc(source, s.span.start.offset) });
    } else if (s.kind === 'ExportDefaultDecl'
      && (s.declaration.kind === 'FunctionDecl' || s.declaration.kind === 'ClassDecl')) {
      const [sym] = fromDecl(s.declaration as Statement);
      if (sym) out.push({ ...sym, kind: 'default', doc: leadingDoc(source, s.span.start.offset) });
    }
  }
  return out;
}

/** Build symbol records (without doc comments) for one declaration. */
function fromDecl(d: Statement): Omit<DocSymbol, 'doc'>[] {
  switch (d.kind) {
    case 'FunctionDecl': {
      const a = d.async ? 'async ' : '';
      return [{ name: d.id.name, kind: 'function',
        signature: `${a}function ${d.id.name}${typeParams(d.typeParams)}(${params(d.params)})${ret(d.returnType)}` }];
    }
    case 'TypeDecl': {
      const v = d.value.kind === 'SumTypeDef' ? sumDef(d.value) : emitTypeDecl(d.value as TypeNode);
      return [{ name: d.id.name, kind: 'type', signature: `type ${d.id.name}${typeParams(d.typeParams)} = ${v}` }];
    }
    case 'ObjectTypeDecl': {
      const ext = d.extends.length ? ` extends ${d.extends.map((e) => emitTypeDecl(e)).join(', ')}` : '';
      return [{ name: d.id.name, kind: 'type', signature: `type ${d.id.name}${typeParams(d.typeParams)}${ext} { … }` }];
    }
    case 'ClassDecl':
      return [{ name: d.id.name, kind: 'class', signature: classSig(d) }];
    case 'VariableDecl':
      return d.declarators.flatMap((dec) => dec.id.kind === 'Identifier'
        ? [{ name: dec.id.name, kind: 'const' as DocKind,
            signature: `${d.declKind} ${dec.id.name}${dec.typeAnnotation ? `: ${emitTypeDecl(dec.typeAnnotation)}` : ''}` }]
        : []);
    default: return [];
  }
}

function classSig(d: ClassDecl): string {
  const ab = d.abstract ? 'abstract ' : '';
  const ext = d.superClass ? ` extends ${emitTypeDecl(d.superClass)}` : '';
  return `${ab}class ${d.id.name}${typeParams(d.typeParams)}${ext}`;
}

function params(ps: readonly Parameter[]): string {
  return ps.map((p) => {
    const name = p.pattern.kind === 'Identifier' ? p.pattern.name : '_';
    const ty = p.typeAnnotation ? emitTypeDecl(p.typeAnnotation) : 'dynamic';
    return `${p.rest ? '...' : ''}${name}${p.optional ? '?' : ''}: ${ty}`;
  }).join(', ');
}

function ret(t: TypeNode | undefined): string { return t ? `: ${emitTypeDecl(t)}` : ''; }

function typeParams(tps: readonly TypeParam[] | undefined): string {
  return tps?.length ? `<${tps.map((t) => t.name.name).join(', ')}>` : '';
}

function sumDef(d: SumTypeDef): string {
  return d.variants.map((v) => v.name.name + (v.form === 'unit' ? ''
    : v.form === 'tuple' ? `(${v.tupleType ? emitTypeDecl(v.tupleType) : ''})`
    : `({ ${(v.fields ?? []).map((f) => `${f.name.name}: ${emitTypeDecl(f.type)}`).join(', ')} })`)).join(' | ');
}

// ── Leading doc-comment extraction (comments are lexer trivia) ────────────────

/** Find a JSDoc-style doc comment immediately preceding `offset`, if any. */
function leadingDoc(source: string, offset: number): DocComment | null {
  let i = offset - 1;
  while (i >= 0 && /\s/.test(source[i]!)) i--;
  if (i < 1 || source[i] !== '/' || source[i - 1] !== '*') return null; // not `*/`
  const start = source.lastIndexOf('/**', i);
  if (start === -1) return null;
  return parseDocComment(source.slice(start + 3, i - 1));
}

/** Parse a doc-comment body: leading prose, then `@tag` lines. */
function parseDocComment(raw: string): DocComment {
  const lines = raw.split('\n').map((l) => l.replace(/^\s*\*?\s?/, '').replace(/\s+$/, ''));
  const desc: string[] = [];
  const tags: DocTag[] = [];
  let current: { tag: string; value: string[] } | null = null;
  for (const line of lines) {
    const m = /^@(\w+)\s*(.*)$/.exec(line);
    if (m) {
      if (current) tags.push({ tag: current.tag, value: current.value.join('\n').trim() });
      current = { tag: m[1]!, value: m[2] ? [m[2]] : [] };
    } else if (current) {
      current.value.push(line);
    } else {
      desc.push(line);
    }
  }
  if (current) tags.push({ tag: current.tag, value: current.value.join('\n').trim() });
  return { description: desc.join('\n').trim(), tags };
}

// ── Renderers ─────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<DocKind, string> = {
  function: 'function', type: 'type', class: 'class', const: 'const', default: 'default export',
};

/** Render symbols as Markdown API docs. */
export function renderMarkdown(symbols: readonly DocSymbol[], title = 'API'): string {
  const out: string[] = [`# ${title}`, ''];
  if (symbols.length === 0) { out.push('_No exported symbols._', ''); return out.join('\n'); }
  for (const s of symbols) {
    out.push(`## \`${s.name}\``, '', `*${KIND_LABEL[s.kind]}*`, '', '```sjs', s.signature, '```', '');
    if (s.doc?.description) out.push(s.doc.description, '');
    for (const t of s.doc?.tags ?? []) {
      if (t.tag === 'example') out.push('**Example**', '', '```sjs', t.value, '```', '');
      else if (t.tag === 'deprecated') out.push(`> **Deprecated** ${t.value}`.trimEnd(), '');
      else out.push(`**@${t.tag}** ${t.value}`.trimEnd(), '');
    }
  }
  return ensureSingleTrailingNewline(out.join('\n'));
}

/** Render symbols as a JSON string. */
export function renderJson(symbols: readonly DocSymbol[]): string {
  return JSON.stringify(symbols, null, 2);
}

const API_SECTION_ORDER: { kinds: readonly DocKind[]; heading: string }[] = [
  { kinds: ['type'], heading: 'Types' },
  { kinds: ['class'], heading: 'Classes' },
  { kinds: ['function'], heading: 'Functions' },
  { kinds: ['const'], heading: 'Constants' },
  { kinds: ['default'], heading: 'Default export' },
];

export interface RenderApiPageOpts {
  /** Repo-root docs frontmatter section */
  section?: string;
  sidebarPosition?: number;
  /** Module-level blurb (first line of file or file-level doc comment) */
  description?: string;
}

/** Escape `<`/`>` in prose so MDX does not treat generics as JSX. */
function escapeMdxProse(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape a string for use inside YAML double-quoted values. */
function escapeYamlDoubleQuoted(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Collapse trailing newlines to exactly one (no regex — avoids ReDoS on `\n` runs). */
function ensureSingleTrailingNewline(text: string): string {
  let end = text.length;
  while (end > 0 && text[end - 1] === '\n') end--;
  return text.slice(0, end) + '\n';
}

/** Render one module page for docs/api/ (ADR-011 website + GitHub). */
export function renderApiPage(
  moduleName: string,
  symbols: readonly DocSymbol[],
  opts: RenderApiPageOpts = {},
): string {
  const section = opts.section ?? 'api';
  const sidebar = opts.sidebarPosition ?? 99;
  const desc = opts.description ?? `API reference for ${moduleName}.`;
  const escapedDesc = escapeYamlDoubleQuoted(escapeMdxProse(desc));

  const lines: string[] = [
    '---',
    `title: ${moduleName}`,
    `sidebar_position: ${sidebar}`,
    `description: "${escapedDesc}"`,
    `section: ${section}`,
    '---',
    '',
    `# ${moduleName}`,
    '',
  ];

  if (opts.description) {
    lines.push(escapeMdxProse(opts.description), '');
  }

  if (symbols.length === 0) {
    lines.push('_No exported symbols._', '');
    return lines.join('\n');
  }

  for (const { kinds, heading } of API_SECTION_ORDER) {
    const group = symbols.filter((s) => kinds.includes(s.kind));
    if (group.length === 0) continue;
    lines.push(`## ${heading}`, '');
    for (const s of group) {
      lines.push(`### \`${s.name}\``, '', '```sjs', s.signature, '```', '');
      if (s.doc?.description) lines.push(escapeMdxProse(s.doc.description), '');
      for (const t of s.doc?.tags ?? []) {
        if (t.tag === 'example') lines.push('**Example**', '', '```sjs', t.value, '```', '');
        else if (t.tag === 'deprecated') lines.push(`> **Deprecated** ${t.value}`.trimEnd(), '');
        else lines.push(`**@${t.tag}** ${t.value}`.trimEnd(), '');
      }
    }
  }

  return ensureSingleTrailingNewline(lines.join('\n'));
}

/** Extract module description from `// @superjs/name — blurb` header line. */
export function moduleDescriptionFromSource(source: string, moduleName: string): string | undefined {
  const header = source.match(new RegExp(`^//\\s*@superjs/${moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*—\\s*(.+)$`, 'm'));
  return header?.[1]?.trim();
}
