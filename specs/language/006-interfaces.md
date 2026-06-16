# 006 — Object Types (`type` brace form)

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §TypeDecl, §ObjectTypeDecl, §InterfaceMember

---

## Syntax

SuperJS has a single declaration keyword, `type`, with two forms. The **brace / object form** described here declares a named structural object type — the role that the `interface` keyword used to fill. (The `interface` keyword has been removed; using it is a parse error, `SJS-P001`.) The other form is the **alias form** `type X = …`, covered under "Object form vs alias form" below.

The brace form has **no `=`**: the optional `extends` clause and the member body follow the name directly.

```ebnf
<TypeDecl>        ::= <ObjectTypeDecl>
                    | <TypeAliasDecl>

<ObjectTypeDecl>  ::= "type" <Identifier>
                      [ <TypeParameters> ]
                      [ "extends" <TypeRef> { "," <TypeRef> } ]
                      "{" { <InterfaceMember> } "}"

<TypeAliasDecl>   ::= "type" <Identifier>
                      [ <TypeParameters> ]
                      "=" <Type>

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

SJS uses **structural typing** for object types. A value satisfies an object type if it provides all required members with compatible types. There is no `implements` keyword; conformance is checked implicitly at every use site where the object type is expected.

The type name is a type annotation only. It has no runtime representation, generates no code, and cannot appear as an expression.

```sjs
type Drawable {
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

A member without `?` is **required**. Every value of the object type must provide this member.

A member with `?` is **optional**. The property may be absent. When absent, accessing it yields `undefined`. When present, its type is `T` (the declared type, narrowed). Inside the body of a function or block that has narrowed the member to be present, its type is `T`.

```sjs
type Config {
  host: string        // required
  port?: number       // optional — number | undefined
  tls?: boolean       // optional
}
```

### `readonly` members

A `readonly` property cannot be reassigned after the object is constructed. This is a **type-level constraint only** — the JS output does not use `Object.defineProperty` or freeze; it is not enforced at runtime.

```sjs
type Point {
  readonly x: number
  readonly y: number
}

function translate(p: Point, dx: number, dy: number): Point {
  // p.x = p.x + dx   // ✗ — cannot assign to readonly property
  return { x: p.x + dx, y: p.y + dy }  // ✓ — new object
}
```

### Index signatures

An index signature `[key: string]: T` declares that all string-keyed properties on the object have type `T`. Named properties in the same object type must also be assignable to `T` when an index signature is present.

```sjs
type StringMap {
  [key: string]: string
}

type Headers {
  [key: string]: string
  "content-type": string   // ✓ — string is compatible with index value type
}
```

### Object type extension

An object type may `extend` one or more other object types. The extended type inherits all members from each parent. If two parents declare the same member name, the types must be identical; otherwise a compile-time error is emitted. Note the brace form takes no `=` — the `extends` clause and body follow the name directly.

```sjs
type Shape {
  area(): number
}

type Colored {
  color: string
}

type ColoredShape extends Shape, Colored {
  // has: area(): number, color: string
  label?: string   // additional member
}
```

### Object form vs alias form

The two forms of `type` serve different purposes:

| | Object form (`type X { … }`) | Alias form (`type X = …`) |
|---|---|---|
| Composes other types | Yes (`extends A, B`) | No (use union) |
| Can be satisfied by a class | Yes (structural) | Only if the alias is itself an object type |
| Can name a primitive | No | Yes (`type Id = string`) |
| Can name a union / sum type | No | Yes (`type Result<T,E> = Ok(T) \| Err(E)`) |
| Declaration merging | Planned (v2) | Not supported |

The object form is preferred for objects and classes. The alias form is preferred for unions, sum types, primitive wrappers, and utility types.

### Generic object types

The object form may carry type parameters. See `005-generics.md` for the full rules. Generic object types follow the same structural conformance rules — a value satisfies a generic instantiation if it provides all members with types compatible with the instantiated form.

```sjs
type Container<T> {
  value: T
  transform<U>(fn: (x: T) => U): Container<U>
}
```

### No `implements` keyword

SJS does not support `implements`. Classes do not declare which object types they satisfy. Adding `implements` to a class declaration is a **parse error**.

The rationale: structural typing makes `implements` redundant. All conformance checking occurs at use sites. This reduces boilerplate and decouples class definitions from the object types they happen to satisfy.

---

## Type rules

### Structural satisfaction

```
type I { m1: T1; m2: T2; ... }
Γ ⊢ e : { m1: S1; m2: S2; ...; mN: SN; ... }
S1 <: T1    S2 <: T2    ...
─────────────────────────────────────────────── (structural-satisfy)
Γ ⊢ e : I
```

A value satisfies `I` if it structurally provides every required member with a compatible type. Additional members are permitted (width subtyping).

### Optional member access

```
type I { p?: T }
Γ ⊢ e : I
────────────────────────────────── (optional-access)
Γ ⊢ e.p : T | undefined
```

### Readonly enforcement

```
type I { readonly p: T }
Γ ⊢ e : I
────────────────────────────────── (readonly-write-fail)
Γ ⊢ (e.p = v) : SJS-E002   (* assignment to readonly property *)
```

### Object type extension (subtype)

```
type J extends I
Γ ⊢ e : J
────────────────────── (extends-sub)
Γ ⊢ e : I
```

A value of type `J` is assignable to `I` if `J extends I`, because `J` is guaranteed to carry all of `I`'s members.

### Structural subtype widening

```
Γ ⊢ e : { a: A; b: B }
───────────────────────── (width-sub)
Γ ⊢ e : { a: A }
```

Objects with more members are assignable to object types with fewer members (open-world structural subtyping).

---

## JS Lowering (Prototype)

Object types are **erased entirely**. No runtime representation is generated. No `implements` check occurs. The compiled JS relies on duck typing — if the object has the right properties, it works.

```sjs
// SJS input
type Serializable {
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
// JS output — type Serializable is gone
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

> Note: in JS lowering, "interface" below refers to the AST node for an object-type declaration (internally `ObjectTypeDecl`). The member nodes are `InterfaceProperty` / `InterfaceMethod`.

---

## LLVM Lowering (Future)

Object-type conformance is verified statically by the type-checker. No vtable is generated in v1. At the LLVM level, a call through an object type is resolved to a **direct function call** after monomorphization — the compiler knows the concrete type at every call site.

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

`readonly` fields: the LLVM backend may place `readonly` object-type properties in read-only data segments and elide stores.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-P001` | `interface` keyword used (removed — use the `type` brace form) |
| `SJS-E002` | Value assigned to an object type is missing a required member |
| `SJS-E002` | Assignment to a `readonly` property |
| `SJS-E005` | `A & B` intersection type used where object-type extension should be used (`type X extends A, B { … }`) |
| Parse error | `implements` keyword on a class declaration (not supported in SJS) |
| Type error | Object-type extension conflict: same member name with incompatible types |
| Type error | Index signature value type incompatible with a named property type |

---

## Examples

### Valid

```sjs
// ✓ Basic object type and structural conformance
type Printable {
  print(): void
}

class Document {
  content: string
  constructor(c: string) { this.content = c }
  print(): void { console.log(this.content) }
}

function output(p: Printable): void { p.print() }
output(new Document("hello"))    // ✓ structural match

// ✓ Object literal satisfying an object type
type Point { x: number; y: number }
const origin: Point = { x: 0, y: 0 }

// ✓ Optional and readonly members
type Config {
  readonly apiUrl: string
  timeout?: number
  retries?: number
}

const cfg: Config = { apiUrl: "https://api.example.com" }
const t: number | undefined = cfg.timeout

// ✓ Object-type extension (multiple)
type Shape { area(): number }
type Colored { color: string }
type Labeled { label: string }

type TaggedShape extends Shape, Colored, Labeled {
  tag: string
}

// ✓ Index signature
type Registry {
  [key: string]: string
}
const r: Registry = {}
r["foo"] = "bar"

// ✓ Generic object type
type Container<T> {
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

// ✓ Class satisfying an object type — no "implements" needed
type Comparable {
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
type Animal {
  name: string
  speak(): string
}

const cat: Animal = { name: "Whiskers" }
//  ^^^  SJS-E002: property 'speak' is missing — Animal requires speak(): string

// ✗ SJS-E002: assigning to readonly property
type Immutable { readonly id: number }
function mutate(x: Immutable): void {
  x.id = 99   // SJS-E002: cannot assign to readonly property 'id'
}

// ✗ SJS-E005: intersection type instead of object-type extension
type Both = Shape & Colored
//               ^ SJS-E005: intersection types are not permitted in SJS
//   Use: type Both extends Shape, Colored {}

// ✗ SJS-P001: the 'interface' keyword has been removed
interface Drawable { draw(): void }
//  ^^^^^^^^^  SJS-P001: 'interface' is not a keyword — use: type Drawable { draw(): void }

// ✗ Parse error: implements keyword
type Runnable { run(): void }

class Task implements Runnable {   // Parse error: 'implements' is not supported in SJS
  run(): void { /* ... */ }        // Structural conformance is automatic — remove 'implements'
}
```
