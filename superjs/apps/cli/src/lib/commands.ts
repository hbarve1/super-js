/**
 * Command implementations. Each takes parsed args + an {@link IO} and returns a
 * POSIX-ish exit code (0 ok, 1 diagnostics, 2 usage/not-implemented, 64 unknown).
 *
 * Real at v1.0: build, check, translate, add, format, lint, doc, explain, init,
 * doctor. Stubbed (print a planned-stage notice, exit 2): verify, migrate, test,
 * lsp, repl — they land in later stages but are wired so `superjs <cmd>` is defined.
 */

import { join, isAbsolute, basename, dirname } from 'node:path';
import { compile, format, lint, doc as extractDoc, renderMarkdown, renderJson, renderApiPage, moduleDescriptionFromSource } from '@superjs/compiler';
import { serveStdio } from '@superjs/lsp';
import { runDebugStdio } from '@superjs/dap';
import { getDescriptor, specUrlFor } from '@superjs/diagnostics';
import { DEFAULT_CONFIG, CONFIG_FILENAME } from '@superjs/config';
import type { Diagnostic, DiagnosticCode } from '@superjs/types';
import { type IO, line, errline } from './io.js';
import {
  formatPretty, formatJson, countErrors, countWarnings, type DiagnosticFormat,
} from './diagnostics-format.js';
import { DiskCacheStore, CACHE_DIR } from './cache.js';
import { parseSjsignore, type IgnoreMatcher } from './sjsignore.js';
import { TEMPLATE_NAMES, templateFiles, type TemplateName } from './templates.js';

export const VERSION = '0.0.1';

export interface ParsedArgs {
  readonly command: string;
  readonly positionals: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

const STUB_STAGE: Record<string, string> = {
  test: 'Stage 5', repl: 'Stage 6',
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
  const ignore = loadSjsignore(io);
  const out: string[] = [];
  for (const p of paths) {
    const abs = resolve(io, p);
    // Strip trailing slashes without a backtracking regex (avoids ReDoS).
    let base = p;
    while (base.endsWith('/')) base = base.slice(0, -1);
    if (io.isDirectory(abs)) {
      // Files discovered by walking a directory are subject to `.sjsignore`;
      // explicitly-named files are always kept.
      const walked: string[] = [];
      walkSjs(io, abs, base, walked);
      for (const f of walked) if (!ignore.ignores(f.replace(/\\/g, '/'))) out.push(f);
    } else {
      out.push(p);
    }
  }
  return out;
}

/** Load `.sjsignore` from the project root (cwd), or a no-op matcher if absent. */
function loadSjsignore(io: IO): IgnoreMatcher {
  const path = join(io.cwd(), '.sjsignore');
  if (!io.exists(path)) return { ignores: () => false };
  try {
    return parseSjsignore(io.readFile(path));
  } catch {
    return { ignores: () => false };
  }
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

/**
 * Read the `paths` map out of superjs.config.json, keeping only well-formed
 * entries (string-array values). A missing/invalid config or a malformed `paths`
 * value yields `{}` — resolution then leaves those specifiers `dynamic`.
 */
function loadConfigPaths(io: IO, root: string): Record<string, readonly string[]> {
  const path = join(root, CONFIG_FILENAME);
  if (!io.exists(path)) return {};
  try {
    const cfg = JSON.parse(io.readFile(path)) as { paths?: unknown };
    if (!cfg.paths || typeof cfg.paths !== 'object' || Array.isArray(cfg.paths)) return {};
    const out: Record<string, readonly string[]> = {};
    for (const [k, v] of Object.entries(cfg.paths as Record<string, unknown>)) {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out[k] = v as string[];
    }
    return out;
  } catch { return {}; }
}

/** Resolution config shared by `check` + `build`: config `paths` + a disk-read seam. */
function resolutionOpts(io: IO): { paths: Record<string, readonly string[]>; rootDir: string; readFile: (p: string) => string | undefined } {
  const root = io.cwd();
  return {
    paths: loadConfigPaths(io, root),
    rootDir: root,
    // Must never throw — a read that fails between exists() and readFile() (race,
    // permissions) degrades to an unresolved import, not an internal error.
    readFile: (p) => {
      if (!io.exists(p)) return undefined;
      try { return io.readFile(p); } catch { return undefined; }
    },
  };
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
  const result = await compile(files, resolutionOpts(io));
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
    const result = await compile(files, { sourceMap, ...resolutionOpts(io) }, cache);
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

/**
 * `superjs verify <input-dir> <expected-dir>` — recompile the inputs and byte-diff
 * the emitted JavaScript against an expected output tree. Exits non-zero on any
 * difference or missing file. Turns the build-determinism gate into a
 * user-auditable command (no source maps, so the comparison is path-independent).
 */
export async function verify(args: ParsedArgs, io: IO): Promise<number> {
  if (args.positionals.length < 2) {
    errline(io, 'usage: superjs verify <input-dir> <expected-dir>');
    return 2;
  }
  const [input, expected] = args.positionals as [string, string];
  const { files, missing } = readSources(io, [input]);
  const result = await compile(files, { sourceMap: 'none', ...resolutionOpts(io) });
  const errors = countErrors(result.diagnostics);
  if (errors > 0) { emitDiagnostics(io, result.diagnostics, 'pretty'); errline(io, `verify failed: ${errors} compile error${errors === 1 ? '' : 's'}`); return 1; }

  let mismatches = 0;
  let checked = 0;
  for (const [name, output] of result.outputs) {
    const expPath = join(resolve(io, expected), basename(name));
    checked++;
    if (!io.exists(expPath)) { errline(io, `missing: ${basename(name)} not found in ${expected}/`); mismatches++; continue; }
    if (io.readFile(expPath) !== output.code) { errline(io, `differs: ${basename(name)}`); mismatches++; }
  }
  if (mismatches === 0 && missing === 0) { line(io, `verified ${checked} file${checked === 1 ? '' : 's'} — output matches ${expected}/`); return 0; }
  errline(io, `verify failed: ${mismatches} mismatch${mismatches === 1 ? '' : 'es'}`);
  return 1;
}

// ── translate (.d.ts → .d.sjs) ──────────────────────────────────────────────────

/**
 * Translate TypeScript `.d.ts` declaration files into SuperJS `.d.sjs`.
 *
 * `@superjs/interop` is the only code that pulls in the TypeScript compiler, so
 * it is imported lazily: every other command stays on the TS-free fast path, and
 * the heavy TS module initialises only when someone actually runs `translate`.
 * TS forms SuperJS doesn't model degrade to `dynamic` and are reported, never
 * silently dropped.
 */
export async function translate(args: ParsedArgs, io: IO): Promise<number> {
  if (args.positionals.length === 0) {
    errline(io, 'usage: superjs translate <files.d.ts...> [--out-dir dir] [--stats]');
    return 2;
  }
  let translateDts: (
    source: string,
    fileName?: string,
  ) => { code: string; unsupported: readonly string[]; surface: { typed: number; total: number } };
  try {
    ({ translateDts } = await import('@superjs/interop'));
  } catch {
    errline(io, "error: the TypeScript interop layer failed to load — install 'typescript' (npm install -D typescript) and retry.");
    return 2;
  }

  const statsOnly = args.flags.stats === true;
  const outDir = typeof args.flags['out-dir'] === 'string' ? (args.flags['out-dir'] as string) : undefined;
  const SUFFIX = '.d.ts';
  let failed = 0;
  for (const p of args.positionals) {
    if (!p.endsWith(SUFFIX)) { errline(io, `error: '${p}' is not a .d.ts file`); failed++; continue; }
    const abs = resolve(io, p);
    if (!io.exists(abs)) { errline(io, `error: cannot find file '${p}'`); failed++; continue; }
    const { code, unsupported, surface } = translateDts(io.readFile(abs), basename(p));
    if (statsOnly) {
      const dynamic = surface.total - surface.typed;
      const percent = surface.total === 0 ? 0 : Math.round((surface.typed / surface.total) * 100);
      line(io, JSON.stringify({ total: surface.total, translated: surface.typed, dynamic, percent }));
      continue;
    }
    const outName = `${basename(p).slice(0, -SUFFIX.length)}.d.sjs`;
    const outPath = outDir ? join(resolve(io, outDir), outName) : join(dirname(abs), outName);
    io.writeFile(outPath, code);
    for (const note of unsupported) errline(io, `  warning: ${note}`);
    line(io, `translated ${p} → ${outDir ? `${outDir}/${outName}` : outName}`);
  }
  return failed > 0 ? 1 : 0;
}

// ── add (resolve an npm package's types → .d.sjs) ─────────────────────────────

/** Where generated package types live, relative to the project root (posix). */
const TYPES_BASE = 'node_modules/@superjs/types';

/** Parse a package.json into an object; null if absent or invalid. */
function readPackageJson(io: IO, abs: string): Record<string, unknown> | null {
  if (!io.exists(abs)) return null;
  try { return JSON.parse(io.readFile(abs)) as Record<string, unknown>; }
  catch { return null; }
}

/**
 * Locate a package's TypeScript declaration entry point under `node_modules`.
 * Prefers the package's own `types`/`typings` field, then a bundled
 * `index.d.ts`, then the DefinitelyTyped `@types/<pkg>` fallback (scoped names
 * map `@scope/name` → `scope__name` per the DT convention).
 */
function findDtsEntry(io: IO, root: string, pkg: string): string | null {
  const pkgDir = join(root, 'node_modules', ...pkg.split('/'));
  const manifest = readPackageJson(io, join(pkgDir, 'package.json'));
  if (manifest) {
    const typesField = manifest['types'] ?? manifest['typings'];
    if (typeof typesField === 'string') {
      const entry = join(pkgDir, typesField);
      if (io.exists(entry)) return entry;
    }
    const bundled = join(pkgDir, 'index.d.ts');
    if (io.exists(bundled)) return bundled;
  }
  const dtName = pkg.startsWith('@') ? pkg.slice(1).replace('/', '__') : pkg;
  const dtEntry = join(root, 'node_modules', '@types', dtName, 'index.d.ts');
  if (io.exists(dtEntry)) return dtEntry;
  return null;
}

/** Add/replace one `paths` mapping in superjs.config.json, creating it if absent. */
function updateConfigPaths(io: IO, root: string, pkg: string, target: string): void {
  const configPath = join(root, CONFIG_FILENAME);
  let config: Record<string, unknown>;
  if (io.exists(configPath)) {
    try { config = JSON.parse(io.readFile(configPath)) as Record<string, unknown>; }
    catch { config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Record<string, unknown>; }
  } else {
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Record<string, unknown>;
  }
  const paths = (config['paths'] && typeof config['paths'] === 'object')
    ? config['paths'] as Record<string, string[]>
    : {};
  paths[pkg] = [target];
  config['paths'] = paths;
  io.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Resolve an installed npm package's types into SuperJS `.d.sjs` so the project
 * can `import` it with type safety. Finds the package's `.d.ts` (own or
 * DefinitelyTyped), runs the `@superjs/interop` translator, writes the result to
 * `node_modules/@superjs/types/<pkg>/index.d.sjs`, and maps the import specifier
 * in `superjs.config.json` `paths`. TS forms SuperJS can't model degrade to
 * `dynamic` and are reported — never silently dropped.
 *
 * MVP scope (Stage 2 Sprint 2.1): translator-only. Hand-curated
 * `@superjs/types-<pkg>` wrappers and npm-registry lookup land in a later sprint.
 */
export async function add(args: ParsedArgs, io: IO): Promise<number> {
  const pkg = args.positionals[0];
  if (!pkg) { errline(io, 'usage: superjs add <package>'); return 2; }

  const root = io.cwd();
  const entry = findDtsEntry(io, root, pkg);
  if (!entry) {
    errline(io, `error: no TypeScript declarations found for '${pkg}'.`);
    errline(io, `  looked in node_modules/${pkg} and node_modules/@types/ — is the package installed?`);
    return 1;
  }

  let translateDts: (source: string, fileName?: string) => {
    code: string; unsupported: readonly string[]; surface: { typed: number; total: number };
  };
  try {
    ({ translateDts } = await import('@superjs/interop'));
  } catch {
    errline(io, "error: the TypeScript interop layer failed to load — install 'typescript' (npm install -D typescript) and retry.");
    return 2;
  }

  const { code, unsupported, surface } = translateDts(io.readFile(entry), basename(entry));
  const typesRel = `${TYPES_BASE}/${pkg}`;
  const typesDir = join(root, ...typesRel.split('/'));
  io.writeFile(join(typesDir, 'index.d.sjs'), code);
  // Sidecar coverage record `doctor` reads back later.
  io.writeFile(join(typesDir, 'surface.json'),
    `${JSON.stringify({ package: pkg, ...surface, unsupported }, null, 2)}\n`);
  updateConfigPaths(io, root, pkg, typesRel);

  for (const note of unsupported) errline(io, `  warning: ${note}`);
  const n = unsupported.length;
  line(io, `added ${pkg} → ${typesRel}/index.d.sjs`);
  line(io, `  typed surface: ${surfacePct(surface)}`);
  if (n > 0) line(io, `  ${n} construct${n === 1 ? '' : 's'} degraded or skipped (see warnings above)`);
  return 0;
}

/** Render a typed-surface ratio as a percent + fraction, e.g. `83% (5/6)`. */
function surfacePct(s: { typed: number; total: number }): string {
  if (s.total === 0) return 'n/a (nothing translatable)';
  return `${Math.round((s.typed / s.total) * 100)}% (${s.typed}/${s.total} identifiers)`;
}

// ── doc ───────────────────────────────────────────────────────────────────────

/**
 * Generate API documentation from exported declarations (ADR-009, MVP). Prints
 * Markdown (default) or JSON to stdout; `--out-dir` writes one `.md`/`.json`
 * per input file instead. Docs come from the type annotations + leading doc
 * comments — no `@param {type}` tags, the types are the source of truth.
 */
export function docCmd(args: ParsedArgs, io: IO): number {
  if (args.positionals.length === 0) { errline(io, 'usage: superjs doc <files...> [--format md|json] [--out-dir dir]'); return 2; }
  const json = args.flags['format'] === 'json';
  const ext = json ? 'json' : 'md';
  const outDir = typeof args.flags['out-dir'] === 'string' ? (args.flags['out-dir'] as string) : undefined;
  const { files, missing } = readSources(io, args.positionals);
  for (const f of files) {
    const symbols = extractDoc(f.source, f.filename);
    const title = basename(f.filename).replace(/\.sjs$/, '');
    const rendered = json ? renderJson(symbols) : renderMarkdown(symbols, title);
    if (outDir) {
      const outPath = join(resolve(io, outDir), `${title}.${ext}`);
      io.writeFile(outPath, rendered.endsWith('\n') ? rendered : `${rendered}\n`);
      line(io, `documented ${f.filename} → ${outDir}/${title}.${ext}`);
    } else {
      line(io, rendered);
    }
  }
  return missing > 0 ? 1 : 0;
}

/**
 * Generate website-ready API reference pages (WS-A4c). Writes one `.md` per module
 * with docs frontmatter under `--out` (default `docs/api` at repo root).
 */
export function docgenCmd(args: ParsedArgs, io: IO): number {
  const outDir = typeof args.flags['out'] === 'string'
    ? (args.flags['out'] as string)
    : 'docs/api';
  if (args.positionals.length === 0) {
    errline(io, 'usage: superjs docgen <files...> [--out dir]');
    return 2;
  }
  const { files, missing } = readSources(io, args.positionals);
  const sorted = [...files].sort((a, b) => a.filename.localeCompare(b.filename));
  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i]!;
    const title = basename(f.filename).replace(/\.sjs$/, '');
    const symbols = extractDoc(f.source, f.filename);
    const description = moduleDescriptionFromSource(f.source, title);
    const rendered = renderApiPage(title, symbols, {
      description,
      sidebarPosition: i + 2,
      section: 'api',
    });
    const outPath = join(resolve(io, outDir), `${title}.md`);
    io.writeFile(outPath, rendered.endsWith('\n') ? rendered : `${rendered}\n`);
    line(io, `docgen ${f.filename} → ${outPath}`);
  }
  return missing > 0 ? 1 : 0;
}

// ── lint ──────────────────────────────────────────────────────────────────────

/**
 * Lint `.sjs` files (style rules SJS-L001…). Reports findings and exits non-zero
 * when any are present — lint findings are actionable by definition, so this
 * gates CI. `--format json` emits machine-readable diagnostics.
 */
export function lintCmd(args: ParsedArgs, io: IO): number {
  if (args.positionals.length === 0) { errline(io, 'usage: superjs lint <files...> [--format pretty|json] [--fix]'); return 2; }
  const format: DiagnosticFormat = args.flags['format'] === 'json' ? 'json' : 'pretty';
  const { files, missing } = readSources(io, args.positionals);

  if (args.flags['fix'] === true) {
    let fixed = 0;
    const remaining: Diagnostic[] = [];
    for (const f of files) {
      const { code, applied } = applyFixes(f.source, lint(f.source, f.filename));
      if (applied > 0) { io.writeFile(resolve(io, f.filename), code); fixed += applied; line(io, `fixed ${applied} issue${applied === 1 ? '' : 's'} in ${f.filename}`); }
      remaining.push(...lint(code, f.filename)); // re-lint the fixed source for what's left
    }
    emitDiagnostics(io, remaining, format);
    if (format !== 'json') {
      line(io, fixed === 0 ? 'No auto-fixable findings.' : `Fixed ${fixed} issue${fixed === 1 ? '' : 's'}.`);
      summary(io, remaining);
    }
    return remaining.length > 0 || missing > 0 ? 1 : 0;
  }

  const findings: Diagnostic[] = [];
  for (const f of files) findings.push(...lint(f.source, f.filename));
  emitDiagnostics(io, findings, format);
  if (format !== 'json') {
    summary(io, findings);
    if (findings.length === 0 && missing === 0) line(io, 'No lint findings.');
  }
  return findings.length > 0 || missing > 0 ? 1 : 0;
}

/**
 * Apply lint auto-fixes to a source string. Each fixable finding contributes its
 * first fix's edits; edits are applied right-to-left so earlier offsets stay
 * valid, and any edit overlapping one already applied is skipped.
 */
function applyFixes(source: string, diagnostics: readonly Diagnostic[]): { code: string; applied: number } {
  const edits = diagnostics.flatMap((d) => d.fixes?.[0]?.edits ?? []);
  edits.sort((a, b) => b.span.start.offset - a.span.start.offset);
  let code = source;
  let applied = 0;
  let lastStart = Infinity;
  for (const e of edits) {
    if (e.span.end.offset > lastStart) continue; // overlaps a later edit already applied
    code = code.slice(0, e.span.start.offset) + e.newText + code.slice(e.span.end.offset);
    lastStart = e.span.start.offset;
    applied++;
  }
  return { code, applied };
}

// ── format ────────────────────────────────────────────────────────────────────

/**
 * Format `.sjs` files in place (the canonical formatter). `--check` reports which
 * files would change and exits non-zero without writing — for CI. Files the
 * formatter can't prove it reproduces faithfully are left untouched.
 */
export function fmt(args: ParsedArgs, io: IO): number {
  if (args.positionals.length === 0) { errline(io, 'usage: superjs format <files...> [--check]'); return 2; }
  const check = args.flags['check'] === true;
  let changed = 0, failed = 0;
  for (const p of expandInputs(io, args.positionals)) {
    const abs = resolve(io, p);
    if (!io.exists(abs)) { errline(io, `error: cannot find file '${p}'`); failed++; continue; }
    const result = format(io.readFile(abs));
    if (!result.changed) continue;
    changed++;
    if (check) { line(io, `would reformat ${p}`); }
    else { io.writeFile(abs, result.code); line(io, `formatted ${p}`); }
  }
  if (check) {
    line(io, changed === 0 ? 'All files are formatted.' : `${changed} file${changed === 1 ? '' : 's'} would be reformatted.`);
    return (changed > 0 || failed > 0) ? 1 : 0;
  }
  if (changed === 0 && failed === 0) line(io, 'All files already formatted.');
  return failed > 0 ? 1 : 0;
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
export function init(args: ParsedArgs, io: IO): number {
  const template = args.positionals[0];
  if (template !== undefined && !TEMPLATE_NAMES.includes(template as TemplateName)) {
    errline(io, `unknown template '${template}'. Available: ${TEMPLATE_NAMES.join(', ')}`);
    return 2;
  }
  // No template → just the config file (original behaviour). With a template →
  // scaffold its files. Existing files are never overwritten.
  const files = template === undefined
    ? [{ path: CONFIG_FILENAME, content: `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n` }]
    : templateFiles(template as TemplateName);

  let created = 0;
  let skipped = 0;
  for (const f of files) {
    const abs = join(io.cwd(), f.path);
    if (io.exists(abs)) { line(io, `${f.path} already exists — skipped`); skipped++; continue; }
    io.writeFile(abs, f.content);
    line(io, `created ${f.path}`);
    created++;
  }
  if (created === 0 && skipped > 0) line(io, 'nothing to do — files already present.');
  else if (template !== undefined) line(io, `scaffolded '${template}' (${created} file${created === 1 ? '' : 's'}).`);
  return 0;
}

// ── doctor ────────────────────────────────────────────────────────────────────

/** Read the typed-surface sidecar a previous `superjs add` wrote for a package. */
function readSurface(io: IO, root: string, dir: string): { typed: number; total: number; unsupported?: string[] } | null {
  const abs = join(root, ...dir.split('/'), 'surface.json');
  if (!io.exists(abs)) return null;
  try { return JSON.parse(io.readFile(abs)) as { typed: number; total: number; unsupported?: string[] }; }
  catch { return null; }
}

/** Print a per-package typed-surface report for everything `superjs add` mapped. */
function reportPackages(io: IO, root: string): void {
  const configPath = join(root, CONFIG_FILENAME);
  if (!io.exists(configPath)) return;
  let paths: Record<string, string[]>;
  try {
    const cfg = JSON.parse(io.readFile(configPath)) as { paths?: Record<string, string[]> };
    paths = cfg.paths ?? {};
  } catch { return; }

  const entries = Object.entries(paths).filter(([, dirs]) => dirs?.[0]?.startsWith(TYPES_BASE));
  if (entries.length === 0) return;

  line(io, '');
  line(io, `  added packages (${entries.length}):`);
  for (const [pkg, dirs] of entries) {
    const s = readSurface(io, root, dirs[0]!);
    if (!s) { line(io, `    ${pkg}    (no coverage record — re-run \`superjs add ${pkg}\`)`); continue; }
    const dyn = s.unsupported?.length ?? 0;
    const tail = dyn > 0 ? `, ${dyn} dynamic/skipped` : '';
    line(io, `    ${pkg}    typed surface ${surfacePct(s)}${tail}`);
  }
}

export function doctor(_args: ParsedArgs, io: IO): number {
  const nodeOk = (() => { try { return Number(process.versions.node.split('.')[0]) >= 18; } catch { return false; } })();
  const hasConfig = io.exists(join(io.cwd(), CONFIG_FILENAME));
  line(io, 'superjs doctor');
  line(io, `  node ${process.versions.node}        ${nodeOk ? 'ok' : 'WARN: need ≥ 18'}`);
  line(io, `  compiler ${VERSION}            ok`);
  line(io, `  ${CONFIG_FILENAME}     ${hasConfig ? 'found' : 'not found (run `superjs init`)'}`);
  reportPackages(io, io.cwd());
  return nodeOk ? 0 : 1;
}

/**
 * `superjs lsp` — launch the language server (Stage 3, M1) over stdio. The
 * process stays alive on the open stdin stream and ends on the LSP `exit`
 * notification. stdout is the JSON-RPC channel, so this command writes nothing
 * to it. `serve` is injectable for tests; the binary uses `serveStdio`.
 */
export function lsp(_args: ParsedArgs, _io: IO, serve: () => void = serveStdio): number {
  serve();
  return 0;
}

/**
 * `superjs debug` — DAP adapter over stdio (WS-B2 Phase 0 skeleton). VS Code
 * spawns this with launch args; stdout is the DAP channel.
 */
export function debug(_args: ParsedArgs, _io: IO, run: () => void = runDebugStdio): number {
  run();
  return 0;
}

// ── migrate (TS → SJS, assisted) ────────────────────────────────────────────

/** Collect `.ts` files (excluding `.d.ts`) under a directory, relative to cwd. */
function walkTs(io: IO, relDir: string): string[] {
  const out: string[] = [];
  const recur = (rel: string): void => {
    const abs = resolve(io, rel);
    if (!io.isDirectory(abs)) {
      if (rel.endsWith('.ts') && !rel.endsWith('.d.ts')) out.push(rel);
      return;
    }
    for (const entry of io.readDir(abs).sort()) recur(`${rel}/${entry}`);
  };
  recur(relDir.replace(/\/+$/, ''));
  return out;
}

/** Collect `.sjs` files under a directory, relative to cwd. */
function walkSjsFiles(io: IO, relDir: string): string[] {
  const out: string[] = [];
  const recur = (rel: string): void => {
    const abs = resolve(io, rel);
    if (!io.isDirectory(abs)) {
      if (rel.endsWith('.sjs')) out.push(rel);
      return;
    }
    for (const entry of io.readDir(abs).sort()) recur(`${rel}/${entry}`);
  };
  recur(relDir.replace(/\/+$/, ''));
  return out;
}

/** Line-level flags for TS constructs that need a human rewrite in SJS. */
const MIGRATE_FLAGS: { re: RegExp; note: string }[] = [
  { re: /\benum\b/, note: '`enum` — replace with a sum type (`type X = A | B`)' },
  { re: /\bnamespace\b/, note: '`namespace` — not supported; use modules' },
  { re: /@[A-Za-z_]/, note: 'decorator — not supported in SJS' },
  { re: /\bas const\b/, note: '`as const` — not supported; annotate explicitly' },
  { re: /[A-Za-z0-9_)\]]!\s*[.;)]/, note: 'non-null assertion `!` — banned; handle the null case' },
];

/**
 * Import-path rewrites for `migrate from-prototype`.
 * Applied in order — more-specific patterns must come before catch-alls.
 */
const PROTOTYPE_REWRITES: Array<[RegExp, string]> = [
  [/from ['"]superjs\/parser['"]/g,    "from '@superjs/compiler'"],
  [/from ['"]superjs\/checker['"]/g,   "from '@superjs/compiler'"],
  [/from ['"]superjs\/codegen['"]/g,   "from '@superjs/compiler'"],
  [/from ['"]superjs\/ir['"]/g,        "from '@superjs/compiler'"],
  [/from ['"]superjs['"]/g,            "from '@superjs/compiler'"],
  [/from ['"]\.\.\/prototype\/src\//g, "from '../superjs/libs/compiler/src/"],
];

/** Patterns that flag a line as needing manual intervention (prototype imports). */
const PROTOTYPE_MANUAL_FLAGS: Array<{ re: RegExp; message: string }> = [
  { re: /from ['"]superjs\//,        message: 'Unrecognised prototype sub-path — check manually' },
  { re: /require\(['"]superjs/,      message: 'CommonJS require of prototype path — convert to ESM import' },
  { re: /prototype\/src\//,          message: 'Remaining prototype/src reference — check path mapping' },
];

interface ProtoRewriteResult {
  /** Relative path of the source .sjs file (from cwd or src root). */
  relPath: string;
  /** Rewritten content (equals original when nothing changed). */
  content: string;
  /** Whether any prototype import was rewritten. */
  changed: boolean;
  /** Lines that could not be auto-migrated: [lineNum, originalLine, message]. */
  manualLines: Array<[number, string, string]>;
  /** Summary rows for the "Rewritten import paths" table. */
  rewrites: Array<{ oldImport: string; newImport: string }>;
}

/** Apply PROTOTYPE_REWRITES to a single file's content and collect diagnostics. */
function rewriteProtoFile(relPath: string, source: string): ProtoRewriteResult {
  const srcLines = source.split('\n');
  const rewrites: ProtoRewriteResult['rewrites'] = [];
  const manualLines: ProtoRewriteResult['manualLines'] = [];

  const rewrittenLines = srcLines.map((l, idx) => {
    let out = l;
    for (const [re, replacement] of PROTOTYPE_REWRITES) {
      if (re.test(out)) {
        const oldImport = out.trim();
        out = out.replace(re, replacement);
        const newImport = out.trim();
        if (oldImport !== newImport) rewrites.push({ oldImport, newImport });
      }
    }
    for (const { re, message } of PROTOTYPE_MANUAL_FLAGS) {
      if (re.test(out)) manualLines.push([idx + 1, l.trim(), message]);
    }
    return out;
  });

  const content = rewrittenLines.join('\n');
  return { relPath, content, changed: content !== source, rewrites, manualLines };
}

/**
 * `superjs migrate from-ts <dir>` — assisted TypeScript → SuperJS migration.
 * A best-effort *textual* pass (no TS AST): copies each `.ts` to `.sjs`, rewrites
 * `any` → `dynamic`, and flags constructs that need a human rewrite into
 * `MIGRATION_REPORT.md`. Idempotent — a directory of already-migrated `.sjs`
 * has no `.ts` to process.
 *
 * `superjs migrate from-prototype [--dry-run] [--out <dir>] <dir>` — rewrite
 * prototype-era import paths in `.sjs` files to the current `@superjs/*` layout.
 * Emits `MIGRATION_REPORT.md` (or prints to stdout with `--dry-run`).
 */
export function migrate(args: ParsedArgs, io: IO): number {
  const sub = args.positionals[0];

  if (sub === 'from-ts') return migrateFromTs(args, io);
  if (sub === 'from-prototype') return migrateFromPrototype(args, io);

  errline(io, 'usage: superjs migrate <subcommand> [options] <dir>');
  errline(io, '  superjs migrate from-ts <dir>');
  errline(io, '  superjs migrate from-prototype [--dry-run] [--out <dir>] <dir>');
  return 2;
}

function migrateFromTs(args: ParsedArgs, io: IO): number {
  if (args.positionals[1] === undefined) {
    errline(io, 'usage: superjs migrate from-ts <dir>');
    return 2;
  }
  const dir = args.positionals[1];
  const tsFiles = walkTs(io, dir);
  if (tsFiles.length === 0) { line(io, `no .ts files found under ${dir}/ — nothing to migrate.`); return 0; }

  const report: string[] = ['# Migration Report', '', `Migrated ${tsFiles.length} file(s) from TypeScript to SuperJS.`, ''];
  for (const tsPath of tsFiles) {
    const source = io.readFile(resolve(io, tsPath));
    const lines = source.split('\n');
    // Mechanical rewrite: `any` type → `dynamic`.
    const migrated = lines.map((l) => l.replace(/([:<]\s*)any\b/g, '$1dynamic').replace(/\bas any\b/g, 'as dynamic')).join('\n');
    const sjsPath = `${tsPath.slice(0, -3)}.sjs`;
    io.writeFile(resolve(io, sjsPath), migrated);

    const flags: string[] = [];
    lines.forEach((l, i) => {
      for (const f of MIGRATE_FLAGS) if (f.re.test(l)) flags.push(`- line ${i + 1}: ${f.note}`);
    });
    report.push(`## ${tsPath} → ${sjsPath}`);
    report.push(...(flags.length ? flags : ['- no manual changes flagged']));
    report.push('');
    line(io, `migrated ${tsPath} → ${sjsPath}${flags.length ? ` (${flags.length} flag${flags.length === 1 ? '' : 's'})` : ''}`);
  }
  io.writeFile(resolve(io, 'MIGRATION_REPORT.md'), `${report.join('\n')}\n`);
  line(io, `wrote MIGRATION_REPORT.md`);
  return 0;
}

function migrateFromPrototype(args: ParsedArgs, io: IO): number {
  const srcDir = args.positionals[1];
  if (srcDir === undefined) {
    errline(io, 'usage: superjs migrate from-prototype [--dry-run] [--out <dir>] <dir>');
    return 2;
  }

  const dryRun = args.flags['dry-run'] === true;
  const outDir = typeof args.flags['out'] === 'string' ? args.flags['out'] : undefined;

  const sjsFiles = walkSjsFiles(io, srcDir);
  if (sjsFiles.length === 0) {
    line(io, `no .sjs files found under ${srcDir}/ — nothing to migrate.`);
    return 0;
  }

  const results: ProtoRewriteResult[] = [];
  for (const relPath of sjsFiles) {
    const source = io.readFile(resolve(io, relPath));
    const result = rewriteProtoFile(relPath, source);
    results.push(result);
  }

  const rewritten = results.filter((r) => r.changed);
  const allManual = results.flatMap((r) => r.manualLines.map((ml) => ({ file: r.relPath, line: ml[0], code: ml[1], message: ml[2] })));
  const allRewrites = results.flatMap((r) => r.rewrites.map((rw) => ({ file: r.relPath, ...rw })));

  // Build MIGRATION_REPORT.md content.
  const reportLines: string[] = [
    '# Migration Report',
    '',
    'Generated by `superjs migrate from-prototype`.',
    '',
    '## Summary',
    `- Files processed: ${results.length}`,
    `- Files rewritten: ${rewritten.length}`,
    `- Manual interventions required: ${allManual.length}`,
    '',
    '## Rewritten import paths',
  ];

  if (allRewrites.length === 0) {
    reportLines.push('', '_No prototype imports found._', '');
  } else {
    reportLines.push('| File | Old import | New import |');
    reportLines.push('|------|-----------|-----------|');
    for (const rw of allRewrites) {
      reportLines.push(`| ${rw.file} | \`${rw.oldImport}\` | \`${rw.newImport}\` |`);
    }
    reportLines.push('');
  }

  reportLines.push('## Manual interventions required');
  if (allManual.length === 0) {
    reportLines.push('', '_None — all imports were auto-migrated._', '');
  } else {
    reportLines.push('| File | Line | Code | Message |');
    reportLines.push('|------|------|------|---------|');
    for (const m of allManual) {
      reportLines.push(`| ${m.file} | ${m.line} | \`${m.code}\` | ${m.message} |`);
    }
    reportLines.push('');
  }

  const reportContent = `${reportLines.join('\n')}\n`;

  if (dryRun) {
    line(io, `[dry-run] would rewrite ${rewritten.length} of ${results.length} file(s)`);
    for (const r of rewritten) {
      line(io, `  ${r.relPath} (${r.rewrites.length} import rewrite${r.rewrites.length === 1 ? '' : 's'})`);
    }
    line(io, '');
    line(io, reportContent);
    return 0;
  }

  // Write output files.
  for (const r of results) {
    if (!r.changed) continue;
    const destPath = outDir
      ? join(outDir, r.relPath.slice(srcDir.replace(/\/+$/, '').length + 1))
      : r.relPath;
    io.writeFile(resolve(io, destPath), r.content);
    line(io, `rewritten ${r.relPath}${outDir ? ` → ${destPath}` : ''}`);
  }

  // Write report — always to the cwd root (or outDir if provided).
  const reportPath = outDir ? join(outDir, 'MIGRATION_REPORT.md') : 'MIGRATION_REPORT.md';
  io.writeFile(resolve(io, reportPath), reportContent);
  line(io, `wrote ${reportPath}`);
  line(io, `${rewritten.length} of ${results.length} file(s) rewritten; ${allManual.length} manual intervention(s) required`);
  return 0;
}

// ── stubs ─────────────────────────────────────────────────────────────────────
export function stub(command: string, io: IO): number {
  const stage = STUB_STAGE[command] ?? 'a later stage';
  errline(io, `'superjs ${command}' is not implemented yet (planned: ${stage}).`);
  return 2;
}
