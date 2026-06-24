#!/usr/bin/env node
/**
 * gen-compat-matrix.mjs
 *
 * Reads STATUS.md frontmatter from each superjs/libs/types-* package and generates:
 *   - docs/compat/matrix.json  (machine-readable rows for the website)
 *   - docs/compat/index.md     (human-readable table for GitHub + search)
 *
 * Run from repo root:
 *   node scripts/gen-compat-matrix.mjs
 *   node scripts/gen-compat-matrix.mjs --check   # exit 1 if outputs are stale
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LIBS_DIR = join(ROOT, 'superjs', 'libs');
const OUT_JSON = join(ROOT, 'docs', 'compat', 'matrix.json');
const OUT_MD = join(ROOT, 'docs', 'compat', 'index.md');

const BEGIN = '<!-- AUTO-GENERATED:BEGIN -->';
const END = '<!-- AUTO-GENERATED:END -->';

const INTRO = `---
title: Compatibility Matrix
sidebar_position: 1
description: Typed SJS wrapper coverage for popular npm packages (@superjs/types-*).
section: compat
---

# Compatibility Matrix

Typed SJS wrappers (\`@superjs/types-*\`) for popular npm packages. Each row reflects
the wrapper's \`STATUS.md\` in \`superjs/libs/types-<pkg>/\`.

**Status:** stable (production-ready), beta (partial coverage), wip (in progress).

Click column headers on [superjs.org](https://superjs.org/docs/compat/index) to sort the table.

`;

const FOOTER = `
> Wave 1 targets backend-first packages. See [WS-B3 spec](../../specs/roadmap/v1.0/WS-B3-types-wrappers.md) for the full list.
`;

/** @param {string} raw */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const block = match[1];
  /** @type {Record<string, string | string[] | boolean>} */
  const data = {};
  let currentKey = null;
  for (const line of block.split('\n')) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && currentKey) {
      const existing = data[currentKey];
      const arr = Array.isArray(existing) ? existing : [];
      arr.push(listItem[1].trim());
      data[currentKey] = arr;
      continue;
    }
    const kv = line.match(/^([a-z0-9-]+):\s*(.*)$/i);
    if (!kv) continue;
    currentKey = kv[1];
    const rawVal = kv[2].trim();
    if (!rawVal) {
      data[currentKey] = [];
      continue;
    }
    if (rawVal === 'true') data[currentKey] = true;
    else if (rawVal === 'false') data[currentKey] = false;
    else if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
      data[currentKey] = rawVal.slice(1, -1);
    } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
      data[currentKey] = rawVal.slice(1, -1);
    } else {
      data[currentKey] = rawVal;
    }
  }
  return data;
}

function discoverStatusFiles() {
  if (!existsSync(LIBS_DIR)) return [];
  return readdirSync(LIBS_DIR)
    .filter((d) => d.startsWith('types-'))
    .map((d) => join(LIBS_DIR, d, 'STATUS.md'))
    .filter((p) => existsSync(p));
}

/** @param {ReturnType<typeof parseFrontmatter>} fm @param {string} dirName */
function rowFromStatus(fm, dirName) {
  const slug = dirName.replace(/^types-/, '');
  const pkg = String(fm.package ?? slug);
  return {
    package: pkg,
    wrapper: `@superjs/types-${slug}`,
    coverage: Number(fm.coverage ?? 0),
    status: String(fm.status ?? 'wip'),
    version: String(fm.version ?? '—'),
    licenseCompat: String(fm['license-compat'] ?? '—'),
    esm: fm.esm === true,
    cjs: fm.cjs === true,
    lastUpdated: String(fm['last-updated'] ?? ''),
    features: Array.isArray(fm.features) ? fm.features : [],
    missing: Array.isArray(fm.missing) ? fm.missing : [],
  };
}

/** @param {ReturnType<typeof rowFromStatus>[]} rows */
function markdownTable(rows) {
  const header =
    '| Package | Wrapper | Coverage | Status | Tested version | ESM | CJS | License |\n' +
    '|---------|---------|----------|--------|----------------|-----|-----|--------|';
  const body = rows
    .map((r) => {
      const cov = r.coverage > 0 ? `${r.coverage}%` : '—';
      const esm = r.esm ? '✓' : '—';
      const cjs = r.cjs ? '✓' : '—';
      return `| ${r.package} | \`${r.wrapper}\` | ${cov} | ${r.status} | ${r.version} | ${esm} | ${cjs} | ${r.licenseCompat} |`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

function buildIndexMarkdown(rows) {
  const generated = markdownTable(rows);
  return `${INTRO}${BEGIN}\n${generated}\n${END}${FOOTER}`;
}

function collectRows() {
  const files = discoverStatusFiles();
  const rows = files.map((filePath) => {
    const dirName = filePath.split('/').slice(-2, -1)[0];
    const raw = readFileSync(filePath, 'utf8');
    return rowFromStatus(parseFrontmatter(raw), dirName);
  });
  rows.sort((a, b) => a.package.localeCompare(b.package));
  return rows;
}

function writeOutputs(rows) {
  const json = {
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    rows,
  };
  writeFileSync(OUT_JSON, `${JSON.stringify(json, null, 2)}\n`);
  writeFileSync(OUT_MD, buildIndexMarkdown(rows));
  console.log(`Generated compat matrix: ${rows.length} packages → docs/compat/`);
}

function checkOutputs(rows) {
  const actualParsed = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
  if (JSON.stringify(actualParsed.rows) !== JSON.stringify(rows)) {
    console.error('docs/compat/matrix.json is stale — run: node scripts/gen-compat-matrix.mjs');
    process.exit(1);
  }

  const expectedMd = buildIndexMarkdown(rows);
  const actualMd = readFileSync(OUT_MD, 'utf8');
  if (actualMd !== expectedMd) {
    console.error('docs/compat/index.md is stale — run: node scripts/gen-compat-matrix.mjs');
    process.exit(1);
  }

  console.log(`Compat matrix outputs are up to date (${rows.length} packages).`);
}

const check = process.argv.includes('--check');
const rows = collectRows();

if (rows.length < 30) {
  console.error(`Expected ≥30 wrapper STATUS.md files, found ${rows.length}`);
  process.exit(1);
}

if (check) {
  if (!existsSync(OUT_JSON) || !existsSync(OUT_MD)) {
    console.error('Compat matrix outputs missing — run: node scripts/gen-compat-matrix.mjs');
    process.exit(1);
  }
  checkOutputs(rows);
} else {
  writeOutputs(rows);
}
