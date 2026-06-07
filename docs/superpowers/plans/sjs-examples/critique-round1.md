# Critique — SJS Examples Round 1 Plan

**Reviewed:** `plan-round1.md` (1044 lines)
**Date:** 2026-05-30
**Verdict:** Plan is structurally sound for cleanup of obvious banned-TS patterns, but contains **multiple correctness errors against SJS spec**, has **significant coverage gaps for SJS-distinguishing features**, vague per-file specs in 30%+ of entries, and an unrealistic sprint budget. Major rework required before execution.

---

## 1. Correctness — Plan itself contains banned/incorrect SJS

### 1.1 Plan teaches the wrong nullable pattern in multiple per-file specs

**Line 434** — `null-safety/patterns.sjs` spec defines:
```
type FetchResult<T> = { data: T?, error: string?, status: number }
```
This is not a SJS sum type — it's an ad-hoc object with two nullable fields where only one is meaningful at a time. The whole point of `null-safety/patterns.sjs` should be to demonstrate nullable fields **in addition to** existing sum-type idioms — but using a "data-or-error" object instead of `Result<T,E>` actively teaches the anti-pattern this language was designed to eliminate. **Rewrite as `Result<T, FetchError>`** or be explicit that this is a deliberate counter-example with a sum-type alternative shown beside it.

**Line 438** — `safeJsonParse(raw: string?): dynamic` — returns `dynamic`. The point of `null-safety` is to teach `T?`; this should return `dynamic?` or, better, `Result<dynamic, string>`. Returning bare `dynamic` here loses the null-safety teaching.

**Line 666** — `types/type-aliases.sjs` spec lists:
```
type StringOrNumber = string | number  // union ok
```
The language facts at the top of this critique state non-discriminated unions like `string | number` are awkward in a language whose narrowing primitive is `match` on sum types. The plan does not say HOW the user is supposed to narrow this union — there's no example given. SJS uses sum types as its union story; `string | number` is allowed but every consumer needs a strategy. The spec must show the narrowing technique, or drop this example.

**Line 689** — `types/union-types.sjs` exists at all. If SJS replaces ad-hoc unions with sum types as the primary idiom, an entire file showcasing unrestricted `A | B` unions teaches users to reach for the weaker tool. Either (a) reframe this file as "when to use a union vs when to use a sum type — and why sum types are usually right", or (b) drop the file and merge a small note into `sum-types/basics.sjs`. The current spec just says "show unions" with no guidance.

### 1.2 Decorator file replacement uses banned generics

**Lines 735–736** — `advanced/decorators.sjs` rewrite spec:
```
function withLogging<T: object, K extends string>(fn: (args: T) => K, name: string)
```
This mixes two incompatible constraint syntaxes in one signature: SJS-style `<T: object>` and TypeScript-style `K extends string`. Pick one. The SJS facts say generic constraints use `<T: Comparable<T>>` form, so `K extends string` is wrong. Also `T: object` is a weird constraint here — the function takes `args: T` which says nothing about object-ness; this signature was clearly LLM-generated without thinking about what it means. Rewrite cleanly.

### 1.3 `as dynamic` cast is invented syntax

**Line 957** — `jsx/todo-list.sjs` rewrite says:
```
(e.target as dynamic).value
const input: dynamic = e.target
```
The first line still uses `as` cast — explicitly listed as banned pattern B9 (line 218). The plan flags `as` casts as forbidden in §3.1 then immediately uses one in the rewrite. The second alternative (assignment to `dynamic`-typed local) is what the file should actually do, not `as dynamic`. Remove the first option entirely or the plan teaches the bypass it just banned.

### 1.4 `Partial` is unspecified

**Line 549** — `real-world/task-manager.sjs` spec has:
```
update(id: number, patch: Partial): Result<Task, AppError>
```
`Partial` (no type arg) is meaningless — TypeScript's `Partial<T>` is itself a **mapped type** (`{ [K in keyof T]?: T[K] }`), explicitly banned by B4. The plan does not say what `Partial` is supposed to compile to in SJS. Either define an explicit `TaskPatch` interface with every field nullable, or pick a different update semantics (e.g. typed setter methods). As written this spec is unimplementable.

### 1.5 `Map.get` lies about its return type

**Line 804** — `algorithms/graph.sjs` spec says:
```
All internal `Map.get()` returns (which are `T | undefined`) → use `??` or explicit `T?` field
```
This is contradictory. `Map.get` is a runtime JS API; if SJS represents its return as `T?`, then `??` works directly. If SJS still surfaces it as `T | undefined`, then the plan has nowhere addressed how the standard library is typed. **Add an explicit research item: how does SJS type built-in Map/Array methods?** Without that, every algorithm file rewrite is guessing.

Same issue at **line 854** — `Map<number, dynamic>` for the cache. Is `Map.get` on this typed `dynamic` or `dynamic?`?

### 1.6 `Constructor<T>` rewrite is still wrong

**Line 833** — `oop/mixins.sjs` plan replaces:
```
type Constructor<T = {}> with ...args: any[]
```
with
```
type Constructor<T> = new () => T  (no any[] varargs)
```
But the no-arg `new () => T` won't compose with mixins that take real constructor args. The plan removes the problem by removing the feature; it doesn't actually fix the mixin pattern. If mixins genuinely need varargs and SJS bans `any[]`, the honest answer is **mixins-as-classes don't work here — show another composition pattern entirely** (object composition, function composition, structural interfaces). Don't pretend a no-arg constructor type is a mixin.

### 1.7 `private` keyword status is asserted without source

**Line 32, 776, 999** — Plan repeatedly asserts "SJS supports `private`". The language facts at the top of this critique say nothing about `private`. The plan must cite the SJS spec for keyword support before relying on it across 10+ rewrites. If unconfirmed, fall back to `#field` ES2022 private syntax (which is runtime-enforced and provider-neutral).

### 1.8 `abstract` and `implements` claims are inconsistent

**Line 32** — says `abstract` is "ok"
**Line 999–1000** — repeats this
**Line 1004** — `implements Shape → remove keyword (structural)` — i.e., `implements` banned

But **line 32** also says `abstract` keyword is supported. If SJS uses **structural typing only**, what does `abstract class` mean structurally? Either SJS has a nominal class system (in which case `implements` should exist) or it's structural (in which case `abstract` is suspicious too). The plan does not engage with this. Either confirm both keywords against the spec or remove both assumptions.

---

## 2. Coverage gaps — Major SJS features have ZERO dedicated examples

The plan's stated goal is "fill structural gaps". It misses several core SJS-distinguishing features:

### 2.1 `dynamic` type has no dedicated example

`dynamic` is **the** explicit escape-hatch that distinguishes SJS from `any`. The plan uses `dynamic` as a band-aid in 6 rewrites (jsx, middleware, DI, mixins, async cache, null-safety/patterns) but has no file teaching:
- What `dynamic` means
- When to use `dynamic` vs `T?` vs sum-type
- How `dynamic` interacts with runtime checks (the plan never even mentions "runtime-checked" though that's the entire point)
- Cost of using `dynamic` (loss of type guarantees)

**Required:** add `gradual-typing/dynamic.sjs` or `types/dynamic.sjs` as a first-class example.

### 2.2 Generic constraint syntax `<T: I>` is barely shown

The plan's R6 (line 232) requires `<T: Interface>` syntax. Counting in per-file specs: it appears in maybe 3 places (generics.sjs line 749, types/generics-advanced.sjs line 615). There should be a dedicated section in `types/generics-advanced.sjs` walking through:
- Multiple constraints
- Constraint with self-reference: `<T: Comparable<T>>` (the canonical case in the spec)
- Constraint conjunction if SJS supports it
- Examples of failure mode when constraint isn't satisfied

### 2.3 Structural interface satisfaction has NO dedicated demonstration

**Line 647** — `types/interfaces.sjs` says "Demonstrate structural typing without `implements`" in one bullet. No concrete example is sketched. Given this is **the** distinguishing feature of SJS's type system vs TS's nominal-ish behavior, it deserves more than a bullet. There should be a worked example:
1. Define interface `Named { name: string }`
2. Define class with `name` field — no `implements`
3. Define plain object with `name` field
4. Pass both to function taking `Named`
5. Show compiler accepts both purely by structure

### 2.4 Gradual-typing progression is dismissed

**Lines 1020–1022** — Plan says "These files intentionally demonstrate untyped / partially-typed code. They are pedagogically correct as-is. Audit only..."

This is the **single most important onboarding story** for a language pitched as "TypeScript-compatible". The plan does not even read these files. There is no example showing:
- A plain JS file
- The same file with one annotation added
- The same file fully annotated
- The same file converted to use sum types instead of unions

That progression should be at least 4 files in `gradual-typing/`. Currently the plan keeps 2 files unread.

### 2.5 `for...of` with sum types / iterators is not shown

The plan mentions `Iterator` only in `advanced/async-iterator.sjs` (async). There is no example of:
- `for (const x of arr)` with sum-typed elements
- Custom `Iterator<T>` implementation structurally
- `for...of` over a sum-type list (`type List<T> = Nil | Cons(T, List<T>)`)

`sum-types/recursive.sjs` has a List but doesn't say to iterate it.

### 2.6 JSX + sum types is missing

The plan keeps JSX examples cosmetically clean but has no example of:
- A React-style component whose props include a `Result<T, E>` and pattern-matches in render
- A component returning `Result<JSX, RenderError>`
- Typed event handlers with sum-typed action dispatch (Elm-style)

This is where SJS's sum-types-in-React story should live. Without it, JSX examples just look like cleaner TSX.

### 2.7 No `SJS-E001` or `SJS-E007` error walkthrough

The plan never demonstrates **what the error feels like**. New users will hit `SJS-E001` (null→non-nullable) and `SJS-E007` (non-exhaustive match) constantly. There should be `null-safety/errors.sjs` and `sum-types/errors.sjs` showing:
- Code that triggers the error (commented out or in a `/* error: ... */` block)
- The exact compiler message
- The two or three idiomatic fixes

Without these, users see only the happy path.

### 2.8 No testing examples

`prototype/src/tester/index.ts` exists in the repo (per git status). There is no `examples/testing/` directory in the plan. Users need to see:
- How to write a SJS test file
- How to assert on `Result<T,E>` values
- How to assert exhaustiveness
- How to test async functions returning `Result`

### 2.9 No CLI / compile / format / lint workflow example

The plan touches only source files, not the developer workflow. A `examples/workflow/` or a README section should walk through:
- `sjs build`
- `sjs check`
- `sjs format`
- `sjs lint`
- `sjs test`

(Per the CLI contract in `specs/001-superjs-core-language/contracts/cli-interface.md`, referenced in CLAUDE.md.)

---

## 3. Quality — Per-file specs are uneven; ~30% are vague

### 3.1 "AUDIT" rows are placeholders, not specs

The audit table (§1) marks ~20 files as "AUDIT" or "(not read)". A plan that defers reading 20 files cannot estimate effort, cannot guarantee coverage, and cannot be reviewed for correctness. **Read every file BEFORE producing the plan,** then specify each one concretely. Examples of vague entries:

- **Line 24** — `algorithms/binary-search-tree.sjs` — "(not read but pattern-similar) likely `T | null` for nodes"
- **Line 29** — `async/error-handling.sjs` — "(not read) title implies `try/catch` patterns likely using `any` for caught errors"
- **Line 31** — `basics/arrays.sjs` — "(not read, new file on branch 001) likely clean new file"
- **Line 53** — `oop/inheritance.sjs` — "(not read) likely clean"
- **Line 66** — `types/type-aliases.sjs` — "(not read) unknown"
- **Line 67** — `types/type-guards.sjs` — "(not read) likely uses `is` type predicate"
- **Line 68** — `types/union-types.sjs` — "(not read) likely uses `A | B` union — ok if not intersection"

A "likely" plan is not a plan. Each row needs a concrete content sketch.

### 3.2 Specs that just say "audit, apply standard fixes"

**Lines 842–844, 867–869, 933–942, 962–964, 1026–1028, 1032–1034** — Six per-file sections amount to "read on Sprint X start, apply standard fixes". This is not a per-file spec; it is a TODO. The plan implicitly expects the implementer to re-derive the entire spec at execution time. Either:
- Read the files now and write the actual spec, OR
- Remove these sections from the per-file specs and explicitly call them out as "deferred research".

### 3.3 Specs lack acceptance criteria

The quality criteria in §3 (line 204) are global, not per-file. Each per-file spec should end with concrete acceptance criteria:
- Lines: <= 200 (or specify)
- Must compile under `sjs check`
- Must run under `sjs build && node out.js` (or whatever the runtime path is)
- Must produce stated output

Otherwise a file is "done" when the implementer decides it's done.

### 3.4 No worked code samples in specs

Per-file specs give signatures but never the body. A reviewer cannot tell from line 499 (`mapResult` signature) whether the implementation will use match correctly. At minimum, **show the body of one canonical function per file in the spec** so the implementer can pattern-match the rest.

---

## 4. Runnable — Will any of these actually execute?

### 4.1 No file claims a runnable status

The plan never says how files are validated. `node/src/analyzer.sjs` is "kept" because it's "already correct SJS" — but is that "correct under the current prototype compiler" or "correct under the spec"? The two may differ on branch 001.

**Required:** every file's exit criterion must include a literal command that proves it works (`sjs check examples/X.sjs && sjs build examples/X.sjs && node out.js`).

### 4.2 Node API dependencies are not addressed

`async/async-await.sjs`, `node/src/*`, `web/src/*` likely depend on `fs`, `http`, DOM APIs. The plan does not address:
- Are SJS type bindings for Node.js available?
- Are DOM type bindings available?
- Are these examples meant to compile but not run, or run end-to-end?
- For web examples, what's the build pipeline (bundler? plain browser?)

**Line 1032** — "The web example is a browser todo app — watch for DOM type casts" admits DOM types are unresolved without specifying the resolution.

### 4.3 `real-world/http-client.sjs` "mock fetch" is hand-waving

**Line 574** — `async function request<T>(config): Promise<Result<T, HttpError>> — mock fetch, wraps errors in sum type variants`. "Mock fetch" how? Inline `setTimeout`? `globalThis.fetch` stub? If the file is supposed to be educational, the mocking strategy is part of the example. Specify it.

### 4.4 Map literal syntax is assumed without spec reference

**Line 518** — `JsonObject(Map<string, Json>)` — does SJS have a Map literal? How does one construct one inline for the demo? Same question at lines 570, 599. Either confirm SJS Map syntax or use a different container.

---

## 5. Teaching order — Progression is broken

### 5.1 No stated learning path

The plan creates `null-safety/`, `sum-types/`, `real-world/` but never says "do null-safety first, then sum-types, then real-world". A new user landing in `examples/` sees 14 directories in alphabetical order. README plan (line 1042) gestures at "best starting points" but the spec doesn't define the canonical learning sequence.

**Required:** define explicit order:
1. `basics/hello-world.sjs`
2. `basics/variables.sjs` → ... → `basics/classes.sjs`
3. `null-safety/basics.sjs` → `chaining` → `defaults` → `patterns`
4. `sum-types/basics.sjs` → `match` → `generic-sum-types` → `recursive`
5. `gradual-typing/`
6. `oop/`, `algorithms/`
7. `patterns/`
8. `real-world/`

And number the files (`01-basics.sjs`, `02-chaining.sjs`) so directory listing matches reading order.

### 5.2 `real-world/` examples are introduced before prerequisites

`real-world/task-manager.sjs` uses generics, sum types, classes, nullable, `Result`, `match`, `Map`. The plan never sequences which earlier examples teach each piece. If a user opens `task-manager.sjs` first, they hit 7 new concepts at once.

### 5.3 Sum types before null safety is debatable

Plan's sprint A creates both directories in parallel. Pedagogically, `T?` is simpler than `type Option<T> = Some(T) | None` because `T?` works without explaining variants. Build the curriculum so `null-safety/` is fully understood before `sum-types/` is introduced, OR introduce sum types first and then explain `T?` as syntactic sugar over `Option`. Decide and commit.

---

## 6. Real-world examples — Are they realistic?

### 6.1 `task-manager.sjs` is a toy in real-world clothing

In-memory Map, no persistence, no concurrency, no IO. This is a CRUD object, not a real-world app. Either:
- Rename `real-world/` to `mini-apps/` (honest), OR
- Add real-world concerns: file persistence (config-loader does this — good), HTTP IO (http-client — good), error recovery, retries.

`task-manager.sjs` as currently specified is just "OOP + sum types"; it belongs in `oop/` or `patterns/`.

### 6.2 `http-client.sjs` doesn't demonstrate cancellation, timeouts, retries

A real HTTP client has timeout (`config.timeout` is mentioned but never used in any function spec), retry on failure, cancellation via AbortSignal. The plan's spec shows just `get`, `post`, `mapHttpResult`. This is closer to "Result + async" than "real HTTP client". Add retry/timeout logic, otherwise demote it.

### 6.3 `config-loader.sjs` over-uses `Map<string, dynamic>`

**Line 600** — `loadConfig(raw: Map<string, dynamic>)` — accepting an untyped map is fine as an input shape, but the entire validation pipeline runs on `dynamic`. The example needs to show how `dynamic` values get **runtime-checked** into typed fields, with the runtime-check failure becoming a sum-type variant. The plan does not specify the runtime check primitive (does SJS have one? `typeof`? a built-in `assertType<T>(d: dynamic): T?`?).

### 6.4 No real-world example uses concurrency

For async to feel real, an example should use `Promise.all`, race conditions, or async iteration over IO. The plan has nothing like this.

---

## 7. Missing example categories (recap with priority)

| Priority | Missing category | Why required |
|---|---|---|
| P0 | `dynamic` dedicated examples | Distinguishing feature; currently undocumented |
| P0 | Structural interface satisfaction (no `implements`) | Distinguishing feature; only mentioned in bullet |
| P0 | Error walkthroughs (SJS-E001, SJS-E007) | New users hit these first |
| P0 | Testing examples | Test runner exists; users have no template |
| P1 | Gradual typing progression (plain JS → typed) | Onboarding story for TS users |
| P1 | `<T: Constraint>` generic syntax | Listed as required idiom R6 but barely shown |
| P1 | JSX with sum types | The synthesis SJS enables; missing |
| P1 | `for...of` with sum types and iterators | Common pattern |
| P2 | CLI / workflow walkthrough | Users need it; touches all 5 CLI commands |
| P2 | Concurrency (`Promise.all`, async iteration) | Needed for real-world async story |
| P2 | Module patterns: re-exports, default vs named, dynamic import | Plan adds 2 module files but doesn't enumerate patterns |

---

## 8. Sprint sizing — Underestimated

### 8.1 Sprint A claims 11 net-new files; spec quality requires more time per file

Each Sprint A file (null-safety, sum-types, real-world) needs:
- Type design
- 4–6 function implementations
- A demo block that compiles
- A header comment
- < 200 lines
- Passes compile + run

At realistic implementation pace (with the SJS compiler maturity on branch 001 — see modified files in git status), each file is 60–120 min including debugging compiler edge cases. 11 files = 11–22 hours, not "one sprint" if sprint = 1 day.

### 8.2 Sprint B = 15 rewrites of the hardest files

`types/generics-advanced.sjs` and `types/literal-and-enum.sjs` were near-total rewrites. Even at 45 min each, 15 files = 11 hours minimum. With required compiler-debugging round-trips, likely 20+ hours.

### 8.3 Sprint D bundles "audit + 2 new modules + README + 10+ files"

The biggest sprint by file count is also "audit all the leftovers". Pessimistic: 25+ hours. The plan does not estimate hours at all — it should.

### 8.4 No buffer for compiler bugs

Branch 001 is **the** "superjs-core-language" branch (per CLAUDE.md). Examples will hit compiler bugs. The plan has zero allowance for:
- Filing compiler issues
- Coordinating with compiler fixes
- Re-running examples after compiler changes

Add a "Sprint 0: dogfood the compiler on 3 representative examples" before committing to 67 files.

### 8.5 No allowance for review cycles

Each sprint says "exit condition: passes quality criteria" but doesn't say who reviews. If self-review, add 25% time. If peer review, add a review loop per sprint.

**Recommended re-estimate:** 4 sprints × 2 days each = 8 working days minimum, more likely 12–15.

---

## 9. README plan (line 1038–1043) — Insufficient

### 9.1 Three bullets is not a README spec

The README plan is:
- list directories with one-liner
- call out 3 best starting points
- link idioms to canonical examples

For a language whose primary documentation may be these examples, the README needs:

1. **Prerequisites** — Node version, SJS version, install command
2. **Quickstart** — 5-line snippet that runs end-to-end
3. **Reading order** (see §5.1)
4. **How to run an example** — exact commands per directory if they differ
5. **Idiom cheatsheet** — `T?`, `??`, `?.`, `match`, sum-type decl, generic constraint — one-liner each
6. **When you hit error X** — pointer to error-walkthrough files (which §2.7 says should exist)
7. **Where to file bugs** — link to repo issues
8. **What's missing** — explicit list of unsupported features (decorators? mapped types? — say so up front to manage expectations)
9. **License + contribution** — at minimum a pointer

Plan's README spec covers (1) of (5). Expand.

### 9.2 Per-directory README files are not planned

`algorithms/README.md` is mentioned (line 125) as "keep" but no other directory has a README. Each new directory (`null-safety/`, `sum-types/`, `real-world/`) should have a README that:
- States the theme
- Lists files in reading order
- Calls out shared types / conventions

Without this, the per-file headers (specified in §3.3) carry the entire pedagogical burden.

---

## 10. Process / structural issues with the plan itself

### 10.1 "Round 1" name implies later rounds — what are they?

Plan is titled "Round 1 Rewrite Plan". What's Round 2? Round 3? Without a roadmap, "Round 1" suggests perpetual rework. Either rename to "Cleanup pass + new examples" (descriptive) or define the round sequence.

### 10.2 No traceability to SJS spec

Plan repeatedly invokes "SJS spec says" or "SJS supports X" without citing the spec file. Per CLAUDE.md, relevant artifacts are in `specs/001-superjs-core-language/`. **Every banned-pattern claim should cite a spec line or compiler error code.** Otherwise a reviewer cannot validate the plan.

### 10.3 Plan does not address `prototype/examples/` vs final-location

Plan uses `prototype/examples/` throughout. If these examples will eventually move to docs site (`docs/`), the plan should say so and structure file paths accordingly. Otherwise we'll do this work again at relocation time.

### 10.4 No mention of CI

Examples that compile-and-run should be part of CI to prevent rot. Plan does not mention CI integration. Add: "each example added to test matrix in `prototype/jest.config.ts`" or equivalent.

### 10.5 Summary counts contradict themselves

**Line 195** — "Net new files: 9 (4 null-safety, 4 sum-types, 3 real-world, 2 modules = 9)"
4+4+3+2 = 13, not 9. **Line 346** corrects this to 13. Fix line 195. Math errors in the audit table erode trust in the plan's accounting.

**Line 196** says "Files to rewrite: ~28" — audit table actually shows ~22 REWRITE markers. Recount.

---

## Top-priority fixes before execution

1. **Read all 20 "(not read)" files and rewrite the audit table with concrete violation lists.** (blocks accurate sizing)
2. **Cite SJS spec for every keyword claim** (`private`, `abstract`, `implements`, Map type, optional param syntax). (blocks correctness)
3. **Add 4 missing categories: `dynamic`, structural-interfaces, errors-walkthrough, testing.** (blocks coverage)
4. **Fix the plan-internal correctness bugs in §1 of this critique** (Partial, FetchResult, decorator generics, `as dynamic`). (blocks execution)
5. **Define reading order and number files accordingly.** (blocks pedagogy)
6. **Resolve `Map.get` typing question** — `T?` vs `T | undefined` at the standard-library boundary. (blocks all algorithm rewrites)
7. **Add hour estimates per sprint and a Sprint 0 dogfooding pass.** (blocks scheduling)
8. **Expand README spec to 8+ sections; add per-directory READMEs.** (blocks onboarding)

Only after these are addressed should implementation begin.
