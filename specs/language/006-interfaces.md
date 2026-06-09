# 006 — Interfaces

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §InterfaceDecl, §InterfaceMember

---

## Syntax

```ebnf
<InterfaceDecl>   ::= "interface" <Identifier>
                      [ <TypeParameters> ]
                      [ "extends" <TypeRef> { "," <TypeRef> } ]
                      "{" { <InterfaceMember> } "}"

<InterfaceMember> ::= <InterfaceProperty>
                    | <InterfaceMethod>
                    | <IndexSignature>

<InterfaceProperty> ::= [ "readonly" ] <Identifier> [ "?" ] ":" <Type> ";"

<InterfaceMethod>   ::= <Identifier>
                        [ <TypeParameters> ]
                        "(" [ <ParameterList> ] ")"
                        ":" <Type>
                        ";"

<IndexSignature>    ::= "[" <Identifier> ":" <PrimitiveType> "]" ":" <Type> ";"
```

`<PrimitiveType>` in an index signature is restricted to `string` or `number`. Symbol index signatures are not supported in v1.

---

## Semantics

### Structural typing — Go-style conformance

SJS uses **structural typing** for interfaces. A value satisfies an interface if it provides all required members with compatible types. There is no `implements` keyword; conformance is checked implicitly at every use site where an interface type is expected.

The interface name is a type annotation only. It has no runtime representation, generates no code, and cannot appear as an expression.

```sjs
interface Drawable {
  draw(): void
}

class Circle {             // no "implements Drawable"
  radius: number
  constructor(r: number) { this.radius = r }
  draw(): void { /* renders circle */ }
}

function render(d: Drawable): void {
  d.draw()
}

render(new Circle(5))      // ✓ — Circle structurally satisfies Drawable
```

The compiler checks, at the call `render(new Circle(5))`, that `Circle` provides all members of `Drawable`. It does. Conformance is confirmed; no annotation on `Circle` is required or expected.

### Required vs optional members

A member without `?` is **required**. Every value of the interface type must provide this member.

A member with `?` is **optional**. The property may be absent. When absent, accessing it yields `undefined`. When present, its type is `T` (the declared type, narrowed). Inside the body of a function or block that has narrowed the member to be present, its type is `T`.

```sjs
interface Config {
  host: string        // required
  port?: number       // optional — number | undefined
  tls?: boolean       // optional
}
```

### `readonly` members

A `readonly` property cannot be reassigned after the object is constructed. This is a **type-level constraint only** — the JS output does not use `Object.defineProperty` or freeze; it is not enforced at runtime.

```sjs
interface Point {
  readonly x: number
  readonly y: number
}

function translate(p: Point, dx: number, dy: number): Point {
  // p.x = p.x + dx   // ✗ — cannot assign to readonly property
  return { x: p.x + dx, y: p.y + dy }  // ✓ — new object
}
```

### Index signatures

An index signature `[key: string]: T` declares that all string-keyed properties on the object have type `T`. Named properties on the same interface must also be assignable to `T` when an index signature is present.

```sjs
interface StringMap {
  [key: string]: string
}

interface Headers {
  [key: string]: string
  "content-type": string   // ✓ — string is compatible with index value type
}
```

### Interface extension

An interface may `extend` one or more other interfaces. The extended interface inherits all members from each parent. If two parents declare the same member name, the types must be identical; otherwise a compile-time error is emitted.

```sjs
interface Shape {
  area(): number
}

interface Colored {
  color: string
}

interface ColoredShape extends Shape, Colored {
  // has: area(): number, color: string
  label?: string   // additional member
}
```

### Interfaces vs type aliases

| | Interface | Type alias (`type X = ...`) |
|---|---|---|
| Can extend | Yes (`extends`) | No (use union) |
| Can be implemented by class | Yes (structural) | Only if alias is object type |
| Can alias primitives | No | Yes |
| Can alias unions/sum types | No | Yes |
| Declaration merging | Planned (v2) | Not supported |

Interfaces are preferred for objects and classes. Type aliases are preferred for unions, sum types, primitive wrappers, and utility types.

### Generic interfaces

Interfaces may carry type parameters. See `005-generics.md` for the full rules. Generic interfaces follow the same structural conformance rules — a value satisfies a generic interface instantiation if it provides all members with types compatible with the instantiated form.

```sjs
interface Container<T> {
  value: T
  transform<U>(fn: (x: T) => U): Container<U>
}
```

### No `implements` keyword

SJS does not support `implements`. Classes do not declare which interfaces they satisfy. Adding `implements` to a class declaration is a **parse error**.

The rationale: structural typing makes `implements` redundant. All conformance checking occurs at use sites. This reduces boilerplate and decouples class definitions from the interfaces they happen to satisfy.

---

## Type rules

### Structural satisfaction

```
interface I { m1: T1; m2: T2; ... }
Γ ⊢ e : { m1: S1; m2: S2; ...; mN: SN; ... }
S1 <: T1    S2 <: T2    ...
─────────────────────────────────────────────── (structural-satisfy)
Γ ⊢ e : I
```

A value satisfies `I` if it structurally provides every required member with a compatible type. Additional members are permitted (width subtyping).

### Optional member access

```
interface I { p?: T }
Γ ⊢ e : I
────────────────────────────────── (optional-access)
Γ ⊢ e.p : T | undefined
```

### Readonly enforcement

```
interface I { readonly p: T }
Γ ⊢ e : I
────────────────────────────────── (readonly-write-fail)
Γ ⊢ (e.p = v) : SJS-E002   (* assignment to readonly property *)
```

### Interface extension (subtype)

```
interface J extends I
Γ ⊢ e : J
────────────────────── (interface-extends-sub)
Γ ⊢ e : I
```

A value of type `J` is assignable to `I` if `J extends I`, because `J` is guaranteed to carry all of `I`'s members.

### Structural subtype widening

```
Γ ⊢ e : { a: A; b: B }
───────────────────────── (width-sub)
Γ ⊢ e : { a: A }
```

Objects with more members are assignable to interfaces with fewer members (open-world structural subtyping).

---

## JS Lowering (Prototype)

Interfaces are **erased entirely**. No runtime representation is generated. No `implements` check occurs. The compiled JS relies on duck typing — if the object has the right properties, it works.

```sjs
// SJS input
interface Serializable {
  serialize(): string
}

function encode(s: Serializable): string {
  return s.serialize()
}

class User {
  name: string
  constructor(n: string) { this.name = n }
  serialize(): string { return JSON.stringify({ name: this.name }) }
}

encode(new User("Alice"))
```

```javascript
// JS output — interface Serializable is gone
function encode(s) {
  return s.serialize();
}

class User {
  name;
  constructor(n) { this.name = n; }
  serialize() { return JSON.stringify({ name: this.name }); }
}

encode(new User("Alice"));
```

`readonly` modifiers are erased. They exist only in the type-checker. The JS property is writable at runtime.

---

## LLVM Lowering (Future)

Interface conformance is verified statically by the type-checker. No vtable is generated in v1. At the LLVM level, a call through an interface type is resolved to a **direct function call** after monomorphization — the compiler knows the concrete type at every call site.

```llvm
; render(d: Drawable) called with a Circle
; Compiler resolves: Circle.draw() is @Circle_draw
call void @Circle_draw(%Circle* %d)
```

Post-1.0 (polymorphic dispatch): when the concrete type cannot be determined statically (e.g., a heterogeneous collection), the compiler will emit a vtable pointer in the struct and indirect call:

```llvm
; Future: vtable-based dispatch (not v1)
%vtable_ptr = getelementptr %Drawable, %Drawable* %d, i32 0, i32 0
%draw_fn = load void (%Drawable*)*, void (%Drawable*)** %vtable_ptr
call void %draw_fn(%Drawable* %d)
```

`readonly` fields: the LLVM backend may place `readonly` interface properties in read-only data segments and elide stores.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E002` | Value assigned to interface type is missing a required member |
| `SJS-E002` | Assignment to a `readonly` interface property |
| `SJS-E005` | `A & B` intersection type used where interface extension should be used |
| Parse error | `implements` keyword on a class declaration (not supported in SJS) |
| Type error | Interface extension conflict: same member name with incompatible types |
| Type error | Index signature value type incompatible with a named property type |

---

## Examples

### Valid

```sjs
// ✓ Basic interface and structural conformance
interface Printable {
  print(): void
}

class Document {
  content: string
  constructor(c: string) { this.content = c }
  print(): void { console.log(this.content) }
}

function output(p: Printable): void { p.print() }
output(new Document("hello"))    // ✓ structural match

// ✓ Object literal satisfying interface
interface Point { x: number; y: number }
const origin: Point = { x: 0, y: 0 }

// ✓ Optional and readonly members
interface Config {
  readonly apiUrl: string
  timeout?: number
  retries?: number
}

const cfg: Config = { apiUrl: "https://api.example.com" }
const t: number | undefined = cfg.timeout

// ✓ Interface extension (multiple)
interface Shape { area(): number }
interface Colored { color: string }
interface Labeled { label: string }

interface TaggedShape extends Shape, Colored, Labeled {
  tag: string
}

// ✓ Index signature
interface Registry {
  [key: string]: string
}
const r: Registry = {}
r["foo"] = "bar"

// ✓ Generic interface
interface Container<T> {
  value: T
  isEmpty(): boolean
}

class Maybe<T> {
  value: T?
  constructor(v: T?) { this.value = v }
  isEmpty(): boolean { return this.value === null }
}

function use<T>(c: Container<T>): void {
  if (!c.isEmpty()) {
    console.log(c.value)
  }
}

// ✓ Class satisfying interface — no "implements" needed
interface Comparable {
  compareTo(other: Comparable): number
}

class Temperature {
  celsius: number
  constructor(c: number) { this.celsius = c }
  compareTo(other: Temperature): number {
    return this.celsius - other.celsius
  }
}

function sort(items: Comparable[]): Comparable[] {
  return items.slice().sort((a, b) => a.compareTo(b))
}
```

### Invalid

```sjs
// ✗ SJS-E002: missing required member
interface Animal {
  name: string
  speak(): string
}

const cat: Animal = { name: "Whiskers" }
//  ^^^  SJS-E002: property 'speak' is missing — Animal requires speak(): string

// ✗ SJS-E002: assigning to readonly property
interface Immutable { readonly id: number }
function mutate(x: Immutable): void {
  x.id = 99   // SJS-E002: cannot assign to readonly property 'id'
}

// ✗ SJS-E005: intersection type instead of interface extension
type Both = Shape & Colored
//               ^ SJS-E005: intersection types are not permitted in SJS
//   Use: interface Both extends Shape, Colored {}

// ✗ Parse error: implements keyword
interface Runnable { run(): void }

class Task implements Runnable {   // Parse error: 'implements' is not supported in SJS
  run(): void { /* ... */ }        // Structural conformance is automatic — remove 'implements'
}
```
