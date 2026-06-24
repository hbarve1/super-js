#!/usr/bin/env node
/**
 * count-dynamic.mjs — count `dynamic` type uses in SJS sources (beta survey C5).
 *
 *   node scripts/count-dynamic.mjs
 *   node scripts/count-dynamic.mjs path/to/project
 *
 * Output: JSON with total LOC, dynamic count, per-kLOC rate, and per-file hits.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? '.';

/** @type {RegExp} Rough match for explicit dynamic types / annotations */
const DYNAMIC_RE = /:\s*dynamic\b|@type\s*\{\s*dynamic\s*\}/g;

function walk(dir, files = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.sjs')) files.push(p);
  }
  return files;
}

function countInFile(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n').length;
  const matches = text.match(DYNAMIC_RE) ?? [];
  return { lines, dynamic: matches.length };
}

const files = walk(root);
let totalLines = 0;
let totalDynamic = 0;
const perFile = [];

for (const f of files) {
  const { lines, dynamic } = countInFile(f);
  totalLines += lines;
  totalDynamic += dynamic;
  if (dynamic > 0) {
    perFile.push({ file: relative(root, f), lines, dynamic });
  }
}

const perKloc = totalLines > 0 ? Math.round((totalDynamic / totalLines) * 1000 * 10) / 10 : 0;

const report = {
  root,
  filesScanned: files.length,
  totalLoc: totalLines,
  dynamicCount: totalDynamic,
  dynamicPerKloc: perKloc,
  filesWithDynamic: perFile.sort((a, b) => b.dynamic - a.dynamic),
};

console.log(JSON.stringify(report, null, 2));
