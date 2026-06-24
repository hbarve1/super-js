#!/usr/bin/env node
/**
 * CI gate: compat matrix outputs must match types wrapper STATUS.md frontmatter.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'gen-compat-matrix.mjs');
const result = spawnSync(process.execPath, [script, '--check'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
