#!/usr/bin/env node
/**
 * gen-bench-corpus.mjs
 *
 * Generates ~10k LOC SJS + equivalent TS corpora for scripts/bench.mjs.
 *
 *   node scripts/gen-bench-corpus.mjs
 *   node scripts/gen-bench-corpus.mjs --loc=10000
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'benchmarks');

/** @param {number} targetLoc */
export function genSjsCorpus(targetLoc) {
  const lines = [];
  const blockLines = 10;
  const fns = Math.max(1, Math.floor(targetLoc / blockLines));
  for (let i = 0; i < fns; i++) {
    lines.push(
      `export function fn${i}(x: number, y: string): string {`,
      `  if (x > 0) return y + "${i}"`,
      `  return "neg_${i}"`,
      `}`,
      ``,
      `export type Tag${i} = A${i}(string) | B${i}(number)`,
      ``,
      `export function handle${i}(t: Tag${i}): string {`,
      `  match t {`,
      `    A${i}(s) => s,`,
      `    B${i}(n) => n.toString(),`,
      `  }`,
      `}`,
      ``,
    );
  }
  return lines.join('\n');
}

/** TypeScript baseline — same control flow without SJS-only syntax. */
export function genTsCorpus(targetLoc) {
  const lines = [];
  const blockLines = 6;
  const fns = Math.max(1, Math.floor(targetLoc / blockLines));
  for (let i = 0; i < fns; i++) {
    lines.push(
      `export function fn${i}(x: number, y: string): string {`,
      `  if (x > 0) return y + "${i}";`,
      `  return "neg_${i}";`,
      `}`,
      ``,
      `export function handle${i}(t: { kind: "a"; s: string } | { kind: "b"; n: number }): string {`,
      `  if (t.kind === "a") return t.s;`,
      `  return t.n.toString();`,
      `}`,
      ``,
    );
  }
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('gen-bench-corpus.mjs')) {
  const locArg = process.argv.find((a) => a.startsWith('--loc='));
  const loc = locArg ? Number(locArg.split('=')[1]) : 10_000;
  mkdirSync(OUT_DIR, { recursive: true });
  const sjs = genSjsCorpus(loc);
  const ts = genTsCorpus(loc);
  writeFileSync(join(OUT_DIR, 'corpus-10k.sjs'), sjs);
  writeFileSync(join(OUT_DIR, 'corpus-10k.ts'), ts);
  const sjsLoc = sjs.split('\n').length;
  const tsLoc = ts.split('\n').length;
  console.log(`Wrote benchmarks/corpus-10k.sjs (${sjsLoc} lines)`);
  console.log(`Wrote benchmarks/corpus-10k.ts (${tsLoc} lines)`);
}
