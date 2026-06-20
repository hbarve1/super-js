#!/usr/bin/env node
/**
 * CI gate: every SJS diagnostic code emitted under superjs/libs must have a
 * reference page in specs/error-codes/SJS-XXXX.md.
 */
import { readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IGNORE = new Set(['SJS-E404', 'SJS-E999']);

const output = execSync(
  `grep -roh 'SJS-[EPLW][0-9]\\{3\\}' superjs/libs --include='*.ts'`,
  { encoding: 'utf8', cwd: ROOT },
);

const emitted = new Set(
  output.trim().split('\n').filter(Boolean).map((c) => c.trim()).filter((c) => !IGNORE.has(c)),
);

const existing = new Set(
  readdirSync(join(ROOT, 'specs/error-codes'))
    .filter((f) => /^SJS-[EPLW]\d{3}\.md$/.test(f))
    .map((f) => f.replace('.md', '')),
);

const missing = [...emitted].filter((c) => !existing.has(c)).sort();
if (missing.length > 0) {
  console.error('Missing error-code pages:', missing.join(', '));
  process.exit(1);
}
console.log(`All ${emitted.size} emitted error codes have pages.`);
