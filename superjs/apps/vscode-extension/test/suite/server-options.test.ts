/**
 * Unit tests for the (vscode-free) server-command resolution. Plain Node +
 * assert, matching the grammar test harness; throws on failure (non-zero exit).
 */

import * as assert from 'assert';
import { resolveServerCommand } from '../../src/server-options';

function run(): void {
  // Default: `superjs lsp` on PATH, no budget option.
  const def = resolveServerCommand();
  assert.strictEqual(def.command, 'superjs');
  assert.deepStrictEqual(def.args, ['lsp']);
  assert.deepStrictEqual(def.initializationOptions, {});

  // Explicit server path wins; whitespace is trimmed.
  assert.strictEqual(resolveServerCommand({ serverPath: '  /opt/superjs  ' }).command, '/opt/superjs');

  // Empty path falls back to the PATH lookup.
  assert.strictEqual(resolveServerCommand({ serverPath: '   ' }).command, 'superjs');

  // A positive budget is forwarded; non-positive is dropped.
  assert.strictEqual(resolveServerCommand({ memoryBudgetMB: 256 }).initializationOptions.memoryBudgetMB, 256);
  assert.deepStrictEqual(resolveServerCommand({ memoryBudgetMB: 0 }).initializationOptions, {});

  console.log('server-options.test: all assertions passed');
}

run();
