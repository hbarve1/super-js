# dynamic/

`dynamic` — the explicit runtime-checked escape hatch for JS interop.

`dynamic` opts a value out of static type checking entirely.
The compiler trusts you to narrow it before use.
That makes it powerful at JS API boundaries and dangerous everywhere else.

**Prefer `T?` or a sum type whenever the shape is known.**
Reserve `dynamic` for values whose structure cannot be expressed statically:
`JSON.parse` results, responses from untyped JS libraries, plugin APIs, etc.

---

## Decision guide

| Situation | Correct tool |
|---|---|
| Value may be absent but is always the same type | `T?` |
| Value is one of several distinct known shapes | sum type (`\| A \| B \| C`) |
| Value comes from `JSON.parse` or untyped JS | `dynamic` |
| Value comes from a third-party lib with no types | `dynamic` (at the boundary only) |

---

## Files (reading order)

| File | Concepts taught |
|---|---|
| `01-when-to-use.sjs` | When to reach for `dynamic` vs `T?` vs sum type — decision guide with correct and incorrect examples |
| `02-js-interop.sjs` | `dynamic` at the JS API boundary, `typeof` narrowing, converting to typed records and lists |

---

## Running the examples

```bash
# 01 — dynamic vs T? vs sum type decision guide
superjs build --source prototype/examples/dynamic/01-when-to-use.sjs --outDir /tmp/out && node /tmp/out/01-when-to-use.js

# 02 — dynamic at the JS interop boundary
superjs build --source prototype/examples/dynamic/02-js-interop.sjs --outDir /tmp/out && node /tmp/out/02-js-interop.js
```

---

## Key rules

- `dynamic` disables type checking for that value — do not let it leak beyond the boundary function.
- Narrow with `typeof x === "string"` / `typeof x === "number"` / `Array.isArray(x)`, not with `as T` casts.
- A function that returns `dynamic` should be a named boundary helper (e.g. `parseConfig`), not scattered throughout business logic.
- If you find yourself writing `dynamic` for convenience rather than necessity, reach for `T?` or a sum type instead.
