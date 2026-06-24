#!/usr/bin/env node
/** Scaffold WS-B3 Tier D cloud/worker @superjs/types-* wrappers. */
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
    name: 'aws-sdk-core',
    pkg: '@aws-sdk/client-*',
    version: '3.x',
    coverage: 71,
    mainType: 'SmithyClient',
    features: ['ClientConfig', 'send command', 'middleware stack', 'region/credentials'],
    missing: ['per-service command input/output shapes', 'waiters/paginators'],
    indexSjs: `// @superjs/types-aws-sdk-core — narrow SJS bindings for AWS SDK v3 client core.

export type AwsCredentialIdentity {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export type ClientDefaults {
  region: string;
  credentials: AwsCredentialIdentity | dynamic;
  maxAttempts: number;
}

export type Command {
  input: dynamic;
  resolveMiddleware(stack: MiddlewareStack, config: dynamic, opts: dynamic): dynamic;
}

export type MiddlewareStack {
  add(middleware: dynamic, opts: dynamic): void;
  clone(): MiddlewareStack;
}

export type SmithyClient {
  config: ClientDefaults;
  send(command: Command): Promise<dynamic>;
  destroy(): void;
}

export type ServiceClientFactory = (config: ClientDefaults) => SmithyClient;
`,
  },
  {
    name: 'cloudflare-workers',
    pkg: '@cloudflare/workers-types',
    version: '4.x',
    coverage: 76,
    mainType: 'Fetcher',
    features: ['fetch handler', 'Request/Response', 'ExecutionContext', 'KV/R2 bindings'],
    missing: ['Durable Objects stubs', 'Queues consumer depth'],
    indexSjs: `// @superjs/types-cloudflare-workers — hand-curated SJS bindings for Workers 4.x.

export type CfProperties = dynamic;

export type CfRequest extends Request {
  cf: CfProperties;
}

export type ExecutionContext {
  waitUntil(promise: Promise<dynamic>): void;
  passThroughOnException(): void;
}

export type ExportedHandler<E> {
  fetch(request: Request, env: E, ctx: ExecutionContext): Promise<Response> | Response;
  scheduled(event: ScheduledEvent, env: E, ctx: ExecutionContext): Promise<void> | void;
}

export type ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

export type KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts: dynamic): Promise<void>;
  del(key: string): Promise<void>;
  list(opts: dynamic): Promise<dynamic>;
}

export type R2Bucket {
  get(key: string): Promise<dynamic>;
  put(key: string, value: dynamic, opts: dynamic): Promise<dynamic>;
  head(key: string): Promise<dynamic>;
  del(keys: string | string[]): Promise<void>;
}

export type Fetcher {
  fetch(input: Request | string, init: dynamic): Promise<Response>;
}
`,
  },
  {
    name: 'bullmq',
    pkg: 'bullmq',
    version: '5.x',
    coverage: 78,
    mainType: 'Queue',
    features: ['Queue', 'Worker', 'Job', 'add/process lifecycle'],
    missing: ['FlowProducer', 'QueueScheduler internals'],
    indexSjs: `// @superjs/types-bullmq — hand-curated SJS bindings for BullMQ 5.x core surface.

export type JobsOptions {
  delay: number;
  attempts: number;
  priority: number;
  removeOnComplete: boolean | number;
  removeOnFail: boolean | number;
}

export type Job<T> {
  id: string;
  name: string;
  data: T;
  progress: number;
  updateProgress(progress: number): Promise<void>;
  moveToCompleted(returnvalue: dynamic, token: string): Promise<void>;
  moveToFailed(err: dynamic, token: string): Promise<void>;
}

export type QueueOptions {
  connection: dynamic;
  defaultJobOptions: JobsOptions;
}

export type Queue<T> {
  name: string;
  add(name: string, data: T, opts: JobsOptions): Promise<Job<T>>;
  getJob(id: string): Promise<Job<T> | null>;
  close(): Promise<void>;
  obliterate(opts: dynamic): Promise<void>;
}

export type Processor<T> = (job: Job<T>) => Promise<dynamic>;

export type WorkerOptions {
  connection: dynamic;
  concurrency: number;
}

export type Worker<T> {
  on(event: string, handler: dynamic): Worker<T>;
  close(): Promise<void>;
  run(): Promise<void>;
}
`,
  },
  {
    name: 'multer',
    pkg: 'multer',
    version: '1.x',
    coverage: 80,
    mainType: 'Multer',
    features: ['disk/memory storage', 'single/array/fields', 'File metadata'],
    missing: ['custom storage engine API', 'limits option matrix'],
    indexSjs: `// @superjs/types-multer — hand-curated SJS bindings for Multer 1.x core surface.

export type File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: dynamic;
}

export type Multer {
  single(fieldName: string): dynamic;
  array(fieldName: string, maxCount: number): dynamic;
  fields(fields: dynamic): dynamic;
  none(): dynamic;
  any(): dynamic;
}

export type StorageEngine {
  _handleFile(req: dynamic, file: dynamic, cb: dynamic): void;
  _removeFile(req: dynamic, file: dynamic, cb: dynamic): void;
}

export type MulterOptions {
  storage: StorageEngine | dynamic;
  limits: dynamic;
  fileFilter: dynamic;
}

export type MulterFactory = (opts: MulterOptions) => Multer;
`,
  },
  {
    name: 'supertest',
    pkg: 'supertest',
    version: '6.x',
    coverage: 75,
    mainType: 'Test',
    features: ['HTTP verbs', 'expect status/body', 'agent', 'cookies'],
    missing: ['full superagent response typings', 'multipart uploads'],
    indexSjs: `// @superjs/types-supertest — hand-curated SJS bindings for SuperTest 6.x core surface.

export type TestCallback = (err: dynamic, res: Response) => void;

export type Response {
  status: number;
  statusCode: number;
  headers: dynamic;
  body: dynamic;
  text: string;
  type: string;
  header: dynamic;
}

export type Test {
  get(path: string): Test;
  post(path: string): Test;
  put(path: string): Test;
  patch(path: string): Test;
  del(path: string): Test;
  send(data: dynamic): Test;
  set(field: string, value: string): Test;
  query(params: dynamic): Test;
  expect(status: number): Test;
  expect(body: dynamic): Test;
  end(fn: TestCallback): void;
  then(resolve: dynamic, reject: dynamic): Promise<Response>;
}

export type SuperTestStatic {
  agent(app: dynamic): Test;
}

export type SuperTestFactory = (app: dynamic) => Test;
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
    { extends: '../../tsconfig.base.json', files: [], include: [], references: [{ path: './tsconfig.lib.json' }, { path: './tsconfig.spec.json' }] },
    null,
    2,
  );
}

function tsconfigLib() {
  return JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: { rootDir: '.', outDir: 'dist', forceConsistentCasingInFileNames: true, types: ['node'] },
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
      exports: { './package.json': './package.json', '.': { sjs: './src/index.sjs', default: './src/index.sjs' } },
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

Hand-curated SJS bindings for ${lib.pkg} ${lib.version}.
`;
}

function readme(lib) {
  return `# @superjs/types-${lib.name}

Typed SuperJS bindings for \`${lib.pkg}\` ${lib.version}.

## Install

\`\`\`bash
pnpm add <runtime-package> @superjs/types-${lib.name}
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
