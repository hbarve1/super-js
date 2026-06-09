# SJS vs TypeScript

## TL;DR

TypeScript adds types to JavaScript but keeps every escape hatch that makes those types unreliable. SJS adds types and removes the escape hatches. The result is a smaller language that makes stronger guarantees.

If TypeScript's `any`, intersection types, and conditional types have never caused you a bug — stay with TypeScript. If they have, SJS is the upgrade.

---

## The Core Difference: Soundness

TypeScript's type system is **intentionally unsound** — the team explicitly chose usability over correctness. This means TypeScript can say code is type-safe when it is not.

SJS's type system is **sound** — if the compiler says a value is `string`, it is `string` at runtime, no exceptions.

### `any` — the soundness hole

```ts
// TypeScript
function process(x: any): string {
  return x.toUpperCase()  // compiles fine — crashes at runtime if x is a number
}

process(42)  // tsc: no error. Runtime: TypeError
```

```sjs
// SJS
function process(x: string): string {
  return x.toUpperCase()  // only string reaches here
}

process(42)  // SJS-E001: argument is number, expected string — compile error
```

`any` propagates silently. One `any` value passed to five functions makes all five unsound. SJS has `dynamic` as the conscious opt-out — it is runtime-checked, visible in code, and lint-flaggable.

```sjs
// SJS — explicit opt-out with runtime penalty
const x: dynamic = externalValue()
x.toUpperCase()  // compiles — runtime check inserted; throws SJS-RuntimeError, not TypeError
```

### Intersection types — hidden unsoundness

```ts
// TypeScript
type A = { kind: "a"; value: string }
type B = { kind: "b"; value: number }
type AB = A & B  // kind is "a" & "b" — impossible value; TS allows it

const x: AB = { kind: "a", value: "hello" }  // TS: no error
// x.value is string | number depending on which side you read — unsound
```

SJS bans intersection types entirely. Use sum types or structural interfaces instead:

```sjs
// SJS — explicit, sound alternative
type AB = A | B  // discriminated union; exhaustive match required
```

### Conditional types — unpredictable inference

```ts
// TypeScript
type IsString<T> = T extends string ? "yes" : "no"
type R = IsString<string | number>  // "yes" | "no" — distributed, surprising

// Deeply nested conditional types create inference cliffs TypeScript cannot resolve
type DeepUnwrap<T> = T extends Promise<infer U>
  ? DeepUnwrap<U>
  : T  // tsc: "Type instantiation is excessively deep"
```

SJS has no conditional types. Express the same intent with sum types and `match` — always predictable, always terminating:

```sjs
// SJS — same expressiveness, no surprises
type Unwrapped<T> = Resolved(T) | Pending

function unwrap<T>(value: Promise<T> | T): T { ... }
```

---

## Feature-by-Feature Comparison

| Feature | TypeScript | SJS |
|---------|-----------|-----|
| `any` | Yes — silent | No — use `dynamic` (explicit, runtime-checked) |
| `unknown` | Yes | Yes (same semantics) |
| `never` | Yes | Yes |
| Intersection `A & B` | Yes | No — use interface composition |
| Conditional types | Yes | No — use sum types |
| Mapped types `{[K in keyof T]}` | Yes | No — use structural interfaces |
| Template literal types | Yes | No |
| `infer` | Yes | No |
| `namespace` | Yes | No |
| TS `enum` | Yes | No — use sum types |
| Declaration merging | Yes | No |
| `!` non-null assertion | Yes | No — use narrowing or `match` |
| `as` type cast | Yes (unsafe) | Banned — use narrowing |
| Structural interfaces | Yes | Yes |
| Generics | Yes | Yes (invariant default; +T/-T in v1.1) |
| Discriminated unions | Yes (manual) | Yes (first-class sum types) |
| `match` expressions | No (switch only) | Yes — exhaustive |
| Null safety | Optional (`--strictNullChecks`) | Always on, non-nullable by default |
| Sound type system | No | Yes |
| JSX | Via tsconfig | On by default |

---

## Null Safety

TypeScript's null safety requires `--strictNullChecks`. It is opt-in and off by default in many projects.

```ts
// TypeScript without --strictNullChecks
function getUser(id: number): User {
  return db.find(id)  // can return undefined — TS doesn't know
}
const user = getUser(42)
user.email  // no error from tsc, runtime crash
```

SJS: non-nullable by default, always, no flag needed.

```sjs
// SJS
function getUser(id: number): User? {  // ? is mandatory if null is possible
  return db.find(id)
}
const user = getUser(42)
user.email           // SJS-E005: user is nullable
user?.email ?? "—"   // OK
```

---

## Complexity Tax

TypeScript has grown to absorb every JavaScript pattern. The result is a language with 4 kinds of `null` (`null`, `undefined`, optional `?`, non-null assertion `!`), 3 ways to define an object type (interface, type alias, class), and a Turing-complete type-level language (conditional types + `infer` + recursion) that can hang the compiler.

SJS's type system has a fixed surface:
- One nullable form: `T?`
- One object type: structural interface (or class)
- No type-level computation — types describe values, not compute them

Smaller surface = faster compiler, faster to learn, fewer "why does my type not work" debugging sessions.

---

## Tooling Speed

| Operation | TypeScript (`tsc`) | SJS |
|-----------|------------------|-----|
| Cold check 10k LOC | ~8–15 s | ≤ 2 s |
| Warm rebuild (single file) | ~1–3 s | ≤ 100 ms |
| LSP idle memory | ~400–800 MB | ≤ 250 MB |
| LSP hover P99 | ~300–600 ms | ≤ 200 ms |

SJS's compiler is built for speed from the start — no Babel pipeline, purpose-built lexer/parser/checker, incremental by default. `tsc` was retrofitted with `--incremental`; SJS incremental is the only mode.

---

## Migration from TypeScript

SJS is not a TypeScript superset — it bans constructs TypeScript allows. Migration is a deliberate choice, not a rename.

```bash
superjs migrate from-typescript --dir src/
```

The migration tool:
1. Renames `.ts` → `.sjs`, `.tsx` → `.sjs`
2. Replaces `any` with `dynamic` + emits a TODO comment for each
3. Rewrites discriminated unions to SJS sum types where the pattern is clear
4. Flags (does not auto-fix): intersection types, conditional types, mapped types, `!` assertions, `as` casts, `enum`, `namespace`

Typical migration for a 10k LOC TS codebase: 1–2 days of manual cleanup after the automated pass, mostly converting `any` → typed and intersection types → interfaces.

---

## When to Stay with TypeScript

- Large existing TypeScript codebase with heavy use of mapped/conditional types — migration cost is high
- Teams that rely on `@types/*` ecosystem heavily and want zero friction — SJS wrappers exist for top 30 packages; broader coverage is a v1.x roadmap item
- Projects that need JetBrains IDE support (SJS VS Code only at v1.0)
- Libraries publishing declaration files — `.d.ts` output is post-v1.0; use the JS backend + hand-authored `.d.sjs` for now

---

## When to Choose SJS

- New project targeting Node 22+ backend
- Team that has been burned by `any` propagating through a codebase
- You want `match` to be exhaustive without workarounds
- You want `null` crashes gone, not just catchable
- You want a compiler that checks 10k LOC in 2 seconds, not 15
