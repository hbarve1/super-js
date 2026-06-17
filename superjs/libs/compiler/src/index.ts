/**
 * `@superjs/compiler` (Tier 3) — the public compiler API.
 *
 * Assembles Tiers 1–2 (parser, checker, ir, codegen-js) into the frozen surface
 * that Stages 2–5 (interop, LSP, stdlib, build plugins) depend on:
 * `compile`, `transform`, `typeAt`, `symbolAt`, `diagnosticsFor`,
 * `parseTypeDecl`, `emitTypeDecl`.
 */

import type { Type, Diagnostic } from '@superjs/types';
import { Compiler } from './lib/compiler.js';
import type { CompileOpts, SymbolInfo } from './lib/options.js';

export { Compiler, compile, transform, offsetAt } from './lib/compiler.js';
export { parseTypeDecl, emitTypeDecl, type TypeDeclAst } from './lib/type-decl.js';
export { format, type FormatResult } from './lib/format.js';
export { lint } from './lib/lint.js';
export {
  doc, renderMarkdown, renderJson,
  type DocSymbol, type DocComment, type DocTag, type DocKind,
} from './lib/doc.js';
export {
  COMPILER_VERSION, sha256, fileHash, configHash, apiHash, docHash, cacheKey,
} from './lib/hash.js';
export type {
  SourceFile, CompileOpts, TransformOpts, CompiledOutput, CompileResult,
  TransformResult, SymbolInfo, CacheStore, CacheEntry,
} from './lib/options.js';

/**
 * A process-wide session backing the stateless LSP queries below. An editor
 * opens files into it via {@link openFile}; `typeAt`/`symbolAt`/`diagnosticsFor`
 * then resolve against the cached analysis (the Stage-3 LSP contract).
 */
let defaultSession = new Compiler();

/** Reset the default session, optionally under new compile options. */
export function configureSession(opts: CompileOpts = {}): void {
  defaultSession = new Compiler(opts);
}

/** Open (or update) a file in the default session. */
export function openFile(filename: string, source: string): void {
  defaultSession.setFile(filename, source);
}

/** Close a file in the default session. */
export function closeFile(filename: string): void {
  defaultSession.removeFile(filename);
}

/** Type at a position — `null` if the file is not open or no node is there. */
export function typeAt(file: string, line: number, col: number): Type | null {
  return defaultSession.typeAt(file, line, col);
}

/** Symbol (go-to-definition) at a position. */
export function symbolAt(file: string, line: number, col: number): SymbolInfo | null {
  return defaultSession.symbolAt(file, line, col);
}

/** Cached diagnostics for an open file. */
export function diagnosticsFor(file: string): Diagnostic[] {
  return defaultSession.diagnosticsFor(file);
}
