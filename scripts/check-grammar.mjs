#!/usr/bin/env node
/**
 * Grammar smoke test.
 * Parses every .sjs example using the prototype compiler's Babel pipeline.
 * Exit code 0 = all files parse successfully.
 * Exit code 1 = one or more files fail to parse.
 *
 * NOTE: This is a prototype-era smoke test. The Stage 1 parser rewrite will
 * replace this with a grammar-derived parser that enforces SJS-specific syntax
 * (banning `any`, `A & B`, etc.). For now, Babel parse success is the proxy.
 *
 * Known limitations:
 *   - Babel accepts TypeScript syntax including banned SJS features (`any`,
 *     intersection types, conditional types, decorators, etc.).  That is
 *     intentional: the prototype examples pre-date strict SJS enforcement.
 *   - A Stage 1 SJS-aware parser will enforce spec/grammar.ebnf restrictions.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const prototypeDir = join(root, 'prototype');
const examplesDir = join(prototypeDir, 'examples');

// Resolve @babel/parser from the prototype's own node_modules so we don't
// need to install it at the monorepo root.
const require = createRequire(join(prototypeDir, 'package.json'));
const { parse } = require('@babel/parser');

const BABEL_PLUGINS = ['typescript', 'jsx', 'decorators-legacy'];

// Files that use SJS-specific syntax not yet supported by Babel.
// These are EXPECTED failures; they will become passing once the Stage 1
// SJS-native parser (spec/grammar.ebnf-derived) is implemented.
// Format: relative path from repo root -> reason
const KNOWN_FAILURES = new Map([
  ['prototype/examples/node/src/analyzer.sjs',
    'Uses SJS sum-type declaration: type T = Variant(U) | ... (not valid TypeScript)'],
]);

function findSjsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findSjsFiles(full));
    } else if (extname(full) === '.sjs') {
      files.push(full);
    }
  }
  return files;
}

const files = findSjsFiles(examplesDir);
if (files.length === 0) {
  console.error('No .sjs files found under', examplesDir);
  process.exit(1);
}
console.log(`Grammar smoke test: ${files.length} .sjs files\n`);

let failures = 0;
let knownFailures = 0;
for (const file of files) {
  const rel = file.replace(root + '/', '');
  const isKnown = KNOWN_FAILURES.has(rel);
  try {
    const source = readFileSync(file, 'utf8');
    parse(source, { sourceType: 'module', plugins: BABEL_PLUGINS });
    if (isKnown) {
      // Was expected to fail but now passes — a bonus improvement.
      console.log(`  PASS  ${rel}  (was known-failure — update KNOWN_FAILURES)`);
    } else {
      console.log(`  PASS  ${rel}`);
    }
  } catch (/** @type {any} */ e) {
    const msg = e?.message?.split('\n')[0] ?? String(e);
    if (isKnown) {
      console.log(`  SKIP  ${rel}  [known: ${KNOWN_FAILURES.get(rel)}]`);
      knownFailures++;
    } else {
      console.error(`  FAIL  ${rel}`);
      console.error(`        ${msg}`);
      failures++;
    }
  }
}

const passing = files.length - failures - knownFailures;
console.log('');
if (knownFailures > 0) {
  console.log(`SKIP: ${knownFailures} known-failure(s) (SJS-specific syntax, awaiting Stage 1 parser)`);
}
if (failures > 0) {
  console.error(`FAIL: ${failures}/${files.length} unexpected parse failures`);
  process.exit(1);
}
console.log(`OK: ${passing}/${files.length} files parsed successfully (${knownFailures} expected skip)`);
