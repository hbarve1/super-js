# SJS-E016 — Cannot instantiate an abstract class directly with `new`

**Severity:** error  
**Category:** classes  
**Stage:** Stage 1

## Description

An `abstract` class is an incomplete type intended only as a base for subclasses. It may declare
abstract methods that have no implementation. Calling `new` on an abstract class directly is a
type error because the resulting object would have unimplemented methods, making it unsound.

Abstract classes must be subclassed, and all abstract members must be implemented by the concrete
subclass before an instance can be created.

## Example

```sjs
// ✗ error
abstract class Animal {
  abstract speak(): string
}

const a = new Animal()   // SJS-E016
```

## Fix

Extend the abstract class with a concrete subclass that implements every abstract member, then
instantiate the subclass:

```sjs
// ✓ correct
abstract class Animal {
  abstract speak(): string

  describe(): string {
    return `I say: ${this.speak()}`
  }
}

class Dog extends Animal {
  speak(): string { return "woof" }
}

const d = new Dog()        // ✓
console.log(d.describe())  // "I say: woof"
```

## Related codes

- `SJS-E015` — cannot narrow an access modifier on an overriding method
