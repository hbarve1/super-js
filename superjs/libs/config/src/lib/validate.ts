/**
 * Dependency-free validation for superjs.config.json.
 *
 * A hand-rolled validator (keeps Tier 0 free of a JSON-schema runtime). Returns
 * collected errors plus a {@link ResolvedConfig} with defaults applied for all
 * valid fields (invalid fields fall back to defaults so a partial config still
 * yields a usable result).
 */

import {
  DEFAULT_CONFIG,
  TARGETS,
  type CompilerOptions,
  type Eol,
  type JsxOptions,
  type JsxRuntime,
  type OutputVariant,
  type ResolvedConfig,
  type SourceMapMode,
  type Target,
} from './schema.js';

export interface ConfigError {
  /** JSON path, e.g. `compilerOptions.target`. */
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly config: ResolvedConfig;
  readonly errors: readonly ConfigError[];
}

const SOURCE_MAP_MODES: readonly SourceMapMode[] = ['none', 'inline', 'external'];
const JSX_RUNTIMES: readonly JsxRuntime[] = ['automatic', 'classic'];
const EOLS: readonly Eol[] = ['lf', 'crlf', 'auto'];

const TOP_KEYS = new Set([
  'language', 'extends', 'compilerOptions', 'jsx', 'paths', 'output', 'lsp', 'env',
]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateConfig(input: unknown): ValidationResult {
  const errors: ConfigError[] = [];
  const err = (path: string, message: string): void => {
    errors.push({ path, message });
  };

  if (!isObject(input)) {
    err('', 'Config root must be an object.');
    return { config: DEFAULT_CONFIG, errors };
  }

  for (const key of Object.keys(input)) {
    if (!TOP_KEYS.has(key)) err(key, `Unknown config key '${key}'.`);
  }

  // language
  if (input['language'] !== undefined && input['language'] !== '1.0') {
    err('language', "Field 'language' must be '1.0' if present.");
  }
  if (input['extends'] !== undefined && typeof input['extends'] !== 'string') {
    err('extends', "Field 'extends' must be a string path.");
  }

  // compilerOptions
  const co = { ...DEFAULT_CONFIG.compilerOptions };
  const coMut = co as { -readonly [K in keyof CompilerOptions]: CompilerOptions[K] };
  if (input['compilerOptions'] !== undefined) {
    if (!isObject(input['compilerOptions'])) {
      err('compilerOptions', 'compilerOptions must be an object.');
    } else {
      const c = input['compilerOptions'];
      checkBool(c, 'strict', 'compilerOptions.strict', err, (v) => (coMut.strict = v));
      checkBool(c, 'noEmitOnError', 'compilerOptions.noEmitOnError', err, (v) => (coMut.noEmitOnError = v));
      checkBool(c, 'watch', 'compilerOptions.watch', err, (v) => (coMut.watch = v));
      checkEnum(c, 'target', 'compilerOptions.target', TARGETS, err, (v) => (coMut.target = v as Target));
      checkEnum(c, 'sourceMap', 'compilerOptions.sourceMap', SOURCE_MAP_MODES, err, (v) => (coMut.sourceMap = v as SourceMapMode));
      if (c['outDir'] !== undefined) {
        if (typeof c['outDir'] !== 'string') err('compilerOptions.outDir', 'outDir must be a string.');
        else coMut.outDir = c['outDir'];
      }
    }
  }

  // jsx
  const jsx = { ...DEFAULT_CONFIG.jsx };
  const jsxMut = jsx as { -readonly [K in keyof JsxOptions]: JsxOptions[K] };
  if (input['jsx'] !== undefined) {
    if (!isObject(input['jsx'])) err('jsx', 'jsx must be an object.');
    else {
      const j = input['jsx'];
      checkEnum(j, 'runtime', 'jsx.runtime', JSX_RUNTIMES, err, (v) => (jsxMut.runtime = v as JsxRuntime));
      checkString(j, 'importSource', 'jsx.importSource', err, (v) => (jsxMut.importSource = v));
      checkString(j, 'pragma', 'jsx.pragma', err, (v) => (jsxMut.pragma = v));
      checkString(j, 'pragmaFrag', 'jsx.pragmaFrag', err, (v) => (jsxMut.pragmaFrag = v));
    }
  }

  // paths
  let paths: Record<string, readonly string[]> = { ...DEFAULT_CONFIG.paths };
  if (input['paths'] !== undefined) {
    if (!isObject(input['paths'])) err('paths', 'paths must be an object.');
    else {
      const p: Record<string, readonly string[]> = {};
      for (const [k, v] of Object.entries(input['paths'])) {
        if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
          err(`paths.${k}`, 'Each path alias must map to an array of strings.');
        } else {
          p[k] = v as string[];
        }
      }
      paths = p;
    }
  }

  // output
  const output = { eol: DEFAULT_CONFIG.output.eol as Eol, variants: undefined as readonly OutputVariant[] | undefined };
  if (input['output'] !== undefined) {
    if (!isObject(input['output'])) err('output', 'output must be an object.');
    else {
      const o = input['output'];
      checkEnum(o, 'eol', 'output.eol', EOLS, err, (v) => (output.eol = v as Eol));
      if (o['variants'] !== undefined) {
        if (!Array.isArray(o['variants'])) err('output.variants', 'variants must be an array.');
        else output.variants = validateVariants(o['variants'], err);
      }
    }
  }

  // lsp
  let lspBudget = DEFAULT_CONFIG.lsp.memoryBudgetMB;
  if (input['lsp'] !== undefined) {
    if (!isObject(input['lsp'])) err('lsp', 'lsp must be an object.');
    else {
      const m = input['lsp']['memoryBudgetMB'];
      if (m !== undefined) {
        if (typeof m !== 'number' || !Number.isInteger(m) || m < 64 || m > 4096) {
          err('lsp.memoryBudgetMB', 'memoryBudgetMB must be an integer between 64 and 4096.');
        } else lspBudget = m;
      }
    }
  }

  // env
  let allowlist: readonly string[] = DEFAULT_CONFIG.env.allowlist;
  if (input['env'] !== undefined) {
    if (!isObject(input['env'])) err('env', 'env must be an object.');
    else if (input['env']['allowlist'] !== undefined) {
      const a = input['env']['allowlist'];
      if (!Array.isArray(a) || !a.every((x) => typeof x === 'string')) {
        err('env.allowlist', 'env.allowlist must be an array of strings.');
      } else allowlist = a as string[];
    }
  }

  const config: ResolvedConfig = {
    language: '1.0',
    ...(typeof input['extends'] === 'string' ? { extends: input['extends'] } : {}),
    compilerOptions: co,
    jsx,
    paths,
    output: output.variants ? { eol: output.eol, variants: output.variants } : { eol: output.eol },
    lsp: { memoryBudgetMB: lspBudget },
    env: { allowlist },
  };

  return { config, errors };
}

function validateVariants(
  arr: readonly unknown[],
  err: (p: string, m: string) => void,
): readonly OutputVariant[] {
  const out: OutputVariant[] = [];
  arr.forEach((v, i) => {
    if (!isObject(v)) {
      err(`output.variants[${i}]`, 'Each variant must be an object.');
      return;
    }
    const name = v['name'];
    const target = v['target'];
    if (typeof name !== 'string') {
      err(`output.variants[${i}].name`, 'variant.name is required and must be a string.');
      return;
    }
    if (typeof target !== 'string' || !TARGETS.includes(target as Target)) {
      err(`output.variants[${i}].target`, `variant.target must be one of ${TARGETS.join(', ')}.`);
      return;
    }
    const variant: OutputVariant = {
      name,
      target: target as Target,
      ...(typeof v['outDir'] === 'string' ? { outDir: v['outDir'] } : {}),
    };
    out.push(variant);
  });
  return out;
}

function checkBool(
  o: Record<string, unknown>, key: string, path: string,
  err: (p: string, m: string) => void, set: (v: boolean) => void,
): void {
  if (o[key] === undefined) return;
  if (typeof o[key] !== 'boolean') err(path, `${path} must be a boolean.`);
  else set(o[key] as boolean);
}

function checkString(
  o: Record<string, unknown>, key: string, path: string,
  err: (p: string, m: string) => void, set: (v: string) => void,
): void {
  if (o[key] === undefined) return;
  if (typeof o[key] !== 'string') err(path, `${path} must be a string.`);
  else set(o[key] as string);
}

function checkEnum(
  o: Record<string, unknown>, key: string, path: string,
  allowed: readonly string[], err: (p: string, m: string) => void, set: (v: string) => void,
): void {
  if (o[key] === undefined) return;
  if (typeof o[key] !== 'string' || !allowed.includes(o[key] as string)) {
    err(path, `${path} must be one of ${allowed.join(', ')}.`);
  } else set(o[key] as string);
}
