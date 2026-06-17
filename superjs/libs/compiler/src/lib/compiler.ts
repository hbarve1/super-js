/**
 * `@superjs/compiler` — Tier 3 public assembly of the pipeline.
 *
 * Wires parse → check → lower → generate into one API and owns the incremental
 * cache (`apiHash`/`docHash`, key = file SHA-256 × version × config-hash). The
 * stages below it (lexer…codegen) hold the algorithms; this layer is pure
 * orchestration plus the LSP/interop query surface (`typeAt`, `symbolAt`,
 * `diagnosticsFor`, `parseTypeDecl`, `emitTypeDecl`).
 */

import type { Program, Diagnostic, Type, Span, Identifier } from '@superjs/types';
import { parse } from '@superjs/parser';
import { checkProgram, type TypedSpan, type ModuleSurface } from '@superjs/checker';
import { lower } from '@superjs/ir';
import { generate } from '@superjs/codegen-js';
import {
  type CompileOpts, type CompileResult, type CompiledOutput, type SourceFile,
  type TransformOpts, type TransformResult, type SymbolInfo, type CacheStore,
} from './options.js';
import { apiHash, docHash, configHash, fileHash, cacheKey } from './hash.js';

/** Placeholder program for cache-hit files (no AST is reconstructed). */
const EMPTY_PROGRAM: Program = {
  kind: 'Program',
  body: [],
  span: { start: { offset: 0, line: 1, column: 0 }, end: { offset: 0, line: 1, column: 0 } },
};

/** Empty export surface for persistent-cache hits (which carry no analysis). */
const EMPTY_SURFACE: ModuleSurface = { types: new Map(), sums: new Map(), values: new Map() };

/** Everything the compiler derives and caches for one source file. */
interface FileState {
  readonly source: string;
  readonly program: Program;
  readonly diagnostics: Diagnostic[];
  readonly types: readonly TypedSpan[];
  readonly output: CompiledOutput;
  readonly fileHash: string;
  readonly apiHash: string;
  readonly docHash: string;
  /** Exported type + value surface, for files that import this one. */
  readonly surface: ModuleSurface;
}

/**
 * A compiler session. Holds an in-memory workspace of analysed files with an
 * incremental cache: re-`setFile`-ing identical content under an unchanged
 * config returns the cached analysis instead of recompiling.
 */
export class Compiler {
  private readonly files = new Map<string, FileState>();
  /** Raw sources by filename — lets import resolution analyse a dependency on demand. */
  private readonly rawSources = new Map<string, string>();
  /** Off-session dependency files (disk-resolved `.d.sjs`/`.sjs`) — analysed but never emitted. */
  private readonly deps = new Map<string, FileState>();
  /** Files currently mid-analysis, to break import cycles (cycle → dynamic). */
  private readonly analysing = new Set<string>();
  private readonly opts: CompileOpts;
  private readonly cfgHash: string;
  private readonly cache: CacheStore | undefined;

  constructor(opts: CompileOpts = {}, cache?: CacheStore) {
    this.opts = opts;
    this.cfgHash = configHash(opts);
    this.cache = cache;
  }

  /** Register a file's source without analysing it — so imports can find it later. */
  addSource(filename: string, source: string): void {
    this.rawSources.set(filename, source);
  }

  /** The config-hash component of this session's cache key. */
  get configHash(): string {
    return this.cfgHash;
  }

  /** Analyse + cache a file. No-op recompute when content + config are unchanged. */
  setFile(filename: string, source: string): FileState {
    this.rawSources.set(filename, source);
    const cached = this.files.get(filename);
    if (cached && cached.fileHash === fileHash(source)) return cached;
    const state = this.analyse(filename, source);
    this.files.set(filename, state);
    return state;
  }

  /** Drop a file from the session. */
  removeFile(filename: string): void {
    this.files.delete(filename);
    this.rawSources.delete(filename);
  }

  /**
   * Resolve a module specifier to the imported file's export surface, analysing
   * that dependency on demand. Relative (`./`, `../`) specifiers resolve against
   * the importer's directory; bare specifiers resolve through the config `paths`
   * map. Sources come from the in-session set or, failing that, the {@link
   * CompileOpts.readFile} disk seam. Unknown specifiers return `undefined`
   * (imported names stay `dynamic`); import cycles are broken by returning
   * `undefined` for a file already mid-analysis.
   */
  private resolveSurface(fromFile: string, specifier: string): ModuleSurface | undefined {
    const candidates = specifier.startsWith('./') || specifier.startsWith('../')
      ? [resolveRelative(fromFile, specifier)]
      : this.bareCandidates(specifier);

    for (const dep of candidates) {
      const known = this.files.get(dep) ?? this.deps.get(dep);
      if (known) return known.surface;
      if (this.analysing.has(dep)) continue; // cycle — try next candidate, else dynamic

      const inSession = this.rawSources.has(dep);
      const src = inSession ? this.rawSources.get(dep)! : this.opts.readFile?.(dep);
      if (src === undefined) continue; // not this candidate — try the next

      this.analysing.add(dep);
      try {
        const state = this.analyse(dep, src, /*skipCache*/ true);
        // In-session files are primary (emitted); disk-loaded deps are types-only.
        (inSession ? this.files : this.deps).set(dep, state);
        return state.surface;
      } finally {
        this.analysing.delete(dep);
      }
    }
    return undefined;
  }

  /**
   * Candidate declaration files for a bare specifier mapped through config
   * `paths`. The target is a directory; its entry is `index.d.sjs`, falling back
   * to `index.sjs`. Empty when the specifier isn't mapped.
   */
  private bareCandidates(specifier: string): string[] {
    const target = this.opts.paths?.[specifier]?.[0];
    if (!target) return [];
    const base = `${this.opts.rootDir ?? '.'}/${target}/_`;
    return [resolveRelative(base, './index.d.sjs'), resolveRelative(base, './index.sjs')];
  }

  private analyse(filename: string, source: string, skipCache = false): FileState {
    // Persistent-cache hit: skip the whole pipeline. The cached file carries no
    // program/types — fine for builds; LSP sessions run without a cache. A file
    // pulled in as an import dependency skips the cache so its surface is real.
    const key = cacheKey(source, this.cfgHash);
    const hit = skipCache ? undefined : this.cache?.get(key);
    if (hit) {
      return {
        source, program: EMPTY_PROGRAM, diagnostics: [...hit.diagnostics], types: [],
        output: { code: hit.code, map: hit.map },
        fileHash: fileHash(source), apiHash: '', docHash: '', surface: EMPTY_SURFACE,
      };
    }
    const parsed = parse(source, { file: filename, strict: this.opts.strict });
    const checked = checkProgram(parsed.program, {
      file: filename, strict: this.opts.strict, recordTypes: true,
      resolveModule: (spec) => this.resolveSurface(filename, spec),
    });
    const ir = lower(parsed.program);
    const outName = outputName(filename);
    const gen = generate(ir, {
      // `file` / sourceMappingURL must be the bare output name so the footer
      // resolves next to the emitted `.js`, not against an absolute input path.
      file: baseName(outName),
      source: baseName(filename),
      inlineMapUrl: this.opts.sourceMap !== 'none',
    });
    const diagnostics = [...parsed.diagnostics, ...checked.diagnostics];
    this.cache?.set(key, { code: gen.code, map: gen.map, diagnostics });
    return {
      source,
      program: parsed.program,
      diagnostics,
      types: checked.types,
      output: { code: gen.code, map: gen.map },
      fileHash: fileHash(source),
      apiHash: apiHash(exportSignatures(parsed.program)),
      docHash: docHash(source),
      surface: checked.surface,
    };
  }

  /** Compile the current workspace (or a given set) to outputs + diagnostics. */
  compileAll(): CompileResult {
    const outputs = new Map<string, CompiledOutput>();
    const diagnostics: Diagnostic[] = [];
    for (const [filename, state] of this.files) {
      outputs.set(outputName(filename), state.output);
      diagnostics.push(...state.diagnostics);
    }
    return { outputs, diagnostics };
  }

  /** Cached diagnostics for one file (recomputes if absent). */
  diagnosticsFor(filename: string): Diagnostic[] {
    return this.files.get(filename)?.diagnostics ?? [];
  }

  /** Smallest enclosing synthesized type at a 1-based line / 0-based column. */
  typeAt(filename: string, line: number, column: number): Type | null {
    const state = this.files.get(filename);
    if (!state) return null;
    const off = offsetAt(state.source, line, column);
    if (off === null) return null;
    let best: TypedSpan | null = null;
    for (const entry of state.types) {
      if (!spanCoversOffset(entry.span, off)) continue;
      if (!best || spanWidth(entry.span) < spanWidth(best.span)) best = entry;
    }
    return best?.type ?? null;
  }

  /** Go-to-definition: resolve the identifier under the cursor to its declaration. */
  symbolAt(filename: string, line: number, column: number): SymbolInfo | null {
    const state = this.files.get(filename);
    if (!state) return null;
    const off = offsetAt(state.source, line, column);
    if (off === null) return null;

    const ident = smallestIdentifierAt(state.program, off);
    if (!ident) return null;
    const decls = collectDeclarations(state.program);

    // Nearest declaration of this name at or before the use; else first in file.
    let chosen: DeclRecord | null = null;
    for (const d of decls) {
      if (d.name !== ident.name) continue;
      if (d.span.start.offset <= ident.span.start.offset) {
        if (!chosen || d.span.start.offset > chosen.span.start.offset) chosen = d;
      } else if (!chosen) {
        chosen = d;
      }
    }
    return {
      name: ident.name,
      kind: chosen?.kind ?? 'const',
      declaration: chosen?.span ?? null,
      type: this.typeAt(filename, line, column),
    };
  }
}

// ── Stateless one-shot API (spec §API Contract) ───────────────────────────────

/**
 * Compile a set of source files. Async per the frozen API surface. An optional
 * {@link CacheStore} makes warm rebuilds skip unchanged files.
 */
export async function compile(sources: readonly SourceFile[], opts: CompileOpts = {}, cache?: CacheStore): Promise<CompileResult> {
  const compiler = new Compiler(opts, cache);
  // Register every source first so relative imports resolve regardless of order.
  for (const f of sources) compiler.addSource(f.filename, f.source);
  for (const f of sources) compiler.setFile(f.filename, f.source);
  return compiler.compileAll();
}

/**
 * Single-file in-memory transform — the Jest/Vitest/Vite/esbuild contract.
 * Never touches the persistent cache; returns the same diagnostic shape as
 * {@link compile}.
 */
export async function transform(source: string, filename: string, opts: TransformOpts = {}): Promise<TransformResult> {
  const compiler = new Compiler(opts);
  const state = compiler.setFile(filename, source);
  return { code: state.output.code, map: state.output.map, diagnostics: state.diagnostics };
}

// ── Position helpers ──────────────────────────────────────────────────────────

/** UTF-16 offset of a 1-based line / 0-based column, or null if out of range. */
export function offsetAt(source: string, line: number, column: number): number | null {
  if (line < 1) return null;
  let curLine = 1;
  let i = 0;
  while (curLine < line && i < source.length) {
    if (source.charCodeAt(i) === 10 /* \n */) curLine++;
    i++;
  }
  if (curLine < line) return null;
  return i + column;
}

function spanCoversOffset(s: Span, off: number): boolean {
  return off >= s.start.offset && off <= s.end.offset;
}
function spanWidth(s: Span): number {
  return s.end.offset - s.start.offset;
}

function outputName(filename: string): string {
  return filename.replace(/\.sjs$/, '.js').replace(/\.ts$/, '.js');
}

/**
 * Resolve a relative specifier against the importing file's directory, returning
 * a normalised `.sjs` path. POSIX-style `/` segments; `.`/`..` collapsed. The
 * `.sjs` extension is appended when the specifier omits it.
 */
function resolveRelative(fromFile: string, specifier: string): string {
  const sep = Math.max(fromFile.lastIndexOf('/'), fromFile.lastIndexOf('\\'));
  const dir = sep >= 0 ? fromFile.slice(0, sep) : '';
  const out: string[] = [];
  for (const seg of (dir ? `${dir}/${specifier}` : specifier).split('/')) {
    if (seg === '.') continue;
    if (seg === '..') { if (out.length && out[out.length - 1] !== '') out.pop(); continue; }
    out.push(seg);
  }
  const path = out.join('/');
  return path.endsWith('.sjs') ? path : `${path}.sjs`;
}

/** Last path segment (POSIX or Windows separators), for relative map URLs. */
function baseName(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

// ── Lightweight AST traversal (symbolAt / apiHash) ────────────────────────────

interface DeclRecord {
  readonly name: string;
  readonly span: Span;
  readonly kind: SymbolInfo['kind'];
}

/** Generic depth-first walk over every node (object with a string `kind`). */
function walk(node: unknown, visit: (n: { kind: string; span?: Span } & Record<string, unknown>) => void): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const el of node) walk(el, visit); return; }
  const obj = node as Record<string, unknown>;
  if (typeof obj['kind'] === 'string') visit(obj as { kind: string; span?: Span } & Record<string, unknown>);
  for (const key of Object.keys(obj)) {
    if (key === 'kind') continue;
    walk(obj[key], visit);
  }
}

function smallestIdentifierAt(program: Program, off: number): Identifier | null {
  let best: Identifier | null = null;
  walk(program, (n) => {
    if (n.kind !== 'Identifier' || !n.span) return;
    if (!spanCoversOffset(n.span, off)) return;
    const id = n as unknown as Identifier;
    if (!best || spanWidth(n.span) < spanWidth(best.span)) best = id;
  });
  return best;
}

function collectDeclarations(program: Program): DeclRecord[] {
  const out: DeclRecord[] = [];
  const push = (id: unknown, kind: SymbolInfo['kind']): void => {
    if (id && typeof id === 'object' && (id as { kind?: string }).kind === 'Identifier') {
      const i = id as Identifier;
      out.push({ name: i.name, span: i.span, kind });
    }
  };
  walk(program, (n) => {
    switch (n.kind) {
      case 'VariableDecl': {
        const declKind = (n['declKind'] as 'const' | 'let' | 'var') ?? 'const';
        for (const d of (n['declarators'] as Array<{ id: unknown }>) ?? []) push(d.id, declKind);
        return;
      }
      case 'FunctionDecl': return push(n['id'], 'function');
      case 'ClassDecl': return push(n['id'], 'class');
      case 'ObjectTypeDecl': return push(n['id'], 'type');
      case 'TypeDecl': return push(n['id'], 'type');
      case 'Parameter': {
        const pat = n['pattern'] as { kind?: string };
        if (pat?.kind === 'Identifier') push(pat, 'param');
        return;
      }
    }
  });
  return out;
}

/** Sorted public-surface signatures, hashed into `apiHash`. */
function exportSignatures(program: Program): string[] {
  const sigs: string[] = [];
  for (const s of program.body) {
    if (s.kind === 'ExportNamedDecl' && s.declaration) sigs.push(...declNames(s.declaration as unknown as { kind: string } & Record<string, unknown>).map((n) => `export ${n}`));
    else if (s.kind === 'ExportDefaultDecl') sigs.push('export default');
    else if (s.kind === 'ExportAllDecl') sigs.push('export *');
  }
  return sigs;
}

function declNames(decl: { kind: string } & Record<string, unknown>): string[] {
  const id = decl['id'] as { name?: string } | undefined;
  if (id?.name) return [`${decl.kind}:${id.name}`];
  if (decl.kind === 'VariableDecl') {
    return ((decl['declarators'] as Array<{ id: { kind?: string; name?: string } }>) ?? [])
      .map((d) => (d.id.kind === 'Identifier' ? `var:${d.id.name}` : 'var:?'));
  }
  return [decl.kind];
}
