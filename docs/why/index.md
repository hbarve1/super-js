---
title: Why SuperJS
sidebar_position: 1
description: When to choose SuperJS, what it trades away, and how it compares to alternatives.
section: why
---

# Why SuperJS

## The one-sentence pitch

SuperJS is JavaScript with a stricter type system: sum types, null safety by default, and no silent escape hatches — for teams who want TypeScript's ergonomics without `any` eroding their guarantees.

## What SJS solves

TypeScript made typed JavaScript mainstream, but it kept the exits open. SuperJS targets pain points that accumulate in real backends:

- **`any` spreads silently** — one untyped value poisons every function it touches. SJS bans `any`; use explicit `dynamic` when you need runtime-checked interop.
- **`null` and `undefined` are easy to confuse** — `T` is non-nullable by default; `T?` means nullable. No `!` non-null assertion to lie to the compiler.
- **Discriminated unions without exhaustiveness** — TypeScript unions compile without forcing you to handle every case. SJS `match` is exhaustive; missing a variant is a compile error.
- **Invisible error paths** — `throw` makes failure types disappear from signatures. SJS encourages `Result<T, E>` sum types and `match` so errors stay in the type system.

See [mission](../../specs/mission.md) and [ADR-004 banned constructs](../../specs/design/ADR-004-banned-ts-constructs.md) for the full design rationale.

## 5-minute backend demo

The [mvb-fastify example](../../examples/mvb-fastify/) is a minimal Fastify API written entirely in `.sjs`. It demonstrates sum types, exhaustive `match`, nullable lookup, and `Result`-based validation in one route module:

```sjs
type User = Admin(string) | Member(string)
type Result<T, E> = Ok(T) | Err(E)

function parseCreate(body: dynamic): Result<User, string> {
  if (body === null || typeof body !== "object") {
    return err("body must be an object")
  }
  const name: dynamic = body.name
  const role: dynamic = body.role
  if (typeof name !== "string" || name.length === 0) {
    return err("name is required")
  }
  if (role === "admin") return ok(userAdmin(name))
  if (role === "member") return ok(userMember(name))
  return err('role must be "admin" or "member"')
}

// POST /users — Result + match in a real handler
app.post("/users", async (req: dynamic) => {
  const created: Result<User, string> = parseCreate(req.body)
  return match created {
    Ok(user) => {
      store.push(user)
      return { id: displayName(user), role: roleLabel(user) }
    },
    Err(message) => ({ error: message }),
  }
})
```

Clone the repo and run it:

```bash
cd examples/mvb-fastify
npm install && npm run build && npm start
curl http://127.0.0.1:3000/users
```

Full source: [`examples/mvb-fastify/src/routes/users.sjs`](../../examples/mvb-fastify/src/routes/users.sjs).

## What SJS wins vs TypeScript

| Area | SuperJS | TypeScript |
|------|---------|------------|
| Sum types + `match` | First-class, exhaustive | Discriminated unions; exhaustiveness manual |
| Null safety | Default non-nullable `T`; `T?` for nullable | `strictNullChecks` opt-in; `!` assertion allowed |
| Escape hatches | `dynamic` only — explicit, lintable | `any`, `as`, `!` disable checking silently |
| Banned complexity | No enums, decorators, intersections, mapped/conditional types | Full type-level programming surface |
| JS syntax | ECMAScript superset — same files, same tooling path | Same |
| npm interop | `@superjs/types-*` wrappers + `dynamic` | Native `.d.ts` ecosystem |

Deeper comparison: [SJS vs TypeScript](../comparisons/sjs-vs-typescript.md).

## What SJS loses vs TypeScript

This section is mandatory — SuperJS is a trade, not a free upgrade.

- **No `any` escape hatch** — intentional. Untyped boundaries require `dynamic` and runtime checks.
- **No decorators** — NestJS, Angular, and similar frameworks that depend on TC39-stage-3 decorators are not targets today.
- **No conditional, mapped, or `infer` types** — no type-level string manipulation or deep utility-type gymnastics.
- **Smaller typed-wrapper ecosystem** — 30 wave-1 `@superjs/types-*` packages exist; TypeScript has years of DefinitelyTyped coverage.
- **No self-hosting compiler yet** — the production CLI is TypeScript + Babel today; the native LLVM backend is on the roadmap (v2.0).
- **Smaller community** — fewer Stack Overflow answers, fewer blog posts, pre-1.0 semver.

If you need the full npm type graph on day one, or your architecture depends on decorators and advanced conditional types, TypeScript is the better fit.

## Comparison table: alternatives

| Feature | SJS | TypeScript | ReScript | Flow | Elm |
|---------|-----|------------|----------|------|-----|
| Sum types | ✓ | partial (discriminated union) | ✓ | ✓ | ✓ |
| Null safety (non-nullable default) | ✓ | ✗ (`strictNullChecks` opt-in) | ✓ | ✓ | ✓ |
| Exhaustive `match` | ✓ | ✗ (manual workaround) | ✓ | ✓ | ✓ |
| JS interop | good (`dynamic`) | excellent | complex | good | limited |
| Compiles to JS | ✓ | ✓ | ✓ | ✗ (checker only) | ✓ |
| npm ecosystem | via `@superjs/types-*` | native | via bindings | native | limited |
| Learning curve from TS | low | — | high | medium | high |

### ReScript comparison

ReScript is the closest peer: sound types, sum types, pattern matching, JS output. The divergence is audience and syntax. ReScript intentionally moves away from JavaScript — new syntax, new stdlib idioms, a distinct ecosystem. SuperJS keeps JavaScript syntax and targets **TypeScript teams** who want stronger guarantees without learning a new surface language. If you are greenfield and happy in ReScript's world, stay there. If you have `.ts` files, Node services, and npm dependencies today, SJS is the incremental path.

### Why not Elm / PureScript?

Elm and PureScript are pure FP languages with excellent correctness stories and limited JavaScript interop. They suit frontend or fully FP codebases willing to accept ecosystem boundaries. SuperJS is for **incremental adoption** in existing JS/TS shops — same syntax, same bundlers, same deployment targets.

### Why not Civet / Imba?

Civet and Imba are **syntax extensions** — they compile to JavaScript/TypeScript but inherit TypeScript's type system (or layer on top of it). SuperJS is a **different type system** with different guarantees (banned `any`, exhaustive match, no intersection types). Syntax sugar and a stricter language solve different problems.

## When to use SJS vs TypeScript

**Choose SuperJS when:**

- You want sum types and exhaustive `match` without `switch` fall-through bugs
- You want null safety without remembering to enable `strictNullChecks`
- You want errors as values (`Result<T, E>`) visible in types, not only in docs
- You are starting a **new backend** on Node, Workers, or Lambda and can adopt `.sjs` from day one
- You are willing to use `@superjs/types-*` wrappers or `dynamic` at npm boundaries

**Stick with TypeScript when:**

- You maintain a large existing `.ts` codebase and migration cost outweighs gains
- You need decorators (NestJS, Angular) or heavy conditional/mapped type utilities
- You need immediate, complete DefinitelyTyped coverage for niche packages
- You depend on tooling that only understands TypeScript ASTs today

## Learn more

- [Language tour](../tour/index.md) — guided lessons (WS-A4a)
- [Compatibility matrix](../compat/index.md) — `@superjs/types-*` coverage
- [Migration guide](../migration/index.md) — TS → SJS (WS-A4b)
- [Mission & principles](../../specs/mission.md)
