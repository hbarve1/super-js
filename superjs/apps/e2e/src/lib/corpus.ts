/**
 * Fixture discovery for the end-to-end suite. Resolves paths relative to this
 * module so tests work regardless of the cwd the runner uses.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to `apps/e2e/fixtures`. */
export const FIXTURES_DIR = fileURLToPath(new URL('../../fixtures', import.meta.url));

export interface Fixture {
  /** Path relative to the fixtures dir, e.g. `corpus/basics/hello-world.sjs`. */
  readonly name: string;
  /** Absolute path on disk. */
  readonly path: string;
  readonly source: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.sjs')) out.push(p);
  }
  return out;
}

/** Load every `.sjs` fixture under `fixtures/<subdir>`, sorted by name. */
export function loadFixtures(subdir: string): Fixture[] {
  const root = join(FIXTURES_DIR, subdir);
  return walk(root)
    .sort()
    .map((path) => ({
      name: relative(FIXTURES_DIR, path),
      path,
      source: readFileSync(path, 'utf8'),
    }));
}
