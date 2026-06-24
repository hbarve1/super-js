#!/usr/bin/env node
/**
 * check-playground-worker.mjs — CI gate: playground-worker must bundle via wrangler.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUPERJS = join(ROOT, 'superjs');
const WORKER = join(SUPERJS, 'apps/playground-worker');

execSync('pnpm nx build compiler', { cwd: SUPERJS, stdio: 'inherit' });
const out = execSync('pnpm exec wrangler deploy --dry-run', {
  cwd: WORKER,
  encoding: 'utf8',
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});

if (!/Total Upload:/i.test(out)) {
  console.error('wrangler dry-run did not report bundle size');
  process.exit(1);
}

console.log('playground-worker bundle OK');
