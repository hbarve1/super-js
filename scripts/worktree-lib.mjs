#!/usr/bin/env node
/**
 * Shared helpers for v1.0 worktree scripts.
 * Usage: node scripts/worktree-lib.mjs <command> [args]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, '..');
export const MANIFEST_PATH = join(REPO_ROOT, 'specs/roadmap/v1.0/manifest.json');

export function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

export function getWorkstream(manifest, id) {
  const key = id.toUpperCase().replace(/^WS-?/, 'WS-').replace(/^WS-([^A-Z0-9])/, 'WS-$1');
  const normalized = id.startsWith('WS-') ? id : `WS-${id}`;
  const ws = manifest.workstreams[normalized];
  if (!ws) {
    const keys = Object.keys(manifest.workstreams).join(', ');
    throw new Error(`Unknown workstream "${id}". Known: ${keys}`);
  }
  return { id: normalized, ...ws };
}

export function branchToDir(branch) {
  return branch.replace(/\//g, '-');
}

if (process.argv[1]?.endsWith('worktree-lib.mjs')) {
  const [, , cmd, arg] = process.argv;
  const m = loadManifest();
  if (cmd === 'get') {
    const ws = getWorkstream(m, arg);
    console.log(JSON.stringify(ws, null, 2));
  } else if (cmd === 'list') {
    for (const [id, ws] of Object.entries(m.workstreams)) {
      console.log(`${id}\t${ws.branch}\t${ws.status}\twave=${ws.wave}`);
    }
  } else {
    console.error('Usage: worktree-lib.mjs get|list <WS-ID>');
    process.exit(1);
  }
}
