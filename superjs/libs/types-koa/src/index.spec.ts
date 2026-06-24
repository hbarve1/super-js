import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@superjs/compiler';

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, 'index.sjs'), 'utf8');

describe('@superjs/types-koa', () => {
  it('index.sjs compiles with no errors', async () => {
    const result = await compile([{ filename: 'index.sjs', source }], { sourceMap: 'none' });
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors, errors.map((e) => e.message).join('; ')).toEqual([]);
  });
});
