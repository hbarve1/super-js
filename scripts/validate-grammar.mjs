#!/usr/bin/env node
/**
 * validate-grammar.mjs — CI gate for specs/grammar.ebnf (WS-A1).
 * - Asserts file exists and meets minimum size
 * - Asserts required SJS productions are present
 * - Runs parser test suite as a fixture gate
 * Run: node scripts/validate-grammar.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRAMMAR = join(ROOT, 'specs/grammar.ebnf');

const REQUIRED_PRODUCTIONS = [
  '<Program>',
  '<MatchExpression>',
  '<TypeDecl>',
  '<SumTypeDef>',
  '<ImportDecl>',
  '<ExportDecl>',
  '<JsxElement>',
  '<Identifier>',
];

if (!existsSync(GRAMMAR)) {
  console.error('Missing specs/grammar.ebnf');
  process.exit(1);
}

const raw = readFileSync(GRAMMAR, 'utf8');
const lines = raw.split('\n').length;

if (lines < 100) {
  console.error(`grammar.ebnf too short (${lines} lines)`);
  process.exit(1);
}

const rules = raw.split('\n').filter((l) => l.includes('::='));
if (rules.length < 20) {
  console.error(`Expected >= 20 ::= rules, found ${rules.length}`);
  process.exit(1);
}

for (const prod of REQUIRED_PRODUCTIONS) {
  if (!raw.includes(prod)) {
    console.error(`Missing required production: ${prod}`);
    process.exit(1);
  }
}

// Parser tests exercise the real grammar implementation
try {
  execSync('pnpm nx test parser --skip-nx-cache', {
    cwd: join(ROOT, 'superjs'),
    stdio: 'pipe',
    encoding: 'utf8',
  });
} catch (e) {
  const out = e.stdout?.toString() ?? e.stderr?.toString() ?? String(e);
  console.error('Parser test suite failed (grammar fixture gate):\n', out.slice(-2000));
  process.exit(1);
}

console.log(`grammar.ebnf OK (${lines} lines, ${rules.length} rules, parser tests pass)`);
