/**
 * Fixture loading. Walks a directory for `.sjs` (or any-extension) files and
 * returns their text, so suites across the workspace share one loader instead
 * of re-implementing `readdirSync` recursion.
 */

import { readdirSync, lstatSync, readFileSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

export interface Fixture {
  /** Path relative to the root passed to {@link loadFixtures}. */
  readonly name: string;
  readonly path: string;
  readonly source: string;
}

/**
 * Recursively collect file paths under `dir` matching `ext` (default `.sjs`).
 * Symlinks are skipped (via `lstatSync`) so a link cycle can't cause infinite
 * recursion.
 */
export function findFixtures(dir: string, ext = '.sjs'): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stats = lstatSync(p);
    if (stats.isSymbolicLink()) continue;
    if (stats.isDirectory()) out.push(...findFixtures(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

/** Load every fixture under `root`, names relative to `root`, sorted. */
export function loadFixtures(root: string, ext = '.sjs'): Fixture[] {
  return findFixtures(root, ext).map((path) => ({
    name: relative(root, path),
    path,
    source: readFileSync(path, 'utf8'),
  }));
}

/**
 * Load a single fixture file. With no root to relativise against, `name` is the
 * file's basename (whereas {@link loadFixtures} names entries relative to its
 * root).
 */
export function loadFixture(path: string): Fixture {
  return { name: basename(path), path, source: readFileSync(path, 'utf8') };
}
