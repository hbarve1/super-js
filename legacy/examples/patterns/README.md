# Patterns

Design patterns expressed in SJS idioms.

## Files

| File | Demonstrates |
|------|-------------|
| `builder.sjs` | Fluent builder with immutable config snapshots |
| `dependency-injection.sjs` | Constructor injection, service locator |
| `events.sjs` | Typed event bus using sum types + match |
| `functional.sjs` | Option type, curry, compose, pipeline |
| `middleware.sjs` | Function composition middleware chain |
| `observable.sjs` | Observable/subscriber pattern |
| `state.sjs` | Redux-style reducer with sum type actions |

## Key SJS Idioms

- **Sum types replace enums**: `type Action = | Increment | Decrement | SetValue { value: number }`
- **match replaces switch**: exhaustive by default, compiler error on missing variant
- **dynamic not any**: `function handle(data: dynamic)` for truly unknown external data
- **T? not T|null**: `const result: string? = null`
