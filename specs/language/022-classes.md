# 022 — Classes

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §ClassDecl, §ClassMember, §ClassProperty, §ClassMethod, §ClassConstructor, §AccessModifier

---

## Syntax

```ebnf
<ClassDecl>        ::= [ "abstract" ] "class" <Identifier>
                       [ <TypeParameters> ]
                       [ "extends" <TypeRef> [ <TypeArguments> ] ]
                       "{" { <ClassMember> } "}"

<ClassMember>      ::= <ClassProperty>
                     | <ClassMethod>
                     | <ClassConstructor>
                     | <ClassStaticBlock>

<ClassProperty>    ::= [ <AccessModifier> ] [ "static" ] [ "readonly" ] [ "abstract" ]
                       <Identifier> [ "?" ] [ ":" <Type> ] [ "=" <Expression> ] ";"
                     | "#" <Identifier> [ ":" <Type> ] [ "=" <Expression> ] ";"

<ClassConstructor> ::= [ <AccessModifier> ]
                       "constructor"
                       "(" [ <ParameterList> ] ")"
                       <BlockStatement>

<ClassMethod>      ::= [ <AccessModifier> ] [ "static" ] [ "abstract" ] [ "async" ]
                       [ "get" | "set" | "*" ]
                       <Identifier>
                       [ <TypeParameters> ]
                       "(" [ <ParameterList> ] ")"
                       [ ":" <Type> ]
                       ( <BlockStatement> | ";" )

<ClassStaticBlock> ::= "static" <BlockStatement>

<AccessModifier>   ::= "public" | "private" | "protected"
```

---

## Semantics

### Nominal vs structural typing

A class in SJS introduces both a value (the constructor function) and a type (the instance shape). Class types are nominal for `instanceof` checks and subtype hierarchy tracking. They are structural for interface conformance: an instance of class `C` is assignable to interface `I` if `C` has all members required by `I` with compatible types, regardless of whether any explicit `implements` clause exists. See `specs/language/006-interfaces.md`.

### Single inheritance

A class may extend at most one base class with `extends`. Multiple inheritance is not supported. The subclass constructor must call `super(...)` before any access to `this`; accessing `this` before `super()` in a derived constructor is SJS-E016 (TDZ-like restriction imposed by the ES2015 specification).

### Abstract classes

An `abstract` class cannot be instantiated directly. Calling `new` on an abstract class is SJS-E016. An abstract class may contain:

- Concrete members with implementations (shared by all subclasses).
- Abstract members with no body (declared with a trailing `;`). Subclasses must implement every inherited abstract member unless they are also declared `abstract`.

Failing to implement an inherited abstract method in a non-abstract subclass is SJS-E015.

### Access modifiers: `public`, `private`, `protected`

Access modifiers are enforced at the type-checker level only; they produce no runtime difference in JS output. The three modifiers are:

- `public` — accessible everywhere (default if omitted).
- `private` — accessible only within the class body. Attempting to access a `private` member from outside the class is SJS-E014.
- `protected` — accessible within the class body and within subclass bodies. Accessing a `protected` member from a non-subclass context is SJS-E014.

`private` modifier access restriction is distinct from ECMAScript hard-private `#field` syntax (see below).

### Hard-private fields: `#field`

A field prefixed with `#` uses ECMAScript 2022 private field syntax. Hard-private fields are runtime-enforced: they cannot be accessed outside the class even through dynamic property access or reflection. Hard-private fields are not inherited and do not appear in `Object.keys()`, `JSON.stringify()`, or any enumeration mechanism. The type of a hard-private field is visible to the type-checker only within the class body.

Hard-private `#field` and `private` modifier are orthogonal:
- `private x: T` — type-level privacy only; `x` appears as a regular property in JS.
- `#x: T` — runtime privacy; `#x` is a hard-private slot.

### `static` members

A `static` member belongs to the class constructor object rather than to any instance. Static members are accessed via the class name: `ClassName.member`. `static readonly` declares a class constant. Static members are not inherited through `extends` at the type level (the static type of the subclass constructor does include inherited static members via the prototype chain, but SJS treats them as accessible on both the base and derived class).

### Accessors: `get` / `set`

A `get` accessor declares a getter; its type is `(): T`. A `set` accessor declares a setter; its type is `(v: T): void`. The getter and setter for the same property name must agree on `T`.

### Constructor parameter property shorthand

A constructor parameter may carry an access modifier (`public`, `private`, or `protected`). This shorthand simultaneously declares the corresponding instance property and assigns `this.param = param` in the constructor body. The declared type of the property is taken from the parameter annotation.

```sjs
class Point {
  constructor(public x: number, public y: number) {}
  // equivalent to:
  //   public x: number; public y: number;
  //   constructor(x: number, y: number) { this.x = x; this.y = y; }
}
```

### Class static block

A `static { ... }` block runs exactly once when the class declaration is evaluated. It can access `static` members and is used for one-time initialization. Multiple static blocks in a single class execute in textual order.

### Class expressions

A class expression `const C = class { ... }` is an anonymous or named class value. The semantics are identical to a class declaration, except the binding is not hoisted and the class name (if present) is scoped to the class body only.

---

## Type rules

```
C has declared member m: T, accessibility A
access site is permitted under A
──────────────────────────────────────────── (class-member-access)
Γ ⊢ expr.m : T      where Γ ⊢ expr : C

class D extends C  (D is a subtype of C)
──────────────────────────────────────────── (class-extends-sub)
Γ ⊢ new D() : D     and     D <: C

abstract class C
──────────────────────────────────────────── (abstract-no-new)
Γ ⊢ new C(...)  →  SJS-E016

abstract class C { abstract m(): T }
class D extends C { m(): T { ... } }
──────────────────────────────────────────── (abstract-impl)
D satisfies abstract member m

class D extends C  without implementing abstract m
──────────────────────────────────────────── (abstract-missing)
D  →  SJS-E015 for each unimplemented abstract member

access to private/protected member from disallowed site
──────────────────────────────────────────── (access-violation)
Γ ⊢ expr.m  →  SJS-E014
```

---

## JS Lowering (Prototype)

Class syntax passes through as ES2015+ class syntax. Type annotations, `abstract` modifier, and access modifiers (`public`, `private`, `protected`) are erased. Hard-private `#field` syntax passes through natively. Constructor parameter property shorthand is desugared into explicit property declarations and constructor assignments.

```sjs
// SJS input
abstract class Shape {
  protected abstract area(): number;
  describe(): string {
    return `Area is ${this.area()}`;
  }
}

class Circle extends Shape {
  #radius: number;
  constructor(public readonly label: string, r: number) {
    super();
    this.#radius = r;
  }
  protected area(): number {
    return Math.PI * this.#radius ** 2;
  }
}
```

```javascript
// JS output
class Shape {
  describe() {
    return `Area is ${this.area()}`;
  }
}

class Circle extends Shape {
  #radius;
  label;
  constructor(label, r) {
    super();
    this.label = label;
    this.#radius = r;
  }
  area() {
    return Math.PI * this.#radius ** 2;
  }
}
```

---

## LLVM Lowering (Future)

```llvm
; class layout: { vtable_ptr, fields... }
%Circle = type { %Circle_vtable*, %Str*, double }
;                               ^label  ^#radius

; vtable for Circle
%Circle_vtable = type { double (%Circle*)* }    ; slot 0: area
@Circle_vtable_instance = global %Circle_vtable {
  double (%Circle*)* @Circle_area
}

; constructor: Circle(label, r)
define %Circle* @Circle_new(%Str* %label, double %r) {
entry:
  %self = call i8* @sjs_alloc(i64 ptrtoint (%Circle* getelementptr (%Circle, %Circle* null, i32 1) to i64))
  %typed = bitcast i8* %self to %Circle*
  %vt_ptr = getelementptr %Circle, %Circle* %typed, i32 0, i32 0
  store %Circle_vtable* @Circle_vtable_instance, %Circle_vtable** %vt_ptr
  ; store label and #radius fields
  ret %Circle* %typed
}

; abstract class: vtable slots for unimplemented abstract methods hold a trap stub
define double @SJS_abstract_trap() {
  call void @llvm.trap()
  unreachable
}
```

Static fields compile to global variables. `readonly static` fields are LLVM `constant` globals. Hard-private `#field` becomes a private struct field with no external linkage symbol.

---

## Diagnostic codes

| Code       | When emitted |
|------------|-------------|
| `SJS-E014` | Access to a `private` or `protected` member from a disallowed site |
| `SJS-E015` | Non-abstract subclass does not implement an inherited abstract method |
| `SJS-E016` | `new` applied to an abstract class; or `this` accessed before `super()` in a derived constructor |

---

## Examples

### Valid

```sjs
// Concrete class with typed properties
class Vector {
  public x: number;
  public y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  magnitude(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}

// Constructor parameter shorthand
class Point {
  constructor(public x: number, public y: number) {}
}

// Abstract base class
abstract class Animal {
  protected abstract speak(): string;
  greet(): string {
    return `I say: ${this.speak()}`;
  }
}

class Dog extends Animal {
  protected speak(): string { return "Woof"; }
}
const d = new Dog();
console.log(d.greet()); // "I say: Woof"

// Hard-private field
class Counter {
  #count: number = 0;
  increment(): void { this.#count++; }
  get value(): number { return this.#count; }
}

// Generic class
class Box<T> {
  private contents: T;
  constructor(value: T) { this.contents = value; }
  get(): T { return this.contents; }
}
const b = new Box<number>(42);

// Static member and readonly
class Config {
  static readonly DEFAULT_TIMEOUT: number = 5000;
  static create(): Config { return new Config(); }
}

// get/set accessors
class Temperature {
  private _celsius: number = 0;
  get celsius(): number { return this._celsius; }
  set celsius(v: number) { this._celsius = v; }
  get fahrenheit(): number { return this._celsius * 9 / 5 + 32; }
}
```

### Invalid

```sjs
// SJS-E016: new on abstract class
abstract class Base { abstract init(): void; }
const b = new Base();
//        ^^^^^^^^^ SJS-E016: cannot instantiate abstract class Base

// SJS-E015: abstract method not implemented
abstract class Logger {
  abstract log(msg: string): void;
}
class SilentLogger extends Logger {
  // SJS-E015: log() not implemented in non-abstract subclass SilentLogger
}

// SJS-E014: private member accessed outside class
class Wallet {
  private balance: number = 0;
}
const w = new Wallet();
console.log(w.balance);
//            ^^^^^^^ SJS-E014: balance is private to Wallet

// SJS-E016: this accessed before super()
class Derived extends Vector {
  constructor() {
    this.x = 1;    // SJS-E016: must call super() before this
    super(0, 0);
  }
}

// SJS-E014: protected member accessed from outside hierarchy
class Animal { protected name: string = ""; }
const a = new Animal();
console.log(a.name);
//            ^^^^ SJS-E014: name is protected on Animal
```
