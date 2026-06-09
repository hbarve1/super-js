# SJS-E015 — Cannot narrow an access modifier on an overriding method or property

**Severity:** error  
**Category:** access-modifiers  
**Stage:** Stage 1

## Description

When a subclass overrides a method or property, it must not make the member less accessible than
the base class declaration. Narrowing visibility would violate the Liskov Substitution Principle:
code that holds a reference typed as the base class could no longer rely on the member being
accessible.

Permitted direction: a subclass may widen access (e.g., `protected` → `public`).  
Forbidden direction: a subclass may **not** narrow access (e.g., `public` → `protected`,
`public` → `private`, or `protected` → `private`).

## Example

```sjs
// ✗ error
class Shape {
  public area(): number { return 0 }
}

class Circle extends Shape {
  private area(): number { return 3.14 }   // SJS-E015 — narrowed from public to private
}
```

```sjs
// ✗ error
class Base {
  protected describe(): string { return "base" }
}

class Child extends Base {
  private describe(): string { return "child" }   // SJS-E015 — narrowed from protected to private
}
```

## Fix

Keep the same (or wider) access modifier on the overriding member:

```sjs
// ✓ correct — same visibility
class Shape {
  public area(): number { return 0 }
}

class Circle extends Shape {
  public area(): number { return 3.14 }
}
```

```sjs
// ✓ correct — widened from protected to public
class Base {
  protected describe(): string { return "base" }
}

class Child extends Base {
  public describe(): string { return "child" }
}
```

## Related codes

- `SJS-E014` — private or protected member not accessible from this scope
- `SJS-E016` — cannot instantiate an abstract class directly
