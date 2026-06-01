#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const schema = JSON.parse(readFileSync(join(root, 'spec/config-schema.json'), 'utf8'));
const ajv = new Ajv({ strict: true });
const validate = ajv.compile(schema);

const fixturesDir = join(root, 'spec/fixtures/configs');
const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
let errors = 0;
for (const file of files) {
  const config = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8'));
  if (!validate(config)) {
    console.error(`FAIL ${file}: ${JSON.stringify(validate.errors)}`);
    errors++;
  } else {
    console.log(`OK   ${file}`);
  }
}
if (errors > 0) { console.error(`\n${errors} config(s) failed`); process.exit(1); }
console.log('\nAll config fixtures valid');
