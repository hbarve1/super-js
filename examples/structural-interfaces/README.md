# structural-interfaces/

Structural interfaces — any value with the right shape satisfies an interface.

SJS uses **structural typing**: a class or object literal satisfies an interface
if it has all the required fields and methods, whether or not it explicitly
declares `implements`. The `implements` keyword is optional in SJS and is
intentionally omitted in these examples to illustrate that point.

Generic type parameter constraints use `<T: Interface>` syntax, **not** `<T extends Interface>`.
Multiple constraints in a single type parameter are written `<T: A & B>`.

---

## Files (reading order)

| File | Concepts taught |
|---|---|
| `01-no-implements.sjs` | Structural typing — classes and plain objects satisfy interfaces by shape, no `implements` needed, one value satisfying multiple interfaces |
| `02-generic-interfaces.sjs` | `<T: Interface>` constraint syntax, self-referential `<T: Comparable<T>>`, multiple constraints `<T: A & B>` |

---

## Running the examples

```bash
# 01 — satisfaction by shape, no implements
superjs build --source prototype/examples/structural-interfaces/01-no-implements.sjs --outDir /tmp/out && node /tmp/out/01-no-implements.js

# 02 — <T: Constraint> generic syntax
superjs build --source prototype/examples/structural-interfaces/02-generic-interfaces.sjs --outDir /tmp/out && node /tmp/out/02-generic-interfaces.js
```

---

## Key distinctions

- `implements` is optional — SJS checks the shape, not the declaration.
- Use `<T: Interface>` for generic constraints, never `<T extends Interface>`.
- Multiple constraints: `<T: A & B>` — the `&` is only valid in the type-parameter constraint position.
- Plain object literals satisfy interfaces too, not just class instances.
- Structural typing means a class can satisfy an interface that was written after the class, with no changes to the class.
