# match/ — Pattern Matching in SuperJS

**Theme:** Match expressions — pattern matching on sum type variants, with exhaustiveness checking.

The `match` expression dispatches on the runtime shape of a sum type value.
SJS-E007 fires at compile time when a match is missing one or more variants;
this is intentional — adding a variant to a type will flag every non-exhaustive
match site, forcing you to handle the new case explicitly.

---

## Files (reading order)

### `01-patterns.sjs` — Unit, tuple, and struct variant patterns

All three variant shapes appear in a single `match` expression:

- **Struct pattern** `Click { x; y }` — destructures named fields directly into bindings
- **Tuple pattern** `KeyPress(key)` — binds the positional field by the name you choose
- **Unit pattern** `Resize` — matches by name with no bindings

Also shows that `match` arms can return any type: `string`, `number`, `boolean`.

### `02-destructuring.sjs` — Nested patterns and binding rename

Advanced pattern shapes:

- **Binding rename** `{ left: l; right: r }` — binds `left` under the alias `l`
- **Nested patterns** `Add { left: Lit(0); right: r }` — the field's value is itself a pattern
- **Discard with `_`** `{ remaining: _ }` — match the field but throw away the value
- A recursive expression evaluator and algebraic simplifier are used as running examples

### `03-exhaustiveness.sjs` — SJS-E007 and three ways to fix it

Teaches what exhaustiveness means and how to satisfy it:

1. **Add all missing arms** (preferred) — fully type-safe; new variants become compile errors
2. **Wildcard arm** `_ => ...` — opts out; new variants are silently swallowed
3. **`assertNever` helper** — proves exhaustiveness to the type checker and throws at runtime if somehow reached

The triggering match (missing variants) is shown as a comment so it can be read
without causing a build failure.

---

## Running the examples

Compile a single file and run it with Node:

```bash
npx sjs compile prototype/examples/match/01-patterns.sjs
node prototype/examples/match/01-patterns.js
```

Or compile and run in one step:

```bash
npx sjs run prototype/examples/match/01-patterns.sjs
npx sjs run prototype/examples/match/02-destructuring.sjs
npx sjs run prototype/examples/match/03-exhaustiveness.sjs
```

---

## Key concepts

| Concept | Where to look |
|---|---|
| All three pattern kinds in one expression | `01-patterns.sjs` `handleEvent` |
| Binding rename `field: alias` | `02-destructuring.sjs` `evaluate` |
| Nested patterns | `02-destructuring.sjs` `simplify` |
| Discard field with `_` | `02-destructuring.sjs` `extractExpr` |
| SJS-E007 commented trigger | `03-exhaustiveness.sjs` `describeWrong` |
| Fix 1: full coverage | `03-exhaustiveness.sjs` `describeFix1` |
| Fix 2: wildcard arm | `03-exhaustiveness.sjs` `describeFix2` |
| Fix 3: `assertNever` | `03-exhaustiveness.sjs` `assertNever` |

---

## SJS-E007 note

**SJS-E007: non-exhaustive match** is raised whenever a `match` expression
does not cover every variant of the matched sum type.  This is by design:

- Safe: missing a variant is a compile error, not a silent bug
- Upgrade-safe: adding a new variant to a type flags every match that needs updating
- Opt-out: a `_ => ...` wildcard arm suppresses the error when a catch-all is intended
