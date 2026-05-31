# null-safety/

Null safety — working with nullable values (`T?`) without null reference errors.

SJS is **non-nullable by default**: a plain `string` can never be `null`.
Append `?` to make a type nullable: `string?` means `string | null`.
Optional function parameters (`x?: T`) follow JS semantics and yield `T | undefined` on access.
The `?.` optional-chaining operator also returns `T | undefined` — this is standard JS behaviour, not a SJS-specific type construct.

---

## Files (reading order)

| File | Concepts taught |
|---|---|
| `01-basics.sjs` | `T?` type declarations, null narrowing with `if`, non-nullable by default |
| `02-chaining.sjs` | `?.` optional chaining on objects, arrays, and function calls |
| `03-defaults.sjs` | `??` nullish coalescing, `??=` nullish assignment, difference from `\|\|` |
| `04-nullable-iteration.sjs` | Iterating `T?[]` safely, filtering nulls, for-of with nullable elements |

---

## Running the examples

Build and run each file with the SuperJS CLI:

```bash
# 01 — T? basics and null narrowing
superjs build --source prototype/examples/null-safety/01-basics.sjs --outDir /tmp/out && node /tmp/out/01-basics.js

# 02 — optional chaining ?.
superjs build --source prototype/examples/null-safety/02-chaining.sjs --outDir /tmp/out && node /tmp/out/02-chaining.js

# 03 — nullish coalescing ?? and ??=
superjs build --source prototype/examples/null-safety/03-defaults.sjs --outDir /tmp/out && node /tmp/out/03-defaults.js

# 04 — iterating T?[] safely
superjs build --source prototype/examples/null-safety/04-nullable-iteration.sjs --outDir /tmp/out && node /tmp/out/04-nullable-iteration.js
```

---

## Key distinctions

- `T?` is `T | null` — the **only** nullable annotation for fields and return types in SJS.
- Optional params (`x?: T`) and `?.` results are `T | undefined` — JS runtime semantics.
- `??` triggers only on `null` and `undefined`; `||` triggers on any falsy value (including `0` and `""`).
- Avoid `.filter(Boolean)` for null removal — it erases type information. Use an explicit `for-of` + `if (item !== null)` loop (see `04-nullable-iteration.sjs`).
