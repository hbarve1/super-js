/**
 * Public option + result shapes for the `@superjs/compiler` API
 * (stage-1-compiler-core.md §API Contract). Frozen surface — Stages 2–5 build
 * on these types.
 */

import type { Diagnostic, Type } from '@superjs/types';
import type { SourceMap } from '@superjs/codegen-js';

/** A source file fed to {@link compile}. */
export interface SourceFile {
  readonly filename: string;
  readonly source: string;
}

export interface CompileOpts {
  /** Layer-0 types are built-in; do not resolve `@superjs/std/core`. */
  readonly selfBootstrap?: boolean;
  /** Sum-type representation. `default` = tagged objects; `classes` = class encoding. */
  readonly variants?: 'default' | 'classes';
  /** Source-map emission mode. */
  readonly sourceMap?: 'none' | 'inline' | 'external';
  /** Promote warnings to errors (parser + checker strict mode). */
  readonly strict?: boolean;
  readonly jsx?: { readonly runtime: 'automatic' | 'classic' };
  /**
   * Bare-specifier → target-directory map (from `superjs.config.json` `paths`).
   * Each target holds an `index.d.sjs` (or `index.sjs`); resolution reads it via
   * {@link CompileOpts.readFile}. E.g. `{ "fastify": ["node_modules/@superjs/types/fastify"] }`.
   */
  readonly paths?: Readonly<Record<string, readonly string[]>>;
  /** Base directory `paths` targets resolve against (default `'.'`). */
  readonly rootDir?: string;
  /**
   * Read a dependency file off disk during import resolution (`.d.sjs` / `.sjs`
   * not passed to `compile`). Returns `undefined` when absent. Without this seam
   * only in-session + relative imports resolve; bare specifiers stay `dynamic`.
   */
  readonly readFile?: (absolutePath: string) => string | undefined;
}

/** Subset of {@link CompileOpts} safe for single-file in-memory transforms. */
export interface TransformOpts {
  readonly sourceMap?: 'none' | 'inline' | 'external';
  readonly jsx?: { readonly runtime: 'automatic' | 'classic' };
  readonly strict?: boolean;
}

export interface CompiledOutput {
  readonly code: string;
  readonly map: SourceMap;
}

export interface CompileResult {
  /** Output filename (`<name>.js`) → emitted code + map. */
  readonly outputs: Map<string, CompiledOutput>;
  readonly diagnostics: Diagnostic[];
}

export interface TransformResult {
  readonly code: string;
  readonly map: SourceMap;
  readonly diagnostics: Diagnostic[];
}

/** A cached build product for one file, keyed by `cacheKey(source, configHash)`. */
export interface CacheEntry {
  readonly code: string;
  readonly map: SourceMap;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Persistent build cache. Injected (so the Tier-3 compiler stays filesystem-free);
 * the CLI supplies a disk-backed implementation. A hit skips parse/check/lower/
 * generate entirely — so a cached file carries no in-memory `program`/`types`
 * (LSP sessions run without a cache and re-analyse).
 */
export interface CacheStore {
  get(key: string): CacheEntry | undefined;
  set(key: string, entry: CacheEntry): void;
}

/** Result of a go-to-definition query ({@link symbolAt}). */
export interface SymbolInfo {
  readonly name: string;
  /** Binding flavour at the declaration site. */
  readonly kind: 'const' | 'let' | 'var' | 'function' | 'class' | 'interface' | 'type' | 'param';
  /** The declaration's source span, or null when the symbol is a library global. */
  readonly declaration: import('@superjs/types').Span | null;
  /** The symbol's type, when known. */
  readonly type: Type | null;
}
