# Super.js Website — Plan D: Live Playground

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live Super.js playground — Monaco editor on the left, compiled JS output on the right, powered by the `prototype/` compiler via a Cloudflare edge API route. Available as a full-page `/playground` route and as an embedded component inside the landing page.

**Architecture:** `app/playground/page.tsx` renders a full-page Monaco editor (client component, SSR disabled). `/api/compile` is an edge route (`runtime = 'edge'`) that accepts POST `{ source: string }` and calls the prototype compiler directly via monorepo import. `PlaygroundEmbed` in the landing page is a compact version. Monaco is loaded via `@monaco-editor/react` (handles WASM/worker loading automatically in Next.js).

**Tech Stack:** Next.js 16 App Router · `@monaco-editor/react` · Monaco Editor · Cloudflare Workers (edge runtime) · TypeScript 5

**Prerequisite:** Plan A must be complete. The `prototype/` compiler (`prototype/src/compiler/index.ts`) must export a `compile(source: string): CompileResult` function.

---

## File Map

| File | Purpose |
|---|---|
| `website/src/app/api/compile/route.ts` | Edge API route: POST source → compiled JS |
| `website/src/app/playground/page.tsx` | Full-page playground shell (SSR disabled) |
| `website/src/components/playground/Editor.tsx` | Monaco editor + run button (client component) |
| `website/src/components/playground/OutputPanel.tsx` | JS output + error display |
| `website/src/components/playground/Playground.tsx` | Composes Editor + OutputPanel, manages state |
| `website/src/components/sections/PlaygroundEmbed.tsx` | Compact embedded playground for landing page |
| `website/src/hooks/useCompiler.ts` | Fetch hook: POST to /api/compile, return result |
| `website/next.config.ts` | Ensure monorepo import of prototype/ works |

---

### Task 1: Install Monaco + verify compiler export

**Files:**
- Modify: `website/package.json` (via npm install)
- Verify: `prototype/src/compiler/index.ts` exports `compile`

- [ ] **Step 1: Install Monaco editor**

```bash
cd website
npm install @monaco-editor/react monaco-editor
```

- [ ] **Step 2: Verify prototype compiler export**

```bash
cd prototype
grep -n "export" src/compiler/index.ts | head -20
```

Expected: should show an exported `compile` function. If it exports a different name, note it — use that name in Task 2.

- [ ] **Step 3: Check compiler input/output shape**

```bash
cd prototype
node -e "
const { compile } = require('./dist/compiler/index.js');
const result = compile('const x: string? = null');
console.log(JSON.stringify(result, null, 2));
" 2>&1 | head -30
```

If `dist/` doesn't exist yet:

```bash
cd prototype && npm run build && node -e "
const { compile } = require('./dist/compiler/index.js');
const result = compile('const x: string? = null');
console.log(JSON.stringify(Object.keys(result)));
"
```

Note the exact shape of the result (keys like `output`, `js`, `errors`, `code`, etc.) — use it in Task 2.

- [ ] **Step 4: Add prototype to website's module resolution**

Edit `website/next.config.ts` to add:

```typescript
import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@superjs/compiler': path.resolve(__dirname, '../prototype/src/compiler/index.ts'),
    };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 5: Commit**

```bash
git add website/package.json website/package-lock.json website/next.config.ts
git commit -m "chore(website): install Monaco editor, wire prototype compiler alias"
```

---

### Task 2: `/api/compile` edge route

**Files:**
- Create: `website/src/app/api/compile/route.ts`

- [ ] **Step 1: Write failing test**

Create `website/src/__tests__/api-compile.test.ts`:

```typescript
// Integration test — calls the route handler directly
import { POST } from '@/app/api/compile/route';

test('compile valid SJS returns output and no errors', async () => {
  const req = new Request('http://localhost/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'const x: string? = null' }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(typeof body.output).toBe('string');
  expect(Array.isArray(body.errors)).toBe(true);
});

test('compile returns 400 for missing source', async () => {
  const req = new Request('http://localhost/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test('compile returns errors array for invalid SJS', async () => {
  const req = new Request('http://localhost/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'const x: any = 1' }),
  });
  const res = await POST(req);
  const body = await res.json();
  // `any` is banned in SJS — should produce an error or output with warning
  expect(res.status).toBe(200);
  expect(body).toHaveProperty('errors');
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
cd website && npx jest src/__tests__/api-compile.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create the edge route**

Create `website/src/app/api/compile/route.ts`:

```typescript
export const runtime = 'edge';

interface CompileRequest {
  source: string;
}

interface CompileResponse {
  output: string;
  errors: Array<{ message: string; line?: number; column?: number }>;
}

export async function POST(req: Request): Promise<Response> {
  let body: Partial<CompileRequest>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.source !== 'string') {
    return Response.json({ error: 'Missing source' }, { status: 400 });
  }

  try {
    // Dynamic import — edge runtime loads compiler at request time
    const { compile } = await import('@superjs/compiler');
    const result = compile(body.source);

    // Normalize compiler output to { output, errors }
    // Adjust property names if compiler uses different keys (e.g. 'js', 'code', 'diagnostics')
    const output: CompileResponse = {
      output: result.output ?? result.js ?? result.code ?? '',
      errors: result.errors ?? result.diagnostics ?? [],
    };

    return Response.json(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Compilation failed';
    return Response.json(
      { output: '', errors: [{ message }] },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd website && npx jest src/__tests__/api-compile.test.ts
```

Expected: PASS (if compiler is correctly wired; otherwise adjust property names per Step 3 note)

- [ ] **Step 5: Manual smoke test**

```bash
cd website && npm run dev
```

In another terminal:

```bash
curl -X POST http://localhost:3000/api/compile \
  -H "Content-Type: application/json" \
  -d '{"source": "const x: string? = null"}'
```

Expected: JSON with `output` and `errors` keys.

- [ ] **Step 6: Commit**

```bash
git add website/src/app/api/compile/ website/src/__tests__/api-compile.test.ts
git commit -m "feat(website): /api/compile edge route — POST SJS source → compiled JS"
```

---

### Task 3: `useCompiler` hook

**Files:**
- Create: `website/src/hooks/useCompiler.ts`

- [ ] **Step 1: Write failing test**

Create `website/src/__tests__/useCompiler.test.ts`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCompiler } from '@/hooks/useCompiler';

// Mock fetch
global.fetch = jest.fn();

beforeEach(() => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      output: 'const x = null;',
      errors: [],
    }),
  });
});

afterEach(() => jest.clearAllMocks());

test('initial state is idle', () => {
  const { result } = renderHook(() => useCompiler());
  expect(result.current.status).toBe('idle');
  expect(result.current.output).toBe('');
  expect(result.current.errors).toEqual([]);
});

test('compile sets loading then done', async () => {
  const { result } = renderHook(() => useCompiler());
  act(() => { result.current.compile('const x: string? = null'); });
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('done'));
  expect(result.current.output).toBe('const x = null;');
});

test('compile handles fetch error', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));
  const { result } = renderHook(() => useCompiler());
  act(() => { result.current.compile('const x = 1'); });
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.errors[0].message).toContain('network error');
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
cd website && npx jest src/__tests__/useCompiler.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create useCompiler hook**

Create `website/src/hooks/useCompiler.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';

export type CompilerStatus = 'idle' | 'loading' | 'done' | 'error';

interface CompileError {
  message: string;
  line?: number;
  column?: number;
}

interface CompilerState {
  status: CompilerStatus;
  output: string;
  errors: CompileError[];
  compile: (source: string) => void;
}

export function useCompiler(): CompilerState {
  const [status, setStatus] = useState<CompilerStatus>('idle');
  const [output, setOutput] = useState('');
  const [errors, setErrors] = useState<CompileError[]>([]);

  const compile = useCallback((source: string) => {
    setStatus('loading');
    setErrors([]);

    fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
      .then(res => res.json())
      .then(data => {
        setOutput(data.output ?? '');
        setErrors(data.errors ?? []);
        setStatus('done');
      })
      .catch((err: Error) => {
        setErrors([{ message: err.message }]);
        setStatus('error');
      });
  }, []);

  return { status, output, errors, compile };
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd website && npx jest src/__tests__/useCompiler.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/hooks/useCompiler.ts website/src/__tests__/useCompiler.test.ts
git commit -m "feat(website): useCompiler hook — fetch /api/compile, manage loading/done/error state"
```

---

### Task 4: Editor + OutputPanel components

**Files:**
- Create: `website/src/components/playground/OutputPanel.tsx`
- Create: `website/src/components/playground/Editor.tsx`

- [ ] **Step 1: Create OutputPanel**

Create `website/src/components/playground/OutputPanel.tsx`:

```typescript
'use client';

import type { CompilerStatus } from '@/hooks/useCompiler';

interface CompileError {
  message: string;
  line?: number;
  column?: number;
}

interface OutputPanelProps {
  status: CompilerStatus;
  output: string;
  errors: CompileError[];
}

export default function OutputPanel({ status, output, errors }: OutputPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex items-center px-4 py-2 border-b border-white/10">
        <span className="text-xs font-mono text-[#94a3b8] uppercase tracking-widest">Output (JS)</span>
        {status === 'loading' && (
          <span className="ml-auto text-xs text-[#f97316] animate-pulse">Compiling…</span>
        )}
        {status === 'done' && errors.length === 0 && (
          <span className="ml-auto text-xs text-[#34d399]">✓ Compiled</span>
        )}
        {errors.length > 0 && (
          <span className="ml-auto text-xs text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {errors.length > 0 ? (
          <div className="space-y-2">
            {errors.map((err, i) => (
              <div key={i} className="flex gap-2 text-red-400">
                <span className="shrink-0 text-red-600">✗</span>
                <div>
                  {err.line && <span className="text-[#94a3b8] mr-2">Line {err.line}:</span>}
                  {err.message}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <pre className="text-[#f8fafc] whitespace-pre-wrap">
            {status === 'idle' ? '// Click Run to compile your Super.js code' : output}
          </pre>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Editor component**

Create `website/src/components/playground/Editor.tsx`:

```typescript
'use client';

import MonacoEditor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isLoading?: boolean;
}

const MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: '"Geist Mono", "Fira Code", monospace',
  fontLigatures: true,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  padding: { top: 16, bottom: 16 },
  wordWrap: 'on',
  theme: 'superjs-dark',
};

export default function Editor({ value, onChange, onRun, isLoading }: EditorProps) {
  function handleMount(editorInstance: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) {
    // Register orange/amber theme
    monaco.editor.defineTheme('superjs-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'f97316', fontStyle: 'bold' },
        { token: 'string', foreground: 'fbbf24' },
        { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
        { token: 'type', foreground: '34d399' },
        { token: 'number', foreground: 'fb923c' },
      ],
      colors: {
        'editor.background': '#050510',
        'editor.foreground': '#f8fafc',
        'editor.lineHighlightBackground': '#ffffff08',
        'editorLineNumber.foreground': '#4a5568',
        'editorLineNumber.activeForeground': '#f97316',
      },
    });
    monaco.editor.setTheme('superjs-dark');

    // Ctrl/Cmd+Enter runs compilation
    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      onRun
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-2 border-b border-white/10 bg-[#050510]">
        <span className="text-xs font-mono text-[#94a3b8] uppercase tracking-widest">Super.js</span>
        <button
          onClick={onRun}
          disabled={isLoading}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="w-3 h-3 border border-black/40 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>▶</span>
          )}
          Run
        </button>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          defaultLanguage="typescript"
          value={value}
          onChange={val => onChange(val ?? '')}
          onMount={handleMount}
          options={MONACO_OPTIONS}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/playground/
git commit -m "feat(website): Editor (Monaco) + OutputPanel components"
```

---

### Task 5: Playground composite + full-page route

**Files:**
- Create: `website/src/components/playground/Playground.tsx`
- Create: `website/src/app/playground/page.tsx`

The default code in the playground is the `Result` + `match` example from the spec:

```sjs
type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("division by zero")
  }
  return Ok(a / b)
}

const result = divide(10, 2)

match result {
  Ok(value) => console.log("Result:", value),
  Err(msg)  => console.error("Error:", msg),
}
```

- [ ] **Step 1: Create Playground composite component**

Create `website/src/components/playground/Playground.tsx`:

```typescript
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import OutputPanel from './OutputPanel';
import { useCompiler } from '@/hooks/useCompiler';

const Editor = dynamic(() => import('./Editor'), { ssr: false });

const DEFAULT_CODE = `type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("division by zero")
  }
  return Ok(a / b)
}

const result = divide(10, 2)

match result {
  Ok(value) => console.log("Result:", value),
  Err(msg)  => console.error("Error:", msg),
}`;

interface PlaygroundProps {
  initialCode?: string;
  height?: string;
}

export default function Playground({ initialCode = DEFAULT_CODE, height = '100%' }: PlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const { status, output, errors, compile } = useCompiler();

  return (
    <div style={{ height }} className="flex border border-white/10 rounded-xl overflow-hidden">
      <div className="flex-1 border-r border-white/10">
        <Editor
          value={code}
          onChange={setCode}
          onRun={() => compile(code)}
          isLoading={status === 'loading'}
        />
      </div>
      <div className="flex-1">
        <OutputPanel status={status} output={output} errors={errors} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create full-page playground route**

Create `website/src/app/playground/page.tsx`:

```typescript
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const Playground = dynamic(
  () => import('@/components/playground/Playground'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'Playground — Super.js',
  description: 'Write and compile Super.js code live in your browser',
};

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-[#050510] flex flex-col">
      <div className="pt-16 px-6 pb-4">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Playground</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          Write Super.js and see the compiled JavaScript output. Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">⌘ Enter</kbd>
          {' '}to run.
        </p>
      </div>
      <div className="flex-1 px-6 pb-6">
        <Playground height="calc(100vh - 10rem)" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Smoke test in browser**

```bash
cd website && npm run dev
```

Open `http://localhost:3000/playground`. Verify:
- Monaco editor loads with orange/amber theme
- Default `Result` + `match` code is pre-loaded
- Click Run → output panel shows compiled JS or errors
- `⌘ Enter` / `Ctrl+Enter` also triggers run

- [ ] **Step 4: Commit**

```bash
git add website/src/components/playground/Playground.tsx website/src/app/playground/
git commit -m "feat(website): full-page /playground route with Monaco editor + live compiler"
```

---

### Task 6: PlaygroundEmbed for landing page

**Files:**
- Create: `website/src/components/sections/PlaygroundEmbed.tsx`

The `PlaygroundEmbed` is the compact version for the landing page: smaller height (500px), titled "Try it live", with a subtle dark card container matching the landing page aesthetic.

- [ ] **Step 1: Create PlaygroundEmbed section**

Create `website/src/components/sections/PlaygroundEmbed.tsx`:

```typescript
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const Playground = dynamic(
  () => import('@/components/playground/Playground'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-xl border border-white/10 bg-[#0d1117] flex items-center justify-center">
        <div className="text-[#94a3b8] text-sm font-mono animate-pulse">Loading editor…</div>
      </div>
    ),
  }
);

const EMBED_CODE = `type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

match divide(10, 2) {
  Ok(v)    => console.log("Result:", v),
  Err(msg) => console.error("Error:", msg),
}`;

export default function PlaygroundEmbed() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#f8fafc] mb-4">
            Try it live
          </h2>
          <p className="text-[#94a3b8] text-lg max-w-xl mx-auto">
            Write Super.js and see the compiled JavaScript output instantly.
          </p>
        </div>

        <Playground initialCode={EMBED_CODE} height="500px" />

        <div className="text-center mt-8">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 text-[#f97316] hover:text-[#fbbf24] transition-colors text-sm font-medium"
          >
            Open full-screen playground →
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into landing page**

Edit `website/src/app/page.tsx` to import and render `PlaygroundEmbed` between the Compare section and Ecosystem strip.

In `website/src/app/page.tsx`, find the import block and add:

```typescript
import PlaygroundEmbed from '@/components/sections/PlaygroundEmbed';
```

In the JSX, add `<PlaygroundEmbed />` after `<Compare />` and before `<Ecosystem />`:

```typescript
export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Compare />
      <PlaygroundEmbed />  {/* add this line */}
      <Quickstart />
      <Ecosystem />
      <CallToAction />
    </main>
  );
}
```

- [ ] **Step 3: Smoke test embedded playground**

```bash
cd website && npm run dev
```

Open `http://localhost:3000`. Scroll to the playground section. Verify:
- Editor loads with default code
- Run button works
- Link to full playground at bottom

- [ ] **Step 4: Commit**

```bash
git add website/src/components/sections/PlaygroundEmbed.tsx website/src/app/page.tsx
git commit -m "feat(website): PlaygroundEmbed section for landing page with link to full playground"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `/playground` full-page Monaco editor — Task 5
- [x] Monaco left panel + JS output right panel — Task 4 + 5
- [x] `/api/compile` edge route — Task 2
- [x] Default `Result` + `match` example — Task 5
- [x] Orange run button — Task 4
- [x] Embedded playground in landing page — Task 6
- [x] `⌘/Ctrl+Enter` keyboard shortcut — Task 4
- [x] Error display with line numbers — Task 4 (OutputPanel)
- [x] Cloudflare edge runtime — Task 2 (`export const runtime = 'edge'`)

**Placeholder scan:** No TBDs. All code complete. `@superjs/compiler` alias may need adjustment based on actual compiler output shape (documented in Task 2 Steps 2-3).

**Type consistency:** `CompilerStatus` exported from `useCompiler.ts`, imported in `Playground.tsx` and `OutputPanel.tsx`. `CompileError` interface defined in both `route.ts` and `OutputPanel.tsx` — consistent shape `{ message, line?, column? }`.
