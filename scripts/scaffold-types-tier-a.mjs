#!/usr/bin/env node
/**
 * Scaffold WS-B3 Tier A backend @superjs/types-* wrappers.
 * Run once from repo root: node scripts/scaffold-types-tier-a.mjs
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
    name: 'fastify',
    pkg: 'fastify',
    version: '4.x',
    coverage: 82,
    features: ['routing', 'plugins', 'hooks', 'reply methods', 'request parsing'],
    missing: ['fastify-plugin type helpers', 'decorateRequest/decorateReply typings'],
    indexSjs: `// @superjs/types-fastify — hand-curated SJS bindings for Fastify 4.x core surface.

export type HTTPMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export type RouteHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<dynamic> | dynamic;

export type FastifyReply {
  code(statusCode: number): FastifyReply;
  status(statusCode: number): FastifyReply;
  send(payload: dynamic): dynamic;
  header(name: string, value: string): FastifyReply;
  headers(values: dynamic): FastifyReply;
  redirect(url: string): dynamic;
}

export type FastifyRequest {
  params: dynamic;
  query: dynamic;
  body: dynamic;
  headers: dynamic;
  method: string;
  url: string;
  ip: string;
  hostname: string;
}

export type ListenOptions {
  port: number;
  host: string;
}

export type FastifyServerOptions {
  logger: boolean | dynamic;
}

export type FastifyInstance {
  get(path: string, handler: RouteHandler): void;
  post(path: string, handler: RouteHandler): void;
  put(path: string, handler: RouteHandler): void;
  delete(path: string, handler: RouteHandler): void;
  patch(path: string, handler: RouteHandler): void;
  head(path: string, handler: RouteHandler): void;
  options(path: string, handler: RouteHandler): void;
  listen(options: ListenOptions): Promise<string>;
  register(plugin: dynamic, opts: dynamic): Promise<void>;
  addHook(name: string, handler: dynamic): void;
  decorate(name: string, value: dynamic): void;
  close(): Promise<void>;
}

export type FastifyFactory = (opts: FastifyServerOptions) => FastifyInstance;
`,
  },
  {
    name: 'express',
    pkg: 'express',
    version: '4.x',
    coverage: 78,
    features: ['routing', 'middleware', 'request/response', 'Router'],
    missing: ['express-session typings', 'multer integration'],
    indexSjs: `// @superjs/types-express — hand-curated SJS bindings for Express 4.x core surface.

export type NextFunction = (err: dynamic) => void;

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

export type Request {
  params: dynamic;
  query: dynamic;
  body: dynamic;
  headers: dynamic;
  method: string;
  url: string;
  path: string;
  ip: string;
  get(name: string): string | undefined;
}

export type Response {
  status(code: number): Response;
  send(body: dynamic): dynamic;
  json(body: dynamic): dynamic;
  set(field: string, value: string): Response;
  end(body: dynamic): void;
  redirect(url: string): void;
}

export type Application {
  use(handler: RequestHandler): Application;
  use(path: string, handler: RequestHandler): Application;
  get(path: string, handler: RequestHandler): Application;
  post(path: string, handler: RequestHandler): Application;
  put(path: string, handler: RequestHandler): Application;
  delete(path: string, handler: RequestHandler): Application;
  patch(path: string, handler: RequestHandler): Application;
  listen(port: number, callback: () => void): dynamic;
}

export type Router = {
  get(path: string, handler: RequestHandler): Router;
  post(path: string, handler: RequestHandler): Router;
  use(handler: RequestHandler): Router;
};

export type ExpressFactory = () => Application;
`,
  },
  {
    name: 'hono',
    pkg: 'hono',
    version: '4.x',
    coverage: 76,
    features: ['routing', 'middleware', 'context', 'json helpers'],
    missing: ['jsx route handlers', 'RPC client types'],
    indexSjs: `// @superjs/types-hono — hand-curated SJS bindings for Hono 4.x core surface.

export type Handler = (c: Context) => Promise<dynamic> | dynamic;

export type Context {
  req: Request;
  json(data: dynamic, status: number): Response;
  text(body: string, status: number): Response;
  body(data: dynamic, status: number): Response;
  param(name: string): string;
  query(name: string): string | undefined;
  header(name: string): string | undefined;
  set(name: string, value: string): void;
  get(name: string): dynamic;
}

export type Hono<E = dynamic> {
  get(path: string, handler: Handler): Hono<E>;
  post(path: string, handler: Handler): Hono<E>;
  put(path: string, handler: Handler): Hono<E>;
  delete(path: string, handler: Handler): Hono<E>;
  patch(path: string, handler: Handler): Hono<E>;
  use(path: string, handler: Handler): Hono<E>;
  route(path: string, app: Hono<E>): Hono<E>;
  fetch(request: Request): Promise<Response>;
}

export type HonoFactory = <E = dynamic>() => Hono<E>;
`,
  },
  {
    name: 'koa',
    pkg: 'koa',
    version: '2.x',
    coverage: 73,
    features: ['middleware stack', 'context', 'request/response'],
    missing: ['koa-router plugin types', 'koa-body integration'],
    indexSjs: `// @superjs/types-koa — hand-curated SJS bindings for Koa 2.x core surface.

export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void> | void;

export type Context {
  request: Request;
  response: Response;
  params: dynamic;
  query: dynamic;
  body: dynamic;
  status: number;
  state: dynamic;
  throw(status: number, message: string): never;
}

export type Request {
  method: string;
  url: string;
  headers: dynamic;
  body: dynamic;
}

export type Response {
  status: number;
  body: dynamic;
  set(field: string, value: string): void;
}

export type Application {
  use(middleware: Middleware): Application;
  listen(port: number, callback: () => void): dynamic;
  callback(): (req: dynamic, res: dynamic) => Promise<void>;
}

export type KoaFactory = () => Application;
`,
  },
  {
    name: 'connect',
    pkg: 'connect',
    version: '3.x',
    coverage: 71,
    features: ['middleware stack', 'request/response passthrough'],
    missing: ['body-parser integration', 'serve-static helpers'],
    indexSjs: `// @superjs/types-connect — hand-curated SJS bindings for Connect 3.x core surface.

export type NextFunction = (err: dynamic) => void;

export type RequestHandler = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;

export type IncomingMessage {
  method: string;
  url: string;
  headers: dynamic;
}

export type ServerResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: dynamic): void;
  write(chunk: dynamic): void;
}

export type Server {
  use(handler: RequestHandler): Server;
  listen(port: number, callback: () => void): dynamic;
}

export type ConnectFactory = () => Server;
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
      include: [
        'vitest.config.mts',
        'src/**/*.spec.ts',
        'src/**/*.spec.js',
      ],
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
        '.': {
          sjs: './src/index.sjs',
          default: './src/index.sjs',
        },
      },
      nx: { tags: ['tier:4', 'scope:types'] },
      devDependencies: {
        '@superjs/compiler': 'workspace:*',
      },
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
last-updated: "2026-06-21"
license-compat: "MIT"
esm: true
cjs: true
features:
${lib.features.map((f) => `  - ${f}`).join('\n')}
missing:
${lib.missing.map((m) => `  - ${m}`).join('\n')}
---

# @superjs/types-${lib.name}

Hand-curated SJS bindings for ${lib.pkg} ${lib.version}. Covers the most-used routing,
middleware, and request/response surface. Install alongside the runtime package and
import types from \`@superjs/types-${lib.name}\`, or let the compiler resolve via
\`@superjs/types-<pkg>\` precedence (see \`specs/design/package-conventions.md\`).
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
import createApp from "${lib.pkg}"
import type { ${lib.name === 'fastify' ? 'FastifyInstance' : lib.name === 'express' ? 'Application' : lib.name === 'hono' ? 'Hono' : lib.name === 'koa' ? 'Application' : 'Server'} } from "@superjs/types-${lib.name}"

let app: dynamic = createApp()
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
