#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const schema = JSON.parse(readFileSync(join(root, 'specs/diagnostics.schema.json'), 'utf8'));
const ajv = new Ajv({ strict: true });
const validate = ajv.compile(schema);

const fixturesDir = join(root, 'specs/fixtures/diagnostics');
const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'));

let total = 0, errors = 0;
for (const file of files) {
  const diagnostics = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8'));
  for (const diag of diagnostics) {
    total++;
    if (!validate(diag)) {
      console.error(`FAIL ${file}: ${JSON.stringify(validate.errors)}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors}/${total} diagnostics failed validation`);
  process.exit(1);
}
console.log(`OK: ${total} diagnostics validated against specs/diagnostics.schema.json`);
