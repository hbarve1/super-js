/**
 * Command implementations. Each takes parsed args + an {@link IO} and returns a
 * POSIX-ish exit code (0 ok, 1 diagnostics, 2 usage/not-implemented, 64 unknown).
 *
 * Real at v1.0: build, check, explain, init, doctor. Stubbed (print a planned-
 * stage notice, exit 2): format, lint, add, doc, verify, migrate, test, lsp,
 * repl — they land in later stages but are wired so `superjs <cmd>` is defined.
 */

import { join, isAbsolute, basename, dirname } from 'node:path';
import { compile } from '@superjs/compiler';
import { getDescriptor, specUrlFor } from '@superjs/diagnostics';
import { DEFAULT_CONFIG, CONFIG_FILENAME } from '@superjs/config';
import type { Diagnostic, DiagnosticCode } from '@superjs/types';
import { type IO, line, errline } from './io.js';
import {
  formatPretty, formatJson, countErrors, countWarnings, type DiagnosticFormat,
} from './diagnostics-format.js';
import { DiskCacheStore, CACHE_DIR } from './cache.js';

export const VERSION = '0.0.1';

export interface ParsedArgs {
  readonly command: string;
  readonly positionals: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

const STUB_STAGE: Record<string, string> = {
  format: 'Stage 3', lint: 'Stage 3', doc: 'Stage 3', add: 'Stage 2',
  verify: 'Stage 4', migrate: 'Stage 2', test: 'Stage 5', lsp: 'Stage 3', repl: 'Stage 6',
};

function resolve(io: IO, p: string): string {
  return isAbsolute(p) ? p : join(io.cwd(), p);
}

/** Recursively collect `.sjs` files under a directory (relative paths from cwd). */
function walkSjs(io: IO, absDir: string, relDir: string, out: string[]): void {
  for (const entry of io.readDir(absDir).sort()) {
    const abs = join(absDir, entry);
    const rel = relDir ? `${relDir}/${entry}` : entry;
    if (io.isDirectory(abs)) walkSjs(io, abs, rel, out);
    else if (entry.endsWith('.sjs')) out.push(rel);
  }
}

/**
 * Expand input arguments to a flat list of `.sjs` files: a directory becomes all
 * `.sjs` files under it (recursively); a file passes through unchanged.
 */
function expandInputs(io: IO, paths: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    const abs = resolve(io, p);
    if (io.isDirectory(abs)) walkSjs(io, abs, p.replace(/\/+$/, ''), out);
    else out.push(p);
  }
  return out;
}

/** Read each path into a SourceFile, reporting unreadable files to stderr. */
function readSources(io: IO, paths: readonly string[]): { files: { filename: string; source: string }[]; missing: number } {
  const files: { filename: string; source: string }[] = [];
  let missing = 0;
  for (const p of expandInputs(io, paths)) {
    const abs = resolve(io, p);
    if (!io.exists(abs)) { errline(io, `error: cannot find file '${p}'`); missing++; continue; }
    files.push({ filename: p, source: io.readFile(abs) });
  }
  return { files, missing };
}

function emitDiagnostics(io: IO, diags: readonly Diagnostic[], format: DiagnosticFormat): void {
  if (format === 'json') { line(io, formatJson(diags)); return; }
  if (diags.length) line(io, formatPretty(diags));
}

function summary(io: IO, diags: readonly Diagnostic[]): void {
  const e = countErrors(diags), w = countWarnings(diags);
  if (e || w) line(io, `${e} error${e === 1 ? '' : 's'}, ${w} warning${w === 1 ? '' : 's'}`);
}

// ── check ─────────────────────────────────────────────────────────────────────
export async function check(args: ParsedArgs, io: IO): Promise<number> {
  if (args.positionals.length === 0) { errline(io, 'usage: superjs check <files...> [--format pretty|json]'); return 2; }
  const format: DiagnosticFormat = args.flags['format'] === 'json' ? 'json' : 'pretty';
  const { files, missing } = readSources(io, args.positionals);
  const result = await compile(files);
  emitDiagnostics(io, result.diagnostics, format);
  if (format !== 'json') {
    summary(io, result.diagnostics);
    if (countErrors(result.diagnostics) === 0 && missing === 0) line(io, 'No errors.');
  }
  return countErrors(result.diagnostics) > 0 || missing > 0 ? 1 : 0;
}

// ── build ─────────────────────────────────────────────────────────────────────
export async function build(args: ParsedArgs, io: IO): Promise<number> {
  if (args.positionals.length === 0) { errline(io, 'usage: superjs build <files...> [--out-dir dir] [--source-map none|inline|external] [--no-cache] [--watch]'); return 2; }
  const outDir = typeof args.flags['out-dir'] === 'string' ? (args.flags['out-dir'] as string) : 'dist';
  const sm = args.flags['source-map'];
  const sourceMap = sm === 'inline' || sm === 'external' || sm === 'none' ? sm : 'external';
  // Warm rebuilds reuse `.superjs/cache/`; `--no-cache` forces a cold build.
  const cache = args.flags['no-cache'] === true ? undefined : new DiskCacheStore(io, join(resolve(io, '.'), CACHE_DIR));

  /** One build pass. Returns the exit code for that pass. */
  const buildOnce = async (): Promise<number> => {
    const { files, missing } = readSources(io, args.positionals);
    const result = await compile(files, { sourceMap }, cache);
    if (result.diagnostics.length) emitDiagnostics(io, result.diagnostics, 'pretty');
    const errors = countErrors(result.diagnostics);
    if (errors > 0) { errline(io, `build failed: ${errors} error${errors === 1 ? '' : 's'}`); return 1; }
    let written = 0;
    for (const [name, output] of result.outputs) {
      const outPath = join(resolve(io, outDir), basename(name));
      io.writeFile(outPath, output.code);
      written++;
      if (sourceMap === 'external') io.writeFile(`${outPath}.map`, JSON.stringify(output.map));
    }
    line(io, `built ${written} file${written === 1 ? '' : 's'} → ${outDir}/`);
    return missing > 0 ? 1 : 0;
  };

  const code = await buildOnce();

  if (args.flags['watch'] === true) {
    // Re-build on change; warm passes are served from the cache. The active
    // watchers keep the process alive (run() resolves; node does not exit).
    line(io, 'watching for changes… (ctrl-c to stop)');
    io.watch(args.positionals.map((p) => resolve(io, p)), (path) => {
      line(io, `change: ${basename(path)} — rebuilding`);
      void buildOnce();
    });
    return 0;
  }
  return code;
}

// ── explain ───────────────────────────────────────────────────────────────────

/**
 * Locate `specs/error-codes/<CODE>.md` by walking up from the cwd, so a checkout
 * of the SuperJS repo / a project that vendors the specs gets the full write-up.
 * Returns the file contents, or null when no spec tree is in reach.
 */
function findSpecDoc(io: IO, code: string): string | null {
  let dir = io.cwd();
  for (;;) {
    const candidate = join(dir, 'specs', 'error-codes', `${code}.md`);
    if (io.exists(candidate)) return io.readFile(candidate);
    const parent = dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

export function explain(args: ParsedArgs, io: IO): number {
  const raw = args.positionals[0];
  if (!raw) { errline(io, 'usage: superjs explain <CODE>   e.g. superjs explain E001'); return 2; }
  const code = (raw.toUpperCase().startsWith('SJS-') ? raw.toUpperCase() : `SJS-${raw.toUpperCase()}`) as DiagnosticCode;
  const desc = getDescriptor(code);
  if (!desc) { errline(io, `unknown diagnostic code '${raw}'`); return 1; }

  // Prefer the authoritative per-code spec when reachable; else the registry summary.
  const doc = findSpecDoc(io, code);
  if (doc) {
    line(io, doc.trimEnd());
    line(io);
    line(io, `spec: ${specUrlFor(code)}`);
    return 0;
  }
  line(io, `${desc.code}  (${desc.severity}, ${desc.category}, ${desc.stage})`);
  line(io);
  line(io, `  ${desc.template}`);
  line(io);
  line(io, `  spec: ${specUrlFor(code)}`);
  return 0;
}

// ── init ──────────────────────────────────────────────────────────────────────
export function init(_args: ParsedArgs, io: IO): number {
  const path = join(io.cwd(), CONFIG_FILENAME);
  if (io.exists(path)) { line(io, `${CONFIG_FILENAME} already exists — leaving it untouched.`); return 0; }
  io.writeFile(path, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  line(io, `created ${CONFIG_FILENAME}`);
  return 0;
}

// ── doctor ────────────────────────────────────────────────────────────────────
export function doctor(_args: ParsedArgs, io: IO): number {
  const nodeOk = (() => { try { return Number(process.versions.node.split('.')[0]) >= 18; } catch { return false; } })();
  const hasConfig = io.exists(join(io.cwd(), CONFIG_FILENAME));
  line(io, 'superjs doctor');
  line(io, `  node ${process.versions.node}        ${nodeOk ? 'ok' : 'WARN: need ≥ 18'}`);
  line(io, `  compiler ${VERSION}            ok`);
  line(io, `  ${CONFIG_FILENAME}     ${hasConfig ? 'found' : 'not found (run `superjs init`)'}`);
  return nodeOk ? 0 : 1;
}

// ── stubs ─────────────────────────────────────────────────────────────────────
export function stub(command: string, io: IO): number {
  const stage = STUB_STAGE[command] ?? 'a later stage';
  errline(io, `'superjs ${command}' is not implemented yet (planned: ${stage}).`);
  return 2;
}
