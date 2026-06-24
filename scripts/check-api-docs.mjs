#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'sync-api-docs.mjs');
const result = spawnSync(process.execPath, [script, '--check'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
