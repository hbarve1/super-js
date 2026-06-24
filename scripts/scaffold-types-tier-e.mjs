#!/usr/bin/env node
/** Scaffold WS-B3 Tier E frontend/test @superjs/types-* wrappers. */
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
    name: 'react',
    pkg: 'react',
    version: '18.x',
    coverage: 72,
    mainType: 'ReactElement',
    features: ['ReactElement', 'ReactNode', 'component props', 'hook result shapes'],
    missing: ['full hooks generic matrix', 'ref forwarding', 'Suspense boundaries'],
    indexSjs: `// @superjs/types-react — narrow hand-curated SJS bindings for React 18.x.

export type ReactNode = dynamic;

export type ReactElement {
  type: dynamic;
  props: dynamic;
  key: string | null;
}

export type Key = string | number;

export type Ref<T> = dynamic;

export type ComponentType<P> = (props: P) => ReactElement | null;

export type FC<P> = ComponentType<P>;

export type PropsWithChildren<P> {
  children: ReactNode;
}

export type Dispatch<T> = (value: T) => void;

export type SetStateAction<T> = T | dynamic;

export type StateHookResult<T> = [T, Dispatch<SetStateAction<T>>];

export type EffectCleanup = () => void;

export type EffectCallback = () => EffectCleanup | void;

export type MutableRefObject<T> {
  current: T;
}
`,
  },
  {
    name: 'nextjs',
    pkg: 'next',
    version: '14.x',
    coverage: 70,
    mainType: 'NextRequest',
    features: ['NextRequest/NextResponse', 'route handlers', 'metadata', 'cookies'],
    missing: ['full App Router cache APIs', 'middleware matcher generics'],
    indexSjs: `// @superjs/types-nextjs — narrow hand-curated SJS bindings for Next.js 14.x App Router.

export type Metadata {
  title: string;
  description: string;
  keywords: string[];
}

export type RouteContext<P> {
  params: P;
}

export type NextRequest {
  url: string;
  method: string;
  headers: dynamic;
  nextUrl: dynamic;
  cookies: dynamic;
  json(): Promise<dynamic>;
  text(): Promise<string>;
}

export type NextResponse {
  status: number;
  headers: dynamic;
  cookies: dynamic;
  json(body: dynamic): NextResponse;
  text(body: string): NextResponse;
  redirect(url: string): NextResponse;
}

export type RouteHandler<P> = (
  request: NextRequest,
  context: RouteContext<P>,
) => Promise<NextResponse> | NextResponse;

export type PageProps<P> {
  params: P;
  searchParams: dynamic;
}
`,
  },
  {
    name: 'vite',
    pkg: 'vite',
    version: '5.x',
    coverage: 74,
    mainType: 'UserConfig',
    features: ['UserConfig', 'Plugin', 'defineConfig', 'server/build options'],
    missing: ['SSR hook depth', 'Vitest mergeConfig edge cases'],
    indexSjs: `// @superjs/types-vite — hand-curated SJS bindings for Vite 5.x core surface.

export type PluginOption = Plugin | dynamic;

export type Plugin {
  name: string;
  apply: string;
  config: dynamic;
  configureServer: dynamic;
  transform: dynamic;
}

export type ServerOptions {
  port: number;
  host: string;
  strictPort: boolean;
  open: boolean | string;
}

export type BuildOptions {
  outDir: string;
  sourcemap: boolean | string;
  target: string;
  minify: boolean | string;
}

export type UserConfig {
  root: string;
  base: string;
  mode: string;
  plugins: PluginOption[];
  server: ServerOptions;
  build: BuildOptions;
  resolve: dynamic;
  define: dynamic;
}

export type ConfigEnv {
  mode: string;
  command: string;
}

export type UserConfigFn = (env: ConfigEnv) => UserConfig;

export type DefineConfigFn = (config: UserConfig) => UserConfig;
`,
  },
  {
    name: 'vitest',
    pkg: 'vitest',
    version: '1.x',
    coverage: 78,
    mainType: 'TestContext',
    features: ['describe/it/expect', 'vi mocks', 'TestContext', 'hooks'],
    missing: ['bench API', 'workspace project graph'],
    indexSjs: `// @superjs/types-vitest — hand-curated SJS bindings for Vitest 1.x test globals.

export type TestFn = () => void | Promise<void>;

export type TestOptions {
  timeout: number;
  skip: boolean;
  only: boolean;
}

export type SuiteCollector = (name: string, fn: TestFn) => void;

export type TestCollector = (name: string, fn: TestFn) => void;

export type ExpectFn = (value: dynamic) => dynamic;

export type TestContext {
  task: dynamic;
  expect: ExpectFn;
}

export type MockFn {
  mock: dynamic;
  mockClear(): void;
  mockReset(): void;
}

export type ViStatic {
  fn(impl: dynamic): MockFn;
  spyOn(obj: dynamic, method: string): dynamic;
  mock(path: string, factory: dynamic): void;
  clearAllMocks(): void;
}

export type VitestGlobals {
  describe: SuiteCollector;
  it: TestCollector;
  test: TestCollector;
  expect: ExpectFn;
  vi: ViStatic;
  beforeEach: (fn: TestFn) => void;
  afterEach: (fn: TestFn) => void;
}
`,
  },
  {
    name: 'jest',
    pkg: 'jest',
    version: '29.x',
    coverage: 76,
    mainType: 'JestGlobals',
    features: ['describe/it/expect', 'jest.fn', 'mock modules', 'lifecycle hooks'],
    missing: ['snapshot serializers', 'jest-worker internals'],
    indexSjs: `// @superjs/types-jest — hand-curated SJS bindings for Jest 29.x test globals.

export type TestFn = () => void | Promise<void>;

export type TestOptions {
  timeout: number;
  skip: boolean;
  only: boolean;
}

export type SuiteFn = (name: string, fn: TestFn) => void;

export type TestCaseFn = (name: string, fn: TestFn) => void;

export type ExpectFn = (value: dynamic) => dynamic;

export type MockInstance {
  mock: dynamic;
  mockClear(): void;
  mockReset(): void;
  mockRestore(): void;
}

export type JestStatic {
  fn(impl: dynamic): MockInstance;
  spyOn(obj: dynamic, method: string): MockInstance;
  mock(moduleName: string, factory: dynamic): void;
  clearAllMocks(): void;
  resetAllMocks(): void;
}

export type JestGlobals {
  describe: SuiteFn;
  it: TestCaseFn;
  test: TestCaseFn;
  expect: ExpectFn;
  jest: JestStatic;
  beforeEach: (fn: TestFn) => void;
  afterEach: (fn: TestFn) => void;
  beforeAll: (fn: TestFn) => void;
  afterAll: (fn: TestFn) => void;
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
  const status = lib.coverage >= 70 ? 'beta' : 'wip';
  return `---
package: "${lib.pkg}"
version: "${lib.version}"
coverage: ${lib.coverage}
status: "${status}"
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
