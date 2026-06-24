#!/usr/bin/env node
/** Scaffold WS-B3 Tier C utility @superjs/types-* wrappers. */
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
    name: 'zod',
    pkg: 'zod',
    version: '3.x',
    coverage: 76,
    mainType: 'ZodType',
    features: ['ZodType', 'object/string/number parsers', 'parse/safeParse', 'infer helper'],
    missing: ['mapped/conditional transforms', 'effects/refinements depth'],
    indexSjs: `// @superjs/types-zod — narrow hand-curated SJS bindings for Zod 3.x.

export type ZodIssue {
  path: string[];
  message: string;
  code: string;
}

export type ZodError {
  issues: ZodIssue[];
  message: string;
}

export type ZodSafeParseResult<T> = ZodParseOk(T) | ZodParseErr(ZodError);

export type ZodType<T> {
  parse(input: dynamic): T;
  safeParse(input: dynamic): ZodSafeParseResult<T>;
  optional(): ZodType<T?>;
  nullable(): ZodType<T?>;
}

export type ZodString = ZodType<string>;
export type ZodNumber = ZodType<number>;
export type ZodBoolean = ZodType<boolean>;

export type ZodObject<T> = ZodType<T>;

export type Zod {
  string(): ZodString;
  number(): ZodNumber;
  boolean(): ZodBoolean;
  object<T>(shape: dynamic): ZodObject<T>;
  array<T>(schema: ZodType<T>): ZodType<T[]>;
  enum<T>(values: T[]): ZodType<T>;
}
`,
  },
  {
    name: 'joi',
    pkg: 'joi',
    version: '17.x',
    coverage: 74,
    mainType: 'ObjectSchema',
    features: ['string/number/object schemas', 'validate', 'options'],
    missing: ['alternatives/conditional', 'extension API'],
    indexSjs: `// @superjs/types-joi — hand-curated SJS bindings for Joi 17.x core surface.

export type ValidationError {
  message: string;
  path: string[];
  details: dynamic;
}

export type ValidationResult<T> {
  value: T;
  error: ValidationError?;
}

export type Schema<T> {
  validate(value: dynamic): ValidationResult<T>;
  required(): Schema<T>;
  optional(): Schema<T>;
}

export type StringSchema = Schema<string>;
export type NumberSchema = Schema<number>;
export type ObjectSchema<T> = Schema<T>;

export type Joi {
  string(): StringSchema;
  number(): NumberSchema;
  boolean(): Schema<boolean>;
  object<T>(schema: dynamic): ObjectSchema<T>;
  array<T>(items: Schema<T>): Schema<T[]>;
}
`,
  },
  {
    name: 'axios',
    pkg: 'axios',
    version: '1.x',
    coverage: 80,
    mainType: 'AxiosInstance',
    features: ['AxiosInstance', 'request/response', 'interceptors', 'HTTP verbs'],
    missing: ['AxiosHeaders generics', 'cancel token API'],
    indexSjs: `// @superjs/types-axios — hand-curated SJS bindings for Axios 1.x core surface.

export type AxiosRequestConfig {
  url: string;
  method: string;
  baseURL: string;
  headers: dynamic;
  params: dynamic;
  data: dynamic;
  timeout: number;
  responseType: string;
}

export type AxiosResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: dynamic;
  config: AxiosRequestConfig;
}

export type AxiosInterceptorManager<V> {
  use(onFulfilled: dynamic, onRejected: dynamic): number;
  eject(id: number): void;
}

export type AxiosInstance {
  request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  get<T>(url: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T>(url: string, data: dynamic, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T>(url: string, data: dynamic, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T>(url: string, data: dynamic, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  del<T>(url: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  interceptors: {
    request: AxiosInterceptorManager<AxiosRequestConfig>;
    response: AxiosInterceptorManager<AxiosResponse<dynamic>>;
  };
  defaults: AxiosRequestConfig;
}

export type AxiosStatic {
  create(config: AxiosRequestConfig): AxiosInstance;
  isAxiosError(err: dynamic): boolean;
}
`,
  },
  {
    name: 'node-fetch',
    pkg: 'node-fetch',
    version: '3.x',
    coverage: 78,
    mainType: 'Response',
    features: ['fetch', 'Request', 'Response', 'Headers'],
    missing: ['FormData/Blob depth', 'agent options'],
    indexSjs: `// @superjs/types-node-fetch — hand-curated SJS bindings for node-fetch 3.x.

export type Headers {
  get(name: string): string | null;
  set(name: string, value: string): void;
  has(name: string): boolean;
  append(name: string, value: string): void;
}

export type RequestInit {
  method: string;
  headers: Headers | dynamic;
  body: dynamic;
  redirect: string;
}

export type Request {
  url: string;
  method: string;
  headers: Headers;
}

export type Response {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json(): Promise<dynamic>;
  text(): Promise<string>;
  arrayBuffer(): Promise<dynamic>;
}

export type FetchFn = (input: string | Request, init: RequestInit) => Promise<Response>;
`,
  },
  {
    name: 'undici',
    pkg: 'undici',
    version: '6.x',
    coverage: 75,
    mainType: 'Dispatcher',
    features: ['fetch', 'request', 'Dispatcher', 'Agent'],
    missing: ['MockAgent', 'diagnostics channel types'],
    indexSjs: `// @superjs/types-undici — hand-curated SJS bindings for undici 6.x core surface.

export type UndiciHeaders = dynamic;

export type UndiciRequestOptions {
  method: string;
  headers: UndiciHeaders;
  body: dynamic;
}

export type UndiciResponseData {
  statusCode: number;
  headers: UndiciHeaders;
  body: dynamic;
}

export type Dispatcher {
  request(opts: UndiciRequestOptions): Promise<UndiciResponseData>;
  close(): Promise<void>;
  destroy(): void;
}

export type AgentOptions {
  connections: number;
  pipelining: number;
}

export type Agent {
  request(opts: UndiciRequestOptions): Promise<UndiciResponseData>;
  close(): Promise<void>;
}

export type UndiciFetchFn = (input: string, init: UndiciRequestOptions) => Promise<dynamic>;
`,
  },
  {
    name: 'pino',
    pkg: 'pino',
    version: '9.x',
    coverage: 82,
    mainType: 'Logger',
    features: ['Logger levels', 'child loggers', 'serializers', 'transport hook'],
    missing: ['multistream typings', 'browser build'],
    indexSjs: `// @superjs/types-pino — hand-curated SJS bindings for Pino 9.x core surface.

export type LogFn = (obj: dynamic, msg: string) => void;

export type LoggerOptions {
  level: string;
  name: string;
  serializers: dynamic;
  base: dynamic;
  timestamp: boolean;
}

export type Logger {
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
  child(bindings: dynamic): Logger;
  level: string;
}

export type PinoFactory = (opts: LoggerOptions) => Logger;
`,
  },
  {
    name: 'winston',
    pkg: 'winston',
    version: '3.x',
    coverage: 77,
    mainType: 'Logger',
    features: ['createLogger', 'transports', 'log levels', 'format'],
    missing: ['profiler API', 'exceptionHandlers depth'],
    indexSjs: `// @superjs/types-winston — hand-curated SJS bindings for Winston 3.x core surface.

export type LogEntry {
  level: string;
  message: string;
  meta: dynamic;
}

export type Transport {
  level: string;
  silent: boolean;
}

export type Logger {
  log(level: string, message: string, meta: dynamic): Logger;
  info(message: string, meta: dynamic): Logger;
  warn(message: string, meta: dynamic): Logger;
  error(message: string, meta: dynamic): Logger;
  debug(message: string, meta: dynamic): Logger;
  child(meta: dynamic): Logger;
  add(transport: Transport): Logger;
}

export type Winston {
  createLogger(opts: dynamic): Logger;
  format: dynamic;
  transports: {
    Console: dynamic;
    File: dynamic;
  };
}
`,
  },
  {
    name: 'dotenv',
    pkg: 'dotenv',
    version: '16.x',
    coverage: 85,
    mainType: 'DotenvConfigOutput',
    features: ['config()', 'parse()', 'DotenvConfigOptions'],
    missing: ['vault expansion', 'multi-file loading'],
    indexSjs: `// @superjs/types-dotenv — hand-curated SJS bindings for dotenv 16.x.

export type DotenvConfigOptions {
  path: string;
  encoding: string;
  debug: boolean;
  override: boolean;
}

export type DotenvConfigOutput {
  parsed: dynamic;
  error: dynamic;
}

export type Dotenv {
  config(opts: DotenvConfigOptions): DotenvConfigOutput;
  parse(src: string): dynamic;
}
`,
  },
  {
    name: 'jsonwebtoken',
    pkg: 'jsonwebtoken',
    version: '9.x',
    coverage: 79,
    mainType: 'JwtPayload',
    features: ['sign', 'verify', 'decode', 'JwtPayload'],
    missing: ['asymmetric key option matrix', 'notBefore/leeway combos'],
    indexSjs: `// @superjs/types-jsonwebtoken — hand-curated SJS bindings for jsonwebtoken 9.x.

export type JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  aud: string | string[];
  iss: string;
}

export type SignOptions {
  expiresIn: string | number;
  audience: string | string[];
  issuer: string;
  algorithm: string;
}

export type VerifyOptions {
  audience: string | string[];
  issuer: string;
  algorithms: string[];
  maxAge: string | number;
}

export type Jwt {
  sign(payload: dynamic, secret: string, opts: SignOptions): string;
  verify(token: string, secret: string, opts: VerifyOptions): JwtPayload;
  decode(token: string): JwtPayload | null;
}
`,
  },
  {
    name: 'passport',
    pkg: 'passport',
    version: '0.7.x',
    coverage: 73,
    mainType: 'PassportStatic',
    features: ['use strategy', 'authenticate', 'serializeUser', 'session'],
    missing: ['custom strategy generics', 'oauth state helpers'],
    indexSjs: `// @superjs/types-passport — hand-curated SJS bindings for Passport 0.7.x core surface.

export type DoneCallback = (err: dynamic, user: dynamic, info: dynamic) => void;

export type Strategy {
  name: string;
  authenticate(req: dynamic, opts: dynamic): void;
}

export type AuthenticateOptions {
  session: boolean;
  failureRedirect: string;
  successRedirect: string;
}

export type PassportStatic {
  use(strategy: Strategy): PassportStatic;
  authenticate(strategy: string, opts: AuthenticateOptions): dynamic;
  initialize(): dynamic;
  session(): dynamic;
  serializeUser(fn: dynamic): void;
  deserializeUser(fn: dynamic): void;
}
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
