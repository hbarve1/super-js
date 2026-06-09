# 008 — Access Modifiers

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §AccessModifier, §ClassProperty, §ClassMethod, §ClassConstructor

---

## Syntax

```ebnf
<AccessModifier>   ::= "public" | "private" | "protected"

<ClassProperty>    ::= [ <AccessModifier> ] [ "static" ] [ "readonly" ] [ "abstract" ]
                       <Identifier> [ "?" ] [ ":" <Type> ] [ "=" <Expression> ] ";"

<ClassMethod>      ::= [ <AccessModifier> ] [ "static" ] [ "abstract" ] [ "async" ]
                       [ "get" | "set" | "*" ]
                       <Identifier>
                       [ <TypeParameters> ]
                       "(" [ <ParameterList> ] ")"
                       ":" <Type>
                       ( <Block> | ";" )

<ClassConstructor> ::= [ <AccessModifier> ] "constructor"
                       "(" [ <ConstructorParameterList> ] ")"
                       <Block>

<ConstructorParameterList> ::= <ConstructorParameter> { "," <ConstructorParameter> }
<ConstructorParameter>     ::= [ <AccessModifier> ] <Parameter>
                               (* parameter with access modifier → parameter property *)
```

Modifiers must appear in the order shown above. For example, `public static readonly x` is valid; `static public x` is a parse error.

---

## Semantics

### The three access levels

#### `public` (default)

A `public` member is accessible from any scope: within the class body, in subclasses, and from external code. `public` is the default — if no access modifier is written, the member is public. Writing `public` explicitly is redundant but permitted; the compiler emits a lint warning `SJS-W005`.

```sjs
class Logger {
  public level: string = "info"     // explicit public — redundant, allowed
  message: string = ""              // implicit public — identical effect
  public log(msg: string): void { console.log(msg) }
}

const l = new Logger()
l.level = "debug"    // ✓ — public
l.message = "hi"     // ✓ — public (implicit)
```

#### `private`

A `private` member is accessible **only within the declaring class body** — specifically, only through `this.member` expressions inside methods or property initializers of that class. Access from outside the class body, even through an instance variable of the correct type, is a type error.

`private` is **type-level enforcement only** in the JS output. The compiled JS does not use `#field` (hard-private) syntax. The JS runtime does not enforce access restrictions; external code could access private members at runtime if TypeScript-style soft privacy is acceptable. For runtime privacy, use `#field` syntax (see section below).

```sjs
class Counter {
  private count: number = 0

  increment(): void {
    this.count++           // ✓ — within class body
  }

  value(): number {
    return this.count      // ✓ — within class body
  }
}

const c = new Counter()
c.increment()
// c.count = 5           // ✗ SJS-E014 — private outside class body
```

#### `protected`

A `protected` member is accessible within the declaring class body **and** within any subclass body. It is not accessible from outside the class hierarchy.

```sjs
class Animal {
  protected name: string

  constructor(name: string) {
    this.name = name
  }

  protected describe(): string {
    return `I am ${this.name}`
  }
}

class Dog extends Animal {
  bark(): string {
    return this.describe() + " and I bark"   // ✓ — subclass access
  }
}

const d = new Dog("Rex")
// d.name                // ✗ SJS-E014 — protected, not in hierarchy
// d.describe()          // ✗ SJS-E014 — protected, not in hierarchy
```

### Scope of application

Access modifiers apply to:

| Target | Supported |
|--------|-----------|
| Instance properties | Yes |
| Static properties | Yes |
| Instance methods | Yes |
| Static methods | Yes |
| Constructors | Yes (controls instantiation visibility) |
| Constructor parameter properties | Yes (declares and assigns) |
| Getters and setters | Yes |

### Constructor parameter property shorthand

When a constructor parameter is prefixed with an access modifier, the compiler treats it as a **parameter property declaration**. It automatically:
1. Declares the property on the class with the given modifier and type.
2. Assigns `this.propName = paramName` at the start of the constructor body.

This is syntactic sugar — no semantic difference from declaring the property separately.

```sjs
// Shorthand:
class Point {
  constructor(public x: number, public y: number) {}
}

// Equivalent expansion:
class Point {
  public x: number
  public y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}
```

The shorthand is valid with `public`, `private`, and `protected`. `readonly` may also be combined:

```sjs
class Config {
  constructor(
    public readonly host: string,
    private readonly port: number,
    protected timeout: number = 5000
  ) {}
}
```

### `static` + access modifier

`static` and access modifiers are orthogonal. A `static private` member is private to the class but shared across all instances. A `static protected` member is accessible in static methods of the class and its subclasses.

```sjs
class IdGenerator {
  private static nextId: number = 0

  static generate(): number {
    return IdGenerator.nextId++    // ✓ — static private, within class
  }
}
```

### Method override and access widening

When a subclass overrides an inherited method, the access modifier must be **equal or wider** (more permissive) than the parent's modifier:

- `protected` override of `protected` → ✓ (same)
- `public` override of `protected` → ✓ (widening: more accessible)
- `protected` override of `public` → ✗ `SJS-E015` (narrowing: less accessible)
- `private` override of `private` → each class has its own private copy; not a true override

This rule ensures that code using the base class type can always access the member through the declared interface.

```sjs
class Base {
  protected greet(): string { return "Hello" }
}

class Child extends Base {
  public greet(): string { return "Hi!" }   // ✓ — widened to public
}

class Bad extends Base {
  // protected greet() is fine, but narrowing public to protected is banned:
}

class BasePublic {
  public announce(): void { console.log("Base") }
}

class NarrowedChild extends BasePublic {
  protected announce(): void { console.log("Child") }
  // ✗ SJS-E015 — narrowing public to protected
}
```

### `#field` vs `private` modifier

SJS supports both:

| | `private` modifier | `#field` (ES2022) |
|---|---|---|
| Enforcement | Type-level only | Runtime (hard private) |
| JS output | Property without prefix | Property with `#` prefix |
| Accessible via `Object.keys` | Yes (soft private) | No (hard private) |
| Recommended for | TypeScript migration | New code requiring runtime privacy |
| Syntax | `private x: T` | `#x: T` |

```sjs
class SafeBox {
  #secret: string             // hard private — runtime enforced
  private softSecret: string  // soft private — type-level only

  constructor(s: string, ss: string) {
    this.#secret = s
    this.softSecret = ss
  }
}
```

`#field` declarations do not carry an access modifier keyword — the `#` prefix itself denotes privacy. Mixing `private #field` is a parse error.

### Abstract members

`abstract` methods may carry `protected` or `public` but not `private` (abstract methods must be accessible by subclasses to be overridable):

```sjs
abstract class Shape {
  abstract area(): number             // implicitly public
  protected abstract describe(): string   // protected abstract — valid
  // private abstract draw(): void    // ✗ — private abstract not allowed
}
```

---

## Type rules

### Public access (anywhere)

```
Γ ⊢ e : C    member m of C has modifier public
────────────────────────────────────────────── (access-public)
Γ ⊢ e.m : T_m
```

### Private access (within class only)

```
Γ ⊢ this : C    member m of C has modifier private
─────────────────────────────────────────────────── (access-private-ok)
Γ ⊢ this.m : T_m

Γ ⊢ e : C    (e is not `this` or e is not within C's body)
member m of C has modifier private
─────────────────────────────────────────────────────────── (access-private-fail)
SJS-E014: private member 'm' is not accessible outside class C
```

### Protected access (class and subclasses)

```
Γ ⊢ this : D    D extends C (directly or transitively)
member m of C has modifier protected
──────────────────────────────────────────────────────── (access-protected-ok)
Γ ⊢ this.m : T_m

Γ ⊢ e : C    e is not `this` in C or a subclass of C
member m of C has modifier protected
──────────────────────────────────────────────────────── (access-protected-fail)
SJS-E014: protected member 'm' is not accessible outside class hierarchy
```

### Override access widening

```
C has method m with modifier Mc
D extends C, D declares override of m with modifier Md
Md is at least as permissive as Mc   (public ≥ protected ≥ private)
────────────────────────────────────────────────────── (override-access-ok)
Override is valid

Md is strictly less permissive than Mc
────────────────────────────────────────────────────── (override-access-fail)
SJS-E015: override of 'm' narrows access from Mc to Md
```

---

## JS Lowering (Prototype)

Access modifiers are **erased** in the JS output. The compiled JS uses plain class syntax without access prefix. No `#field` syntax is generated for `private` modifier (only for explicit `#field` declarations). Runtime access is unrestricted.

```sjs
// SJS input
class Counter {
  private count: number = 0

  public increment(): void {
    this.count++
  }

  public value(): number {
    return this.count
  }
}
```

```javascript
// JS output — access modifiers erased
class Counter {
  count = 0;

  increment() {
    this.count++;
  }

  value() {
    return this.count;
  }
}
```

Constructor parameter property shorthand is expanded:

```sjs
// SJS input
class Point {
  constructor(public x: number, private y: number) {}
}
```

```javascript
// JS output
class Point {
  x;
  y;
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
```

`#field` declarations are preserved in JS output (they are valid ES2022):

```sjs
// SJS input
class Vault {
  #secret: string = ""
  set(s: string): void { this.#secret = s }
  get(): string { return this.#secret }
}
```

```javascript
// JS output
class Vault {
  #secret = "";
  set(s) { this.#secret = s; }
  get() { return this.#secret; }
}
```

---

## LLVM Lowering (Future)

At the LLVM level, access modifiers affect **linkage and symbol visibility**, not the memory layout of structs.

**`public` fields and methods:**
- Instance fields: accessible via struct offset; offset exported in the type descriptor.
- Methods: external linkage; callable from any translation unit.

**`private` fields and methods:**
- Instance fields: allocated in the struct; offset is not exported. Only the class's own methods have the offset constant.
- Methods: internal linkage (`define internal`); not callable from outside the translation unit.

**`protected` fields and methods:**
- Instance fields: offset exported to subclass translation units only (via a protected symbol).
- Methods: linkage restricted to the class hierarchy.

```llvm
; public method — external linkage
define double @Counter_value(%Counter* %self) {
  %count_ptr = getelementptr %Counter, %Counter* %self, i32 0, i32 0
  %count = load double, double* %count_ptr
  ret double %count
}

; private method — internal linkage
define internal void @Counter_increment(%Counter* %self) {
  %count_ptr = getelementptr %Counter, %Counter* %self, i32 0, i32 0
  %count = load double, double* %count_ptr
  %new = fadd double %count, 1.0
  store double %new, double* %count_ptr
  ret void
}
```

**`static` fields:** allocated once in the global data section, not per-instance. Access modifier determines the symbol's linkage.

```llvm
; static private field — internal linkage global
@IdGenerator_nextId = internal global double 0.0
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E014` | Access to `private` member from outside the declaring class body |
| `SJS-E014` | Access to `protected` member from outside the class hierarchy |
| `SJS-E015` | Override of an inherited method narrows the access modifier |
| `SJS-W005` | Explicit `public` modifier used (redundant; `public` is the default) |
| Parse error | `private abstract` method (private abstract is not allowed) |
| Parse error | `private #field` (combining `private` keyword with `#` syntax) |
| Parse error | Access modifier on a parameter that is not a constructor parameter |

---

## Examples

### Valid

```sjs
// ✓ Basic public / private / protected
class BankAccount {
  protected balance: number

  constructor(initialBalance: number) {
    this.balance = initialBalance
  }

  public deposit(amount: number): void {
    if (amount > 0) this.balance += amount
  }

  private validate(amount: number): boolean {
    return amount > 0 && amount <= this.balance
  }

  public withdraw(amount: number): boolean {
    if (!this.validate(amount)) return false
    this.balance -= amount
    return true
  }

  public getBalance(): number {
    return this.balance
  }
}

// ✓ Constructor parameter property shorthand
class Vector2D {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {}

  magnitude(): number {
    return Math.hypot(this.x, this.y)
  }
}

const v = new Vector2D(3, 4)
console.log(v.x)           // ✓ public
console.log(v.magnitude()) // ✓ public method
// v.x = 10               // ✗ SJS-E002 — readonly

// ✓ Static + private
class Sequence {
  private static next: number = 0

  static generate(): number {
    return Sequence.next++
  }

  private id: number

  constructor() {
    this.id = Sequence.generate()
  }

  getId(): number {
    return this.id
  }
}

// ✓ Protected in subclass
class Vehicle {
  protected speed: number = 0
  protected maxSpeed: number

  constructor(max: number) {
    this.maxSpeed = max
  }

  protected accelerate(delta: number): void {
    this.speed = Math.min(this.speed + delta, this.maxSpeed)
  }
}

class Car extends Vehicle {
  constructor() { super(200) }

  floorIt(): void {
    this.accelerate(50)        // ✓ — protected in subclass
    this.accelerate(50)
    this.accelerate(50)
    console.log(this.speed)   // ✓ — protected property in subclass
  }
}

// ✓ Abstract + protected
abstract class Formatter {
  protected abstract format(value: unknown): string

  public print(value: unknown): void {
    console.log(this.format(value))
  }
}

class JsonFormatter extends Formatter {
  protected format(value: unknown): string {
    return JSON.stringify(value)
  }
}

// ✓ #field (hard private) vs private modifier (soft private)
class Token {
  #raw: string                // hard private — runtime enforced
  private cached: string?     // soft private — type-level only

  constructor(raw: string) {
    this.#raw = raw
    this.cached = null
  }

  toString(): string {
    if (this.cached === null) {
      this.cached = Buffer.from(this.#raw).toString("base64")
    }
    return this.cached
  }
}
```

### Invalid

```sjs
// ✗ SJS-E014: accessing private member from outside class
class Secret {
  private data: string = "hidden"
}

const s = new Secret()
console.log(s.data)    // SJS-E014: 'data' is private to class Secret

// ✗ SJS-E014: accessing protected member from non-subclass
class Base {
  protected value: number = 42
}

class Unrelated {
  read(b: Base): number {
    return b.value   // SJS-E014: 'value' is protected — only accessible in Base subclasses
  }
}

// ✗ SJS-E015: narrowing access on override
class Parent {
  public announce(): void { console.log("Parent") }
}

class Child extends Parent {
  protected announce(): void { console.log("Child") }
  // SJS-E015: override of 'announce' narrows access from public to protected
}

// ✗ SJS-W005: redundant explicit public (lint warning)
class Verbose {
  public name: string = ""              // SJS-W005: 'public' is the default
  public greet(): void { /* ... */ }    // SJS-W005
}

// ✗ Parse error: private abstract
abstract class Bad {
  private abstract compute(): number   // Parse error: private abstract not allowed
}

// ✗ Parse error: private #field combination
class Clash {
  private #value: number = 0   // Parse error: cannot combine 'private' keyword with '#' field
}
```
