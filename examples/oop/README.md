# OOP Patterns

Object-oriented patterns in SJS using structural typing and composition.

## Files

| File | Demonstrates |
|------|-------------|
| `abstract-classes.sjs` | Interfaces as abstract contracts, structural typing |
| `inheritance.sjs` | Interface extension, factory composition, polymorphism |
| `mixins.sjs` | Behavior composition via factory functions |

## SJS OOP Philosophy

SJS uses **structural typing** — no `implements` keyword needed.
Any object matching an interface's shape satisfies it automatically.

- **Abstract classes** → interfaces + factory functions
- **Classical inheritance** → interface extension + `{ ...base, ...overrides }`
- **Mixins** → `withFeature(obj)` factory composition
- **Polymorphism** → interface arrays, structural subtyping

## Key Idioms

```sjs
// "Extends" via interface extension
interface ElectricVehicle extends Vehicle {
  range(): number
}

// "Mixin" via generic spread factory
function withTimestamps<T>(obj: T): T & Timestamped { ... }

// Structural narrowing — accept any Vehicle that also has range()
function printRange(v: Vehicle & HasRange): void { ... }

// Polymorphism over base interface
const shapes: Shape[] = [createCircle(5), createRectangle(4, 6)]
for (const s of shapes) console.log(s.area())
```
