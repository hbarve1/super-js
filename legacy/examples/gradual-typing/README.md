# Gradual Typing

SJS supports a smooth migration path from plain JavaScript to fully typed code. You can add types incrementally — one file, one function, or one parameter at a time — without rewriting everything at once.

## Files

| File | Description |
|------|-------------|
| `step-by-step.sjs` | Five-stage migration: unannotated JS → `dynamic` params → return types → null-safe types → `Result<T,E>` validation |

## Reading order

1. `step-by-step.sjs` — follow stages 1–5 top to bottom

## Migration stages at a glance

| Stage | What changes |
|-------|-------------|
| 1 | No annotations — plain JS |
| 2 | Add `dynamic` to escape-hatch parameters |
| 3 | Add return type annotation |
| 4 | Replace `dynamic` with precise types + null-safe narrowing |
| 5 | Validate input with `Result<T,E>` instead of throwing |

## Running the example

```bash
superjs build --source gradual-typing/step-by-step.sjs --outDir /tmp/out && node /tmp/out/step-by-step.js
```
