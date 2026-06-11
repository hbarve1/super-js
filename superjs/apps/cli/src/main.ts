#!/usr/bin/env node
/**
 * `superjs` binary entry point. The only module that touches `process` argv /
 * exit — all logic lives in {@link run} for testability.
 */

import { run } from './lib/run.js';

run(process.argv.slice(2))
  .then((code) => { process.exitCode = code; })
  .catch((err: unknown) => {
    process.stderr.write(`fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 70; // EX_SOFTWARE
  });
