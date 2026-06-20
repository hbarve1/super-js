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

/** Load and parse the v1.0 workstream manifest from disk. */
export function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

/**
 * Resolve a workstream by ID (case-insensitive, optional `WS-` prefix).
 * @param {ReturnType<typeof loadManifest>} manifest
 * @param {string} id e.g. `WS-A8`, `ws-a8`, or `A8`
 */
export function getWorkstream(manifest, id) {
  const normalized = id.toUpperCase().replace(/^WS-?/, 'WS-');
  const ws = manifest.workstreams[normalized];
  if (!ws) {
    const keys = Object.keys(manifest.workstreams).join(', ');
    throw new Error(`Unknown workstream "${id}". Known: ${keys}`);
  }
  return { id: normalized, ...ws };
}

/** Map a git branch name to a worktree directory slug (`/` → `-`). */
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
