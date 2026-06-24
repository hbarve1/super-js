#!/usr/bin/env node
/**
 * sync-error-pages.mjs
 *
 * Syncs specs/error-codes/SJS-*.md → docs/error-codes/
 * Adds Starlight-compatible frontmatter (title, description, sidebar.label).
 *
 * Run from repo root:
 *   node scripts/sync-error-pages.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'specs', 'error-codes');
const DEST = join(ROOT, 'docs', 'error-codes');

mkdirSync(DEST, { recursive: true });

const files = readdirSync(SRC).filter(f => /^SJS-[EPLW]\d{3}\.md$/.test(f));

/** Escape a string for use inside YAML single-quoted values. */
function escapeYamlSingleQuoted(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let synced = 0;
for (const file of files) {
  const content = readFileSync(join(SRC, file), 'utf8');
  const code = file.replace('.md', '');

  // Extract title from first heading
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch?.[1] ?? code;
  const escapedTitle = escapeYamlSingleQuoted(title);

  // Strip the first heading — frontmatter title replaces it
  const bodyWithoutH1 = content.replace(/^# .+\n/, '');

  const withFrontmatter = [
    '---',
    `title: '${escapedTitle}'`,
    `description: '${code} diagnostic reference'`,
    `sidebar_position: 99`,
    `section: error-codes`,
    `error_code: '${code}'`,
    '---',
    '',
    bodyWithoutH1,
  ].join('\n');

  writeFileSync(join(DEST, file), withFrontmatter);
  synced++;
}

console.log(`Synced ${synced} error-code pages to docs/error-codes/.`);
