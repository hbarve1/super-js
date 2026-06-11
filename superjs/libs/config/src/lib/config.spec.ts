import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_CONFIG,
  validateConfig,
  parseConfig,
  loadConfigFile,
  findConfigFile,
  loadConfig,
  CONFIG_FILENAME,
} from '../index.js';

describe('defaults', () => {
  it('match the spec defaults', () => {
    expect(DEFAULT_CONFIG.compilerOptions.target).toBe('ES2022');
    expect(DEFAULT_CONFIG.compilerOptions.strict).toBe(false);
    expect(DEFAULT_CONFIG.jsx.runtime).toBe('automatic');
    expect(DEFAULT_CONFIG.output.eol).toBe('lf');
    expect(DEFAULT_CONFIG.lsp.memoryBudgetMB).toBe(128);
  });
});

describe('validateConfig', () => {
  it('accepts an empty config and fills defaults', () => {
    const { config, errors } = validateConfig({});
    expect(errors).toHaveLength(0);
    expect(config.compilerOptions.target).toBe('ES2022');
  });

  it('merges a partial config over defaults', () => {
    const { config, errors } = validateConfig({
      compilerOptions: { strict: true, target: 'ESNext' },
    });
    expect(errors).toHaveLength(0);
    expect(config.compilerOptions.strict).toBe(true);
    expect(config.compilerOptions.target).toBe('ESNext');
    expect(config.compilerOptions.sourceMap).toBe('none'); // default preserved
  });

  it('rejects unknown top-level keys', () => {
    const { errors } = validateConfig({ nope: 1 });
    expect(errors.some((e) => e.path === 'nope')).toBe(true);
  });

  it('rejects invalid enum values', () => {
    const { errors } = validateConfig({ compilerOptions: { target: 'ES1999' } });
    expect(errors.some((e) => e.path === 'compilerOptions.target')).toBe(true);
  });

  it('rejects wrong language version', () => {
    const { errors } = validateConfig({ language: '2.0' });
    expect(errors.some((e) => e.path === 'language')).toBe(true);
  });

  it('validates lsp memory bounds', () => {
    expect(validateConfig({ lsp: { memoryBudgetMB: 32 } }).errors).toHaveLength(1);
    expect(validateConfig({ lsp: { memoryBudgetMB: 256 } }).errors).toHaveLength(0);
  });

  it('validates output variants (name + target required)', () => {
    const ok = validateConfig({
      output: { variants: [{ name: 'esm', target: 'ES2022' }] },
    });
    expect(ok.errors).toHaveLength(0);
    expect(ok.config.output.variants?.[0]?.name).toBe('esm');

    const bad = validateConfig({ output: { variants: [{ target: 'ES2022' }] } });
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('validates path aliases as string arrays', () => {
    expect(validateConfig({ paths: { '@/*': ['src/*'] } }).errors).toHaveLength(0);
    expect(validateConfig({ paths: { '@/*': 'src/*' } }).errors).toHaveLength(1);
  });
});

describe('parseConfig', () => {
  it('reports invalid JSON', () => {
    const { errors } = parseConfig('{ not json');
    expect(errors[0]?.message).toMatch(/Invalid JSON/);
  });

  it('parses + validates valid JSON', () => {
    const { config, errors } = parseConfig('{"compilerOptions":{"watch":true}}');
    expect(errors).toHaveLength(0);
    expect(config.compilerOptions.watch).toBe(true);
  });
});

describe('file loading', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sjs-config-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('loads from a file and discovers upward', () => {
    const file = join(dir, CONFIG_FILENAME);
    writeFileSync(file, '{"compilerOptions":{"strict":true}}');

    const loaded = loadConfigFile(file);
    expect(loaded.filePath).toBe(file);
    expect(loaded.config.compilerOptions.strict).toBe(true);

    const nested = join(dir, 'a', 'b');
    expect(findConfigFile(dir)).toBe(file);
    // findConfigFile walks up from a (non-existent) nested start dir
    expect(loadConfig(nested).config.compilerOptions.strict).toBe(true);
  });

  it('returns defaults with no error when file is absent', () => {
    const res = loadConfigFile(join(dir, 'does-not-exist.json'));
    expect(res.errors).toHaveLength(0);
    expect(res.config).toEqual(DEFAULT_CONFIG);
  });
});
