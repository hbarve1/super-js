#!/usr/bin/env node
/**
 * gen-tour-lessons.mjs — write docs/tour/*.md language tour lessons (WS-A4a).
 * Run: node scripts/gen-tour-lessons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'tour');
const SITE = 'https://superjs.org';

function pg(code, opts = {}) {
  const enc = Buffer.from(code.trim())
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const mode = opts.mode ? `?mode=${opts.mode}` : '';
  return `${SITE}/playground${mode}#code=${enc}`;
}

function lesson({ num, slug, title, description, goal, sections, code, takeaways, next, playgroundMode }) {
  const file = `${String(num).padStart(2, '0')}-${slug}.md`;
  const body = [
    '---',
    `title: ${String(num).padStart(2, '0')} — ${title}`,
    `sidebar_position: ${num + 1}`,
    `description: ${description}`,
    'section: tour',
    '---',
    '',
    `# ${title}`,
    '',
    `**Goal:** ${goal}`,
    '',
    ...sections,
    '',
    '## Example',
    '',
    '```sjs',
    code.trim(),
    '```',
    '',
    `[Open in playground](${pg(code, { mode: playgroundMode })})`,
    '',
    '## Key takeaways',
    '',
    ...takeaways.map((t) => `- ${t}`),
    '',
    next ? `**Next:** [${next.title}](./${String(next.num).padStart(2, '0')}-${next.slug}.md)` : '',
    '',
  ].filter((l) => l !== undefined).join('\n');
  return { file, body };
}

const lessons = [
  lesson({
    num: 1, slug: 'hello-world', title: 'Hello world',
    description: 'Write and run your first SuperJS program.',
    goal: 'Run a minimal `.sjs` file with `superjs check`.',
    sections: [
      'SuperJS files use the `.sjs` extension. The compiler type-checks them and emits plain JavaScript.',
      '',
      '```bash',
      'superjs check hello.sjs',
      'superjs build hello.sjs --out-dir dist',
      '```',
    ],
    code: `export function greet(name: string): string {
  return "Hello, " + name
}

const msg: string = greet("SuperJS")
console.log(msg)`,
    takeaways: ['`.sjs` is a typed superset of JavaScript.', 'Use `superjs check` before `build`.', 'Types are erased at emit — runtime is JS.'],
    next: { num: 2, slug: 'variables-and-types', title: 'Variables and types' },
  }),
  lesson({
    num: 2, slug: 'variables-and-types', title: 'Variables and types',
    description: 'const, let, primitives, and explicit annotations.',
    goal: 'Annotate values and let the compiler catch mismatches.',
    sections: ['Use `const` by default; `let` when reassignment is required. Primitives: `string`, `number`, `boolean`.'],
    code: `const pi: number = 3.14
let count: number = 0
count = count + 1

const label: string = "items"
const ok: boolean = count > 0`,
    takeaways: ['`const` bindings cannot be reassigned.', 'Annotations are optional when inference is obvious.', 'SJS-E001 fires on type mismatches.'],
    next: { num: 3, slug: 'functions', title: 'Functions' },
  }),
  lesson({
    num: 3, slug: 'functions', title: 'Functions',
    description: 'Named functions, arrows, parameters, and return types.',
    goal: 'Write typed functions with clear signatures.',
    sections: ['Arrow functions and `function` declarations both accept parameter and return types.'],
    code: `function add(a: number, b: number): number {
  return a + b
}

const double = (n: number): number => n * 2

export function greet(name: string): string {
  return "hi " + name
}`,
    takeaways: ['Return types are checked at every `return`.', 'Exported functions form your module API.', 'Prefer explicit returns on public functions.'],
    next: { num: 4, slug: 'control-flow', title: 'Control flow' },
  }),
  lesson({
    num: 4, slug: 'control-flow', title: 'Control flow',
    description: 'if/else, ternary, and type narrowing in branches.',
    goal: 'Use branches to narrow types safely.',
    sections: ['Conditions must be `boolean` — no truthy coercion in `--strict` lint paths.'],
    code: `function abs(n: number): number {
  if (n < 0) {
    return -n
  }
  return n
}

function label(n: number): string {
  return n > 0 ? "positive" : n < 0 ? "negative" : "zero"
}`,
    takeaways: ['Each branch can refine types for locals.', 'Ternary expressions must share a common result type.', 'Prefer `===` over `==`.'],
    next: { num: 5, slug: 'null-safety', title: 'Null safety' },
  }),
  lesson({
    num: 5, slug: 'null-safety', title: 'Null safety',
    description: 'Nullable types, optional chaining, and nullish coalescing.',
    goal: 'Model absence with `T?` instead of abusing `undefined`.',
    sections: ['`T` is non-nullable by default. `T?` means `T | null`. Use `?.` and `??` like modern JS.'],
    code: `function nick(name: string?): string {
  return name?.toUpperCase() ?? "stranger"
}

function firstChar(s: string?): string {
  if (s === null) return ""
  return s.slice(0, 1)
}`,
    takeaways: ['No `!` non-null assertion — narrow with `if`.', '`T?` is shorthand for `T | null`.', 'Optional chaining preserves nullability.'],
    next: { num: 6, slug: 'pattern-matching', title: 'Pattern matching' },
  }),
  lesson({
    num: 6, slug: 'pattern-matching', title: 'Pattern matching',
    description: 'match expressions and exhaustiveness.',
    goal: 'Replace fragile `switch` with exhaustive `match`.',
    sections: ['`match` is an expression — every arm produces a value. Missing variants are compile errors (SJS-E007).'],
    code: `type Status = Active | Paused | Done

function label(s: Status): string {
  return match s {
    Active => "active",
    Paused => "paused",
    Done => "done",
  }
}`,
    takeaways: ['Arms are separated by commas.', 'Exhaustiveness is enforced at compile time.', '`match` works on sum types, not arbitrary strings.'],
    next: { num: 7, slug: 'sum-types', title: 'Sum types' },
  }),
  lesson({
    num: 7, slug: 'sum-types', title: 'Sum types',
    description: 'Option, Result, and variant constructors.',
    goal: 'Model alternatives with tagged variants instead of booleans + fields.',
    sections: ['Sum types compose: `type Result&lt;T, E&gt; = Ok(T) | Err(E)` (see `@superjs/std-core`).'],
    code: `type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("divide by zero")
  return Ok(a / b)
}

function run(): void {
  const r: Result<number, string> = divide(10, 2)
  match r {
    Ok(n) => console.log(n),
    Err(e) => console.log(e),
  }
}`,
    takeaways: ['Variants carry payloads: `Some(42)`, `None`.', 'Prefer `Result` over thrown exceptions for expected errors.', 'Import helpers from `@superjs/std-core` in real projects.'],
    next: { num: 8, slug: 'interfaces', title: 'Object types' },
  }),
  lesson({
    num: 8, slug: 'interfaces', title: 'Object types',
    description: 'Structural object types with type { } — no interface keyword.',
    goal: 'Declare object shapes with the `type` brace form.',
    sections: ['SJS uses `type Name { ... }` for structural types. Conformance is checked structurally — no `implements` keyword.'],
    code: `type Point {
  x: number;
  y: number;
}

type Named {
  name: string;
}

type Place extends Named {
  city: string;
}

function label(p: Place): string {
  return p.name + " @ " + p.city
}`,
    takeaways: ['Members end with semicolons.', '`extends` composes object types.', 'Classes satisfy object types implicitly.'],
    next: { num: 9, slug: 'generics', title: 'Generics' },
  }),
  lesson({
    num: 9, slug: 'generics', title: 'Generics',
    description: 'Generic functions and type parameters.',
    goal: 'Write reusable functions with type parameters.',
    sections: ['Type parameters use angle brackets: `function id&lt;T&gt;(x: T): T`. No `extends` constraints on type parameters.'],
    code: `function id<T>(value: T): T {
  return value
}

function first<T>(items: T[]): T? {
  if (items.length === 0) return null
  return items[0]
}

const n: number = id(42)
const s: string = id("ok")`,
    takeaways: ['Generics monomorphize at compile time.', 'Use structural object types for bounds, not `T extends U`.', 'Type args can be inferred at call sites.'],
    next: { num: 10, slug: 'classes', title: 'Classes' },
  }),
  lesson({
    num: 10, slug: 'classes', title: 'Classes',
    description: 'Classes, fields, and methods.',
    goal: 'Encapsulate state with classes — structural conformance, not `implements`.',
    sections: ['`public` / `private` modifiers are allowed. Do not use `implements` — it is a parse error.'],
    code: `class Counter {
  private value: number = 0

  increment(): void {
    this.value = this.value + 1
  }

  read(): number {
    return this.value
  }
}

const c: Counter = new Counter()
c.increment()`,
    takeaways: ['Fields are typed like object type members.', 'Structural object types describe required methods.', 'No decorator support.'],
    next: { num: 11, slug: 'modules', title: 'Modules' },
  }),
  lesson({
    num: 11, slug: 'modules', title: 'Modules',
    description: 'import/export and barrel files.',
    goal: 'Split code across ES modules.',
    sections: ['SuperJS emits standard ES modules. Use named exports and explicit import paths.'],
    code: `import { ok, err } from "@superjs/std-core"

export type UserId = string

export function parseId(raw: string): UserId {
  return raw
}

export function demo(): void {
  const r = ok(1)
  console.log(r)
}`,
    takeaways: ['One module per file is the default.', 'Type-only imports are not required — types erase.', 'Configure paths in `superjs.config.json`.'],
    next: { num: 12, slug: 'async-await', title: 'Async and await' },
  }),
  lesson({
    num: 12, slug: 'async-await', title: 'Async and await',
    description: 'async functions and Promise typing.',
    goal: 'Type async workflows with `Promise&lt;T&gt;`.',
    sections: ['`async` functions return `Promise&lt;T&gt;` when annotated. Await only inside `async` bodies.'],
    code: `async function fetchText(url: string): Promise<string> {
  const res: dynamic = await fetch(url)
  const text: dynamic = await res.text()
  return text as string
}

async function main(): Promise<void> {
  const body: string = await fetchText("https://example.com")
  console.log(body.length)
}`,
    takeaways: ['Untyped fetch results start as `dynamic`.', 'Narrow or validate before treating as `string`.', 'Lint SJS-L015 warns on missing `await` in async paths.'],
    next: { num: 13, slug: 'jsx', title: 'JSX' },
  }),
  lesson({
    num: 13, slug: 'jsx', title: 'JSX',
    description: 'JSX syntax in .sjsx files.',
    goal: 'Write components with JSX enabled.',
    sections: [
      'Enable JSX in `superjs.config.json` (`"jsx": true`) or use the `.sjsx` extension.',
      'JSX lowers to your configured factory (e.g. `React.createElement`).',
    ],
    code: `// Save as component.sjsx with jsx enabled
export function Greeting(props: { name: string }): dynamic {
  return <p>Hello, {props.name}</p>
}`,
    takeaways: ['JSX requires jsx mode — not valid in plain `.sjs` by default.', 'Props are usually a structural object type.', 'See specs/language/039-jsx.md for factory config.'],
    next: { num: 14, slug: 'calling-js-from-sjs', title: 'Calling JS from SJS' },
  }),
  lesson({
    num: 14, slug: 'calling-js-from-sjs', title: 'Calling JS from SJS',
    description: 'Import npm packages and narrow with dynamic.',
    goal: 'Call JavaScript libraries safely at the boundary.',
    sections: ['Import runtime values normally. Treat unknown shapes as `dynamic`, then narrow.'],
    code: `import { readFileSync } from "node:fs"

function readJson(path: string): dynamic {
  const text: string = readFileSync(path, "utf8")
  return JSON.parse(text)
}

function getName(doc: dynamic): string? {
  if (doc === null || typeof doc !== "object") return null
  const name: dynamic = doc.name
  return typeof name === "string" ? name : null
}`,
    takeaways: ['`dynamic` replaces TypeScript `any`.', 'Validate at boundaries — not in hot inner loops.', 'Use `@superjs/types-*` when available.'],
    next: { num: 15, slug: 'dynamic-and-schema', title: 'dynamic and Schema' },
  }),
  lesson({
    num: 15, slug: 'dynamic-and-schema', title: 'dynamic and Schema',
    description: 'Validate external data with std-schema.',
    goal: 'Parse JSON into typed values with `Schema.parse`.',
    sections: ['`@superjs/std-schema` provides composable validators returning `Validated&lt;T&gt;`.'],
    code: `import { string, object, field } from "@superjs/std-schema"

const NameSchema = object([field("name", string())])

function parseName(doc: dynamic): string? {
  const v = NameSchema.parse(doc)
  return match v {
    Valid(payload) => payload.name as string,
    Invalid(_) => null,
  }
}`,
    takeaways: ['Schemas are reified — compose with `object`, `optional`, etc.', 'Prefer schema validation over repeated `typeof` chains.', 'See generated [std-schema API](../api/std-schema.md).'],
    next: { num: 16, slug: 'errors-and-result', title: 'Errors and Result' },
  }),
  lesson({
    num: 16, slug: 'errors-and-result', title: 'Errors and Result',
    description: 'Chain Results instead of throwing.',
    goal: 'Propagate failures explicitly through call stacks.',
    sections: ['Unexpected bugs may still throw at runtime, but expected failures belong in `Result`.'],
    code: `type Result<T, E> = Ok(T) | Err(E)

function step1(): Result<number, string> {
  return Ok(2)
}

function step2(n: number): Result<number, string> {
  if (n < 0) return Err("negative")
  return Ok(n * 10)
}

function pipeline(): Result<number, string> {
  const a: Result<number, string> = step1()
  return match a {
    Ok(n) => step2(n),
    Err(e) => Err(e),
  }
}`,
    takeaways: ['Callers must handle `Err` — the type system enforces it.', 'Combine steps with `match` or helper functions.', 'See [migration guide](../migration/02-idioms.md).'],
    next: { num: 17, slug: 'iterators-and-for-of', title: 'Iterators and for...of' },
  }),
  lesson({
    num: 17, slug: 'iterators-and-for-of', title: 'Iterators and for...of',
    description: 'Iterate collections with for...of.',
    goal: 'Loop over arrays and iterable values.',
    sections: ['Standard `for...of` works on arrays and other iterables.'],
    code: `function sum(nums: number[]): number {
  let total: number = 0
  for (const n of nums) {
    total = total + n
  }
  return total
}

const values: number[] = [1, 2, 3]
console.log(sum(values))`,
    takeaways: ['Loop variables are inferred from the iterable element type.', 'Use `@superjs/std-collections` `List` for functional helpers.', 'Generators follow ECMAScript rules.'],
    next: { num: 18, slug: 'serverless-handlers', title: 'Serverless handlers' },
  }),
  lesson({
    num: 18, slug: 'serverless-handlers', title: 'Serverless handlers',
    description: 'Workers and Lambda handler patterns.',
    goal: 'Structure edge and serverless entrypoints in SJS.',
    sections: [
      'Scaffold templates with `superjs init workers-api` or `lambda-handler`.',
      'For a full Node backend, see [mvb-fastify](../../examples/mvb-fastify/).',
    ],
    code: `export async function fetch(request: dynamic): Promise<dynamic> {
  const url: dynamic = new URL(request.url as string)
  const path: string = url.pathname as string
  if (path === "/health") {
    return new Response("ok", { status: 200 })
  }
  return new Response("not found", { status: 404 })
}`,
    takeaways: ['Handlers take `dynamic` at the platform boundary.', 'Use `match` on paths and event shapes.', 'Not decorators — serverless export handlers only.'],
    playgroundMode: 'workers',
    next: { num: 19, slug: 'tooling-tour', title: 'Tooling tour' },
  }),
  lesson({
    num: 19, slug: 'tooling-tour', title: 'Tooling tour',
    description: 'CLI commands for day-to-day development.',
    goal: 'Know the core `superjs` subcommands.',
    sections: [
      '| Command | Purpose |',
      '|---------|---------|',
      '| `check` | Type-check without emit |',
      '| `build` | Compile to JS |',
      '| `lint` | Style rules SJS-L* |',
      '| `format` | Canonical formatting |',
      '| `doc` / `docgen` | API docs from exports |',
      '| `init` | Scaffold project templates |',
      '| `lsp` | Language server (stdio) |',
    ],
    code: `// Typical loop
// superjs check src/**/*.sjs
// superjs lint src/**/*.sjs
// superjs build src --out-dir dist`,
    takeaways: ['Run `check` in CI on every PR.', '`format --check` prevents style drift.', 'LSP powers editor diagnostics.'],
    next: { num: 20, slug: 'migrating-a-ts-file', title: 'Migrating a TS file' },
  }),
  lesson({
    num: 20, slug: 'migrating-a-ts-file', title: 'Migrating a TS file',
    description: 'Move one TypeScript file to SuperJS.',
    goal: 'Apply the TS→SJS rewrite checklist on a real module.',
    sections: [
      '1. Rename `.ts` → `.sjs`.',
      '2. Fix banned constructs (`any`→`dynamic`, `enum`→sum types).',
      '3. Run `superjs migrate from-prototype` if imports still point at prototype paths.',
      '4. Run `superjs check` until clean.',
      '',
      'Full guide: [Migration](../migration/index.md).',
    ],
    code: `// After migration — no any, no enum
type Role = Admin | Member

type User {
  name: string;
  role: Role;
}

function roleLabel(u: User): string {
  return match u.role {
    Admin => "admin",
    Member => "member",
  }
}`,
    takeaways: ['Migrate leaf modules first.', 'Use the [compat matrix](../compat/index.md) for npm wrappers.', '`superjs migrate from-ts` assists bulk moves.'],
    next: null,
  }),
];

mkdirSync(OUT, { recursive: true });

const index = `---
title: Language Tour
sidebar_position: 1
description: 20 lessons introducing SuperJS — from hello world through serverless handlers and migration.
section: tour
---

# Language Tour

Twenty short lessons (~5 minutes each). Each includes a compile-ready example and a playground link.

## Lessons

${lessons.map((l) => {
  const m = l.file.match(/^(\d+)-(.+)\.md$/);
  return `- [${m[1]} — ${l.body.match(/^# (.+)$/m)?.[1]}](./${l.file})`;
}).join('\n')}

Start with [01 — Hello world](./01-hello-world.md).
`;

writeFileSync(join(OUT, 'index.md'), index);

for (const l of lessons) {
  writeFileSync(join(OUT, l.file), l.body);
}

console.log(`Wrote ${lessons.length + 1} tour files to docs/tour/`);
