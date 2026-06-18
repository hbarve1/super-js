/**
 * `@superjs/build-plugins` — build-tool integrations for `.sjs`.
 *
 * Maps to the published packages `@superjs/vite-plugin`,
 * `@superjs/esbuild-plugin`, `@superjs/jest-transform`, and
 * `@superjs/vitest-transform`. All are thin adapters over the compiler's
 * `transform()`.
 */

export {
  transformSjs, vitePlugin, vitestPlugin, esbuildPlugin, jestTransform,
  type TransformOutput, type VitePluginLike, type EsbuildPluginLike, type JestTransformerLike,
} from './lib/plugins.js';
