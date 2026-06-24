#!/usr/bin/env node
/**
 * sync-api-docs.mjs — regenerate docs/api/*.md from stdlib modules.
 *
 *   node scripts/sync-api-docs.mjs
 *   node scripts/sync-api-docs.mjs --check
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  doc,
  renderApiPage,
  moduleDescriptionFromSource,
} from '../superjs/libs/compiler/dist/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STDLIB_DIR = join(ROOT, 'superjs', 'libs', 'stdlib', 'src', 'modules');
const OUT_DIR = join(ROOT, 'docs', 'api');

function discoverModules() {
  return readdirSync(STDLIB_DIR)
    .filter((f) => f.endsWith('.sjs'))
    .sort()
    .map((f) => ({
      name: f.replace(/\.sjs$/, ''),
      path: join(STDLIB_DIR, f),
    }));
}

function generatePages() {
  const modules = discoverModules();
  const pages = new Map();
  for (let i = 0; i < modules.length; i++) {
    const { name, path } = modules[i];
    const source = readFileSync(path, 'utf8');
    const symbols = doc(source, path);
    const description = moduleDescriptionFromSource(source, name);
    const md = renderApiPage(name, symbols, {
      description,
      sidebarPosition: i + 2,
      section: 'api',
    });
    pages.set(`${name}.md`, md);
  }
  return { modules, pages };
}

function writePages(pages) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [file, content] of pages) {
    writeFileSync(join(OUT_DIR, file), content.endsWith('\n') ? content : `${content}\n`);
  }
  writeIndex(discoverModules().map((m) => m.name));
}

function writeIndex(moduleNames) {
  const rows = moduleNames
    .map((n) => `- [${n}](./${n}.md) — \`@superjs/${n}\``)
    .join('\n');
  const index = `---
title: API Reference
sidebar_position: 1
description: Auto-generated API reference for @superjs/stdlib modules.
section: api
---

# API Reference

Generated from \`superjs/libs/stdlib/src/modules/*.sjs\` via \`superjs docgen\`.

Regenerate:

\`\`\`bash
node scripts/sync-api-docs.mjs
\`\`\`

## Stdlib modules

${rows}

_Last updated: ${new Date().toISOString().slice(0, 10)}._
`;
  writeFileSync(join(OUT_DIR, 'index.md'), index);
}

function checkPages() {
  const { pages } = generatePages();
  let ok = true;
  for (const [file, expected] of pages) {
    const path = join(OUT_DIR, file);
    if (!existsSync(path)) {
      console.error(`Missing ${path} — run: node scripts/sync-api-docs.mjs`);
      ok = false;
      continue;
    }
    const actual = readFileSync(path, 'utf8');
    if (actual !== (expected.endsWith('\n') ? expected : `${expected}\n`)) {
      console.error(`Stale ${path} — run: node scripts/sync-api-docs.mjs`);
      ok = false;
    }
  }
  if (!ok) process.exit(1);
  console.log(`API docs in sync (${pages.size} modules).`);
}

const check = process.argv.includes('--check');
const { modules, pages } = generatePages();
if (modules.length < 11) {
  console.error(`Expected 11 stdlib modules, found ${modules.length}`);
  process.exit(1);
}
if (check) {
  checkPages();
} else {
  writePages(pages);
  console.log(`Synced ${pages.size} API pages to docs/api/`);
}
