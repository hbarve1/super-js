/**
 * Content hashing for the incremental cache (stage-1 §M3/M4).
 *
 * Cache key = `(file SHA-256, compiler version, config-hash)` — mtime is
 * deliberately excluded (unreliable on NFS / git checkouts). `apiHash` drives
 * downstream re-checks; `docHash` invalidates doc/LSP caches only.
 */

import { createHash } from 'node:crypto';
import type { CompileOpts } from './options.js';

/** Stable compiler version stamped into every cache key. */
export const COMPILER_VERSION = '0.0.1';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Hash of a single source file's text. */
export function fileHash(source: string): string {
  return sha256(source);
}

/**
 * Canonicalised config hash. Covers only the knobs that change emitted output:
 * variant mode, source-map mode, JSX runtime, strictness. Key order is fixed so
 * the hash is deterministic regardless of caller object shape.
 */
export function configHash(opts: CompileOpts): string {
  const canonical = JSON.stringify({
    variants: opts.variants ?? 'default',
    sourceMap: opts.sourceMap ?? 'external',
    jsx: opts.jsx?.runtime ?? 'automatic',
    strict: opts.strict ?? false,
    selfBootstrap: opts.selfBootstrap ?? false,
  });
  return sha256(canonical);
}

/**
 * `apiHash` = SHA-256 of the module's public surface — its sorted export
 * signatures. Mutating an exported signature changes this; touching a private
 * internal does not, so downstream importers only re-check when the surface
 * actually moves.
 */
export function apiHash(exportSignatures: readonly string[]): string {
  return sha256([...exportSignatures].sort().join('\n'));
}

/**
 * `docHash` = SHA-256 of the file's documentation comments. Changes here
 * invalidate doc-generation and LSP hover caches but never trigger a re-check.
 */
export function docHash(source: string): string {
  // Collect `/** … */` blocks with a linear indexOf scan instead of a regex.
  // Equivalent to the old lazy `/\/\*\*[\s\S]*?\*\//g` (first `*/` closes each
  // block) but with no backtracking — CodeQL-clean, guaranteed O(n).
  const blocks: string[] = [];
  let i = 0;
  for (;;) {
    const start = source.indexOf('/**', i);
    if (start === -1) break;
    const end = source.indexOf('*/', start + 3);
    if (end === -1) break;
    blocks.push(source.slice(start, end + 2));
    i = end + 2;
  }
  return sha256(blocks.join('\n'));
}

/** The full cache key for a file under the current config. */
export function cacheKey(source: string, config: string): string {
  return `${fileHash(source)}:${COMPILER_VERSION}:${config}`;
}
