/**
 * Build-tool integrations for `.sjs` — thin adapters over the compiler's
 * `transform()`. One lib here; these map to the separately-published packages
 * `@superjs/vite-plugin`, `@superjs/esbuild-plugin`, `@superjs/jest-transform`,
 * and `@superjs/vitest-transform` (Vitest reuses the Vite plugin).
 *
 * The host build tools (Vite, esbuild, Jest) are NOT imported — the returned
 * objects are structurally typed to each host's plugin interface, so this lib
 * depends only on `@superjs/compiler` and the hosts stay peer concerns.
 */

import { transform } from '@superjs/compiler';

const SJS = /\.sjs$/;

export interface TransformOutput { code: string; map: unknown; }

/** Compile one `.sjs` source to JS + source map (the shared core). */
export async function transformSjs(code: string, id: string): Promise<TransformOutput> {
  const r = await transform(code, id, { sourceMap: 'external' });
  return { code: r.code, map: r.map };
}

// ── Vite (and Vitest, which runs on Vite) ────────────────────────────────────

export interface VitePluginLike {
  name: string;
  enforce: 'pre';
  transform(code: string, id: string): Promise<TransformOutput | null>;
}

/** A Vite plugin that compiles `.sjs` modules. Also valid as a Vitest plugin. */
export function vitePlugin(): VitePluginLike {
  return {
    name: 'superjs',
    enforce: 'pre',
    async transform(code, id) {
      if (!SJS.test(id)) return null;
      return transformSjs(code, id);
    },
  };
}

/** Vitest reuses the Vite plugin (Vitest is Vite-based). */
export const vitestPlugin = vitePlugin;

// ── esbuild ──────────────────────────────────────────────────────────────────

export interface EsbuildPluginLike {
  name: string;
  setup(build: {
    onLoad(
      opts: { filter: RegExp },
      cb: (args: { path: string }) => Promise<{ contents: string; loader: 'js' }>,
    ): void;
  }): void;
}

/** An esbuild plugin that loads and compiles `.sjs` files. */
export function esbuildPlugin(): EsbuildPluginLike {
  return {
    name: 'superjs',
    setup(build) {
      build.onLoad({ filter: SJS }, async (args) => {
        const { readFile } = await import('node:fs/promises');
        const source = await readFile(args.path, 'utf8');
        const { code } = await transformSjs(source, args.path);
        return { contents: code, loader: 'js' };
      });
    },
  };
}

// ── Jest / Vitest transformer ────────────────────────────────────────────────

export interface JestTransformerLike {
  processAsync(source: string, filename: string): Promise<{ code: string; map: unknown }>;
}

/** A Jest async transformer for `.sjs` test files. */
export const jestTransform: JestTransformerLike = {
  async processAsync(source, filename) {
    return transformSjs(source, filename);
  },
};
