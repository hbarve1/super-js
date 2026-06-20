/**
 * CLI build emits flat `dist/<basename>.js`; restore subdirs and bundle stdlib shims.
 */
import { mkdirSync, renameSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const superjsCli = join(root, '../../superjs/apps/cli/dist/main.js');
const stdlibSrc = join(root, '../../superjs/libs/stdlib/src/modules');

const moves = [
  ['health.js', 'routes/health.js'],
  ['users.js', 'routes/users.js'],
  ['user.js', 'types/user.js'],
  ['logger.js', 'middleware/logger.js'],
];

for (const [flat, nested] of moves) {
  const from = join(dist, flat);
  const to = join(dist, nested);
  if (!existsSync(from)) continue;
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
}

const vendor = join(dist, '_vendor');
mkdirSync(vendor, { recursive: true });
execSync(
  `node "${superjsCli}" build "${join(stdlibSrc, 'std-core.sjs')}" "${join(stdlibSrc, 'std-collections.sjs')}" --out-dir "${vendor}"`,
  { stdio: 'inherit', cwd: root },
);

const usersPath = join(dist, 'routes/users.js');
if (existsSync(usersPath)) {
  let code = readFileSync(usersPath, 'utf8');
  code = code.replace('@superjs/std-core', '../_vendor/std-core.js');
  code = code.replace('@superjs/std-collections', '../_vendor/std-collections.js');
  writeFileSync(usersPath, code);
}
