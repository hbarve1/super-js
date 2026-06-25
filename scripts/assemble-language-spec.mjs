#!/usr/bin/env node
/**
 * assemble-language-spec.mjs — build specs/language.md from specs/language/*.md (WS-A1).
 * Run: node scripts/assemble-language-spec.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANG_DIR = join(ROOT, 'specs/language');
const OUT = join(ROOT, 'specs/language.md');
const GRAMMAR = 'specs/grammar.ebnf';
const ERROR_REGISTRY = 'specs/error-codes.md';

/** v1.0 freeze date — update only when deliberately re-freezing the spec. */
const FROZEN_DATE = '2026-06-24';

/** Chapters: title + ordered source files (relative to specs/language/). */
const CHAPTERS = [
  {
    id: '1-lexical-structure',
    title: '1. Lexical structure',
    files: ['lexical.md', '000-keywords.md'],
    grammar: '§ Identifiers and Keywords, § Literals',
    errors: 'SJS-P001–SJS-P005',
  },
  {
    id: '2-syntax',
    title: '2. Syntax',
    files: [
      'syntax.md',
      '020-variables.md',
      '021-functions.md',
      '022-classes.md',
      '023-modules.md',
      '030-operators.md',
      '031-optional-chaining.md',
      '032-nullish-coalesce.md',
      '033-logical-assignment.md',
      '034-destructuring.md',
      '035-spread-rest.md',
      '036-template-literals.md',
      '037-async-await.md',
      '038-generators.md',
      '039-jsx.md',
      '040-control-flow.md',
      '041-try-catch.md',
      '042-for-of-for-in.md',
    ],
    grammar: '<Program>, <Statement>, <Expression> productions',
    errors: 'SJS-P*, SJS-E013–SJS-E018',
  },
  {
    id: '3-type-system',
    title: '3. Type system',
    files: [
      '001-null-safety.md',
      '002-sum-types.md',
      '003-match.md',
      '004-dynamic.md',
      '005-generics.md',
      '006-interfaces.md',
      '007-banned-features.md',
      '008-access-modifiers.md',
      '010-primitives.md',
      '011-union-types.md',
      '012-array-types.md',
      '013-function-types.md',
      '014-object-types.md',
      '015-type-inference.md',
      '016-type-narrowing.md',
    ],
    grammar: '<Type>, <TypeDecl>, <SumTypeDef>, <MatchExpression>',
    errors: 'SJS-E001–SJS-E012, SJS-E020, SJS-W001–SJS-W010',
  },
  {
    id: '4-codegen-semantics',
    title: '4. Code generation semantics',
    files: [
      '050-js-lowering.md',
      '051-llvm-lowering.md',
      '052-sum-type-encoding.md',
      '053-match-lowering.md',
      '054-source-maps.md',
    ],
    grammar: 'N/A (lowering rules)',
    errors: 'emit-time diagnostics only',
  },
  {
    id: '5-cli-surface',
    title: '5. CLI surface',
    files: ['cli-surface.md'],
    grammar: 'N/A',
    errors: 'CLI exit codes; compiler diagnostics',
  },
  {
    id: '6-incremental-model',
    title: '6. Incremental compilation model',
    files: ['incremental-model.md'],
    grammar: 'N/A',
    errors: 'N/A',
  },
  {
    id: '7-interop',
    title: '7. Interop with TypeScript',
    files: ['interop.md'],
    grammar: 'N/A',
    errors: 'SJS-W001, SJS-W002, SJS-E002',
  },
  {
    id: '8-tooling-surface',
    title: '8. Tooling surface',
    files: ['009-tooling-surface.md'],
    grammar: 'N/A',
    errors: 'SJS-L001–SJS-L018, SJS-F*',
  },
  {
    id: '9-stdlib',
    title: '9. Standard library',
    files: ['stdlib-surface.md'],
    grammar: 'N/A',
    errors: 'SJS-L016 (unhandled Result)',
  },
  {
    id: '10-build-tools',
    title: '10. Build tool integration',
    files: ['build-tool-integration.md'],
    grammar: 'N/A',
    errors: 'compiler diagnostics in host overlay',
  },
  {
    id: 'appendix-diagnostics',
    title: 'Appendix A. Diagnostic codes map',
    files: ['060-error-codes-map.md'],
    grammar: 'N/A',
    errors: 'full registry — see specs/error-codes.md',
  },
];

function readSection(file) {
  const path = join(LANG_DIR, file);
  if (!existsSync(path)) {
    console.warn(`WARN: missing section ${file}`);
    return `<!-- MISSING: ${file} -->\n`;
  }
  return readFileSync(path, 'utf8').trim() + '\n';
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const toc = CHAPTERS.map((ch) => `- [${ch.title}](#${ch.id})`).join('\n');

const parts = [
  '# SuperJS Language Specification',
  '',
  '**Version:** 1.0  ',
  '**Status:** FROZEN  ',
  `**Frozen:** ${FROZEN_DATE}  `,
  '',
  '> This document is the canonical language reference for SuperJS 1.0.',
  '> It was assembled from per-feature sections authored across Stages 1–5',
  '> and frozen at v1.0. Changes after this point require a "spec exception"',
  '> (written approval from all maintainers) plus an RFC for v1.1+.',
  '> See [docs/deprecation.md](../docs/deprecation.md) for the stability policy.',
  '',
  '**Grammar:** [`specs/grammar.ebnf`](./grammar.ebnf)  ',
  '**Error registry:** [`specs/error-codes.md`](./error-codes.md)  ',
  '',
  '---',
  '',
  '## Table of Contents',
  '',
  toc,
  '',
  '---',
  '',
];

for (const ch of CHAPTERS) {
  parts.push(`## ${ch.title} {#${ch.id}}`, '');
  parts.push(
    `> **Grammar:** ${ch.grammar} — see [\`${GRAMMAR}\`](./grammar.ebnf)  `,
    `> **Errors:** ${ch.errors} — see [\`${ERROR_REGISTRY}\`](./error-codes.md)`,
    '',
  );
  for (const file of ch.files) {
    const content = readSection(file);
    parts.push(content);
    parts.push('');
  }
  parts.push('---', '');
}

const body = parts.join('\n');
writeFileSync(OUT, body, 'utf8');
const lines = body.split('\n').length;
console.log(`Wrote ${OUT} (${lines} lines)`);
if (lines < 800) {
  console.warn(`WARN: assembled spec is ${lines} lines (target ~800+ for v1.0)`);
}
