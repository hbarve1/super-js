/**
 * Config loading — parse JSON text and read `superjs.config.json` from disk.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DEFAULT_CONFIG } from './schema.js';
import { validateConfig, type ValidationResult } from './validate.js';

export const CONFIG_FILENAME = 'superjs.config.json';

/** Parse + validate config from a JSON string. JSON errors surface as a ConfigError. */
export function parseConfig(jsonText: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return {
      config: DEFAULT_CONFIG,
      errors: [{ path: '', message: `Invalid JSON: ${(e as Error).message}` }],
    };
  }
  return validateConfig(parsed);
}

export interface LoadResult extends ValidationResult {
  /** Absolute path the config was read from, or undefined if defaults were used. */
  readonly filePath?: string;
}

/** Load + validate a config file by path. Missing file → defaults, no error. */
export function loadConfigFile(filePath: string): LoadResult {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    return { config: DEFAULT_CONFIG, errors: [] };
  }
  const result = parseConfig(readFileSync(abs, 'utf8'));
  return { ...result, filePath: abs };
}

/** Walk up from `startDir` to filesystem root, returning the first config path. */
export function findConfigFile(startDir: string): string | undefined {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Discover + load the nearest config from `startDir` upward. */
export function loadConfig(startDir: string): LoadResult {
  const found = findConfigFile(startDir);
  if (!found) return { config: DEFAULT_CONFIG, errors: [] };
  return loadConfigFile(found);
}
