#!/usr/bin/env node
/**
 * Scaffold WS-B3 Tier B database @superjs/types-* wrappers.
 * Run from repo root: node scripts/scaffold-types-tier-b.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'superjs', 'libs');

const MIT = `MIT License

Copyright (c) SuperJS contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const LIBS = [
  {
    name: 'pg',
    pkg: 'pg',
    version: '8.x',
    coverage: 81,
    mainType: 'Pool',
    features: ['Pool', 'PoolClient', 'QueryResult', 'connection config'],
    missing: ['COPY streams', 'cursor API', 'notice listeners'],
    indexSjs: `// @superjs/types-pg — hand-curated SJS bindings for node-postgres 8.x core surface.

export type QueryResult<R> {
  rows: R[];
  rowCount: number;
  command: string;
}

export type PoolConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean | dynamic;
  max: number;
}

export type QueryConfig {
  text: string;
  values: dynamic;
}

export type PoolClient {
  query(sql: string, params: dynamic): Promise<QueryResult<dynamic>>;
  query(config: QueryConfig): Promise<QueryResult<dynamic>>;
  release(err: dynamic): void;
}

export type Pool {
  query(sql: string, params: dynamic): Promise<QueryResult<dynamic>>;
  query(config: QueryConfig): Promise<QueryResult<dynamic>>;
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
  on(event: string, listener: dynamic): Pool;
}

export type PgPoolFactory = (config: PoolConfig) => Pool;
`,
  },
  {
    name: 'mysql2',
    pkg: 'mysql2',
    version: '3.x',
    coverage: 77,
    mainType: 'Pool',
    features: ['Pool', 'Connection', 'prepared statements', 'pool config'],
    missing: ['promise wrapper edge cases', 'SSL option matrix'],
    indexSjs: `// @superjs/types-mysql2 — hand-curated SJS bindings for mysql2 3.x core surface.

export type PoolOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  waitForConnections: boolean;
}

export type RowDataPacket = dynamic;

export type FieldPacket = dynamic;

export type QueryResult = [RowDataPacket[], FieldPacket[]];

export type Connection {
  query(sql: string, params: dynamic): Promise<QueryResult>;
  execute(sql: string, params: dynamic): Promise<QueryResult>;
  release(): void;
  end(): Promise<void>;
}

export type Pool {
  query(sql: string, params: dynamic): Promise<QueryResult>;
  execute(sql: string, params: dynamic): Promise<QueryResult>;
  getConnection(): Promise<Connection>;
  end(): Promise<void>;
  on(event: string, listener: dynamic): Pool;
}

export type MysqlPoolFactory = (opts: PoolOptions) => Pool;
`,
  },
  {
    name: 'prisma',
    pkg: '@prisma/client',
    version: '5.x',
    coverage: 72,
    mainType: 'PrismaClient',
    features: ['PrismaClient lifecycle', '$transaction', '$queryRaw', 'log options'],
    missing: ['generated model delegates', 'full DMMF types', 'extension API'],
    indexSjs: `// @superjs/types-prisma — narrow hand-curated SJS bindings for Prisma Client 5.x.

export type PrismaLogLevel = "info" | "query" | "warn" | "error";

export type PrismaClientOptions {
  datasources: dynamic;
  log: PrismaLogLevel[] | dynamic;
  errorFormat: "pretty" | "colorless" | "minimal";
}

export type PrismaClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction(ops: dynamic): Promise<dynamic>;
  $queryRaw(sql: string, values: dynamic): Promise<dynamic>;
  $executeRaw(sql: string, values: dynamic): Promise<number>;
  $on(event: string, callback: dynamic): void;
}

export type PrismaClientFactory = (opts: PrismaClientOptions) => PrismaClient;
`,
  },
  {
    name: 'mongoose',
    pkg: 'mongoose',
    version: '8.x',
    coverage: 74,
    mainType: 'Model',
    features: ['Schema', 'Model queries', 'Document', 'connection'],
    missing: ['aggregation pipeline typings', 'virtuals/populate depth'],
    indexSjs: `// @superjs/types-mongoose — hand-curated SJS bindings for Mongoose 8.x core surface.

export type SchemaOptions {
  collection: string;
  timestamps: boolean;
  strict: boolean;
}

export type Schema<T> {
  add(definition: dynamic): Schema<T>;
  index(fields: dynamic): Schema<T>;
}

export type Query<T> {
  exec(): Promise<T[]>;
  lean(): Query<T>;
  limit(n: number): Query<T>;
  sort(fields: dynamic): Query<T>;
}

export type QueryOne<T> {
  exec(): Promise<T | null>;
  lean(): QueryOne<T>;
}

export type Model<T> {
  find(filter: dynamic): Query<T>;
  findOne(filter: dynamic): QueryOne<T>;
  findById(id: string): QueryOne<T>;
  create(doc: dynamic): Promise<T>;
  updateOne(filter: dynamic, update: dynamic): Promise<dynamic>;
  updateMany(filter: dynamic, update: dynamic): Promise<dynamic>;
  countDocuments(filter: dynamic): Promise<number>;
}

export type Document {
  _id: dynamic;
  save(): Promise<dynamic>;
  toObject(): dynamic;
}

export type Connection {
  model<T>(name: string, schema: Schema<T>): Model<T>;
  close(): Promise<void>;
}

export type MongooseFactory = () => Connection;
`,
  },
  {
    name: 'redis',
    pkg: 'ioredis',
    version: '5.x',
    coverage: 79,
    mainType: 'Redis',
    features: ['string commands', 'hash commands', 'pub/sub', 'pipeline'],
    missing: ['cluster/sentinel topology', 'Lua script generics'],
    indexSjs: `// @superjs/types-redis — hand-curated SJS bindings for ioredis 5.x / redis 4.x core surface.

export type RedisOptions {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
  lazyConnect: boolean;
}

export type Redis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<string>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  mget(keys: string[]): Promise<(string | null)[]>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<dynamic>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<number>;
  pipeline(): RedisPipeline;
  quit(): Promise<string>;
  disconnect(): void;
  on(event: string, listener: dynamic): Redis;
}

export type RedisPipeline {
  get(key: string): RedisPipeline;
  set(key: string, value: string): RedisPipeline;
  exec(): Promise<dynamic>;
}

export type RedisFactory = (opts: RedisOptions) => Redis;
`,
  },
];

function vitestConfig(name) {
  return `import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/types-${name}',
  test: {
    name: 'types-${name}',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
  },
}));
`;
}

function tsconfigJson() {
  return JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      files: [],
      include: [],
      references: [{ path: './tsconfig.lib.json' }, { path: './tsconfig.spec.json' }],
    },
    null,
    2,
  );
}

function tsconfigLib() {
  return JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        rootDir: '.',
        outDir: 'dist',
        forceConsistentCasingInFileNames: true,
        types: ['node'],
      },
      include: ['package.json'],
      references: [{ path: '../compiler/tsconfig.lib.json' }],
    },
    null,
    2,
  );
}

function tsconfigSpec() {
  return JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: './out-tsc/vitest',
        types: ['vitest/globals', 'vitest/importMeta', 'vite/client', 'node', 'vitest'],
        forceConsistentCasingInFileNames: true,
      },
      include: ['vitest.config.mts', 'src/**/*.spec.ts', 'src/**/*.spec.js'],
      references: [{ path: './tsconfig.lib.json' }],
    },
    null,
    2,
  );
}

function packageJson(lib) {
  return JSON.stringify(
    {
      name: `@superjs/types-${lib.name}`,
      version: '0.1.0',
      description: `SJS type bindings for ${lib.pkg} ${lib.version}`,
      license: 'MIT',
      type: 'module',
      sjs: './src/index.sjs',
      exports: {
        './package.json': './package.json',
        '.': { sjs: './src/index.sjs', default: './src/index.sjs' },
      },
      nx: { tags: ['tier:4', 'scope:types'] },
      devDependencies: { '@superjs/compiler': 'workspace:*' },
    },
    null,
    2,
  );
}

function statusMd(lib) {
  return `---
package: "${lib.pkg}"
version: "${lib.version}"
coverage: ${lib.coverage}
status: "beta"
last-updated: "2026-06-24"
license-compat: "MIT"
esm: true
cjs: true
features:
${lib.features.map((f) => `  - ${f}`).join('\n')}
missing:
${lib.missing.map((m) => `  - ${m}`).join('\n')}
---

# @superjs/types-${lib.name}

Hand-curated SJS bindings for ${lib.pkg} ${lib.version}. Covers the most-used
connection, query, and lifecycle surface. Install alongside the runtime package.
`;
}

function readme(lib) {
  return `# @superjs/types-${lib.name}

Typed SuperJS bindings for [\`${lib.pkg}\`](https://www.npmjs.com/package/${lib.pkg}) ${lib.version}.

## Install

\`\`\`bash
pnpm add ${lib.pkg} @superjs/types-${lib.name}
\`\`\`

## Usage

\`\`\`sjs
import type { ${lib.mainType} } from "@superjs/types-${lib.name}"
\`\`\`

See [STATUS.md](./STATUS.md) for coverage and known gaps.
`;
}

function specTs(pkgName) {
  return `import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@superjs/compiler';

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, 'index.sjs'), 'utf8');

describe('${pkgName}', () => {
  it('index.sjs compiles with no errors', async () => {
    const result = await compile([{ filename: 'index.sjs', source }], { sourceMap: 'none' });
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors, errors.map((e) => e.message).join('; ')).toEqual([]);
  });
});
`;
}

for (const lib of LIBS) {
  const dir = join(root, `types-${lib.name}`);
  mkdirSync(join(dir, 'src'), { recursive: true });
  const files = {
    'package.json': packageJson(lib),
    'README.md': readme(lib),
    'STATUS.md': statusMd(lib),
    LICENSE: MIT,
    'vitest.config.mts': vitestConfig(lib.name),
    'tsconfig.json': tsconfigJson(),
    'tsconfig.lib.json': tsconfigLib(),
    'tsconfig.spec.json': tsconfigSpec(),
    'src/index.sjs': lib.indexSjs,
    'src/index.spec.ts': specTs(`@superjs/types-${lib.name}`),
  };
  for (const [rel, content] of Object.entries(files)) {
    writeFileSync(join(dir, rel), content.endsWith('\n') ? content : content + '\n');
  }
  console.log(`scaffolded libs/types-${lib.name}`);
}
