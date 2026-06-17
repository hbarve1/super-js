/**
 * Command implementations. Each takes parsed args + an {@link IO} and returns a
 * POSIX-ish exit code (0 ok, 1 diagnostics, 2 usage/not-implemented, 64 unknown).
 *
 * Real at v1.0: build, check, translate, add, format, lint, doc, explain, init,
 * doctor. Stubbed (print a planned-stage notice, exit 2): verify, migrate, test,
 * lsp, repl — they land in later stages but are wired so `superjs <cmd>` is defined.
 */

import { join, isAbsolute, basename, dirname } from 'node:path';
import { compile, format, lint, doc as extractDoc, renderMarkdown, renderJson } from '@superjs/compiler';
import { serveStdio } from '@superjs/lsp';
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
  verify: 'Stage 4', migrate: 'Stage 2', test: 'Stage 5', repl: 'Stage 6',
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
    // Strip trailing slashes without a backtracking regex (avoids ReDoS).
    let base = p;
    while (base.endsWith('/')) base = base.slice(0, -1);
    if (io.isDirectory(abs)) walkSjs(io, abs, base, out);
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
    errline(io, 'usage: superjs translate <files.d.ts...> [--out-dir dir]');
    return 2;
  }
  let translateDts: (source: string, fileName?: string) => { code: string; unsupported: readonly string[] };
  try {
    ({ translateDts } = await import('@superjs/interop'));
  } catch {
    errline(io, "error: the TypeScript interop layer failed to load — install 'typescript' (npm install -D typescript) and retry.");
    return 2;
  }

  const outDir = typeof args.flags['out-dir'] === 'string' ? (args.flags['out-dir'] as string) : undefined;
  const SUFFIX = '.d.ts';
  let failed = 0;
  for (const p of args.positionals) {
    if (!p.endsWith(SUFFIX)) { errline(io, `error: '${p}' is not a .d.ts file`); failed++; continue; }
    const abs = resolve(io, p);
    if (!io.exists(abs)) { errline(io, `error: cannot find file '${p}'`); failed++; continue; }
    const { code, unsupported } = translateDts(io.readFile(abs), basename(p));
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

// ── lint ──────────────────────────────────────────────────────────────────────

/**
 * Lint `.sjs` files (style rules SJS-L001…). Reports findings and exits non-zero
 * when any are present — lint findings are actionable by definition, so this
 * gates CI. `--format json` emits machine-readable diagnostics.
 */
export function lintCmd(args: ParsedArgs, io: IO): number {
  if (args.positionals.length === 0) { errline(io, 'usage: superjs lint <files...> [--format pretty|json]'); return 2; }
  const format: DiagnosticFormat = args.flags['format'] === 'json' ? 'json' : 'pretty';
  const { files, missing } = readSources(io, args.positionals);
  const findings: Diagnostic[] = [];
  for (const f of files) findings.push(...lint(f.source, f.filename));
  emitDiagnostics(io, findings, format);
  if (format !== 'json') {
    summary(io, findings);
    if (findings.length === 0 && missing === 0) line(io, 'No lint findings.');
  }
  return findings.length > 0 || missing > 0 ? 1 : 0;
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
export function init(_args: ParsedArgs, io: IO): number {
  const path = join(io.cwd(), CONFIG_FILENAME);
  if (io.exists(path)) { line(io, `${CONFIG_FILENAME} already exists — leaving it untouched.`); return 0; }
  io.writeFile(path, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  line(io, `created ${CONFIG_FILENAME}`);
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

// ── stubs ─────────────────────────────────────────────────────────────────────
export function stub(command: string, io: IO): number {
  const stage = STUB_STAGE[command] ?? 'a later stage';
  errline(io, `'superjs ${command}' is not implemented yet (planned: ${stage}).`);
  return 2;
}
