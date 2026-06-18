import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from '@superjs/compiler';
import { STDLIB_MODULES } from './index.js';

const MODULES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'modules');

describe('@superjs/stdlib — every module type-checks and emits', () => {
  for (const name of STDLIB_MODULES) {
    it(`${name}.sjs compiles with no errors`, async () => {
      const filename = `${name}.sjs`;
      const source = readFileSync(join(MODULES_DIR, filename), 'utf8');
      const result = await compile([{ filename, source }], { sourceMap: 'none' });
      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      expect(errors, `${filename}: ${errors.map((e) => e.message).join('; ')}`).toEqual([]);
      expect(result.outputs.size).toBeGreaterThan(0);
    });
  }

  it('emits Option/Result helpers from std-core', async () => {
    const source = readFileSync(join(MODULES_DIR, 'std-core.sjs'), 'utf8');
    const result = await compile([{ filename: 'std-core.sjs', source }], { sourceMap: 'none' });
    const [, output] = [...result.outputs][0]!;
    expect(output.code).toContain('function unwrapOr');
    expect(output.code).toContain('function ok');
  });
});
