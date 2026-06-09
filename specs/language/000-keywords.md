# 000 — Keywords

**Status:** Stage 0 — authoritative reference  
**Grammar:** `specs/grammar.ebnf` § Identifiers and Keywords

Every token that SJS treats as a keyword, reserved word, banned identifier, or
contextual keyword. Grouped by origin and enforcement level. This file is the
single source of truth — all other language feature specs reference keyword names
from here.

---

## 1. SJS-New Keywords

Keywords that do not exist in JavaScript or TypeScript. Unique to SJS.

| Keyword | Category | Grammar production | Purpose |
|---------|----------|--------------------|---------|
| `dynamic` | type + expression | `<PrimitiveType>` | Runtime-checked escape hatch; replaces banned `any`. Propagates: `dynamic op T` → `dynamic`. Warns in `--strict`. |
| `match` | expression | `<MatchExpression>` | Exhaustive pattern-matching over sum-type values. `match expr { Pattern => body, ... }`. Compiler error if arms are not exhaustive and no `default` arm. |

> **Note on `fn`:** Language highlight docs use `fn` as a shorthand for `function`. As of grammar v0.1, the grammar uses `function`. `fn` is reserved for inclusion as an official alias in Stage 1. Do not implement as an alias until grammar.ebnf is updated.

---

## 2. JS Inherited — Hard Reserved

Cannot appear as an identifier anywhere. Exact ECMAScript semantics apply unless
an SJS rule narrows or extends behaviour (see linked feature spec).

| Keyword | ECMA-262 § | SJS notes |
|---------|-----------|-----------|
| `break` | §14.9 | Unchanged |
| `case` | §14.12 | Unchanged. Also valid inside `match` arms (contextual — see §5) |
| `catch` | §14.15 | Optional binding: `catch { }` valid (ES2019). Type annotation on binding: `catch (e: Error)` |
| `class` | §15.7 | SJS adds access modifiers, `abstract`, typed fields. See `022-classes.md` |
| `const` | §14.3.1 | SJS linter `SJS-L001` warns when `let` should be `const` |
| `continue` | §14.8 | Unchanged |
| `debugger` | §14.16 | Unchanged; SJS linter `SJS-L005` warns on committed `debugger` |
| `default` | §14.12 / §16.2.3 | Also catch-all arm in `match`; also default export |
| `delete` | §13.5.1 | Unchanged; type-checker narrows result to `boolean` |
| `do` | §14.7.3 | `do...while` only |
| `else` | §14.6 | Unchanged |
| `export` | §16.2.3 | ES module export. `export type { }` for type-only exports (erased at compile). See `023-modules.md` |
| `extends` | §15.7.1 | Class inheritance only. **Banned in type-parameter constraints** (no `T extends U`). See §6. |
| `false` | §12.9.2 | Boolean literal |
| `finally` | §14.15 | Unchanged |
| `for` | §14.7.4–5 | `for`, `for...of`, `for...in`, `for await...of`. Typed binding in `for...of`: `for (x: T of arr)`. See `042-for-of-for-in.md` |
| `function` | §15.2 | Declaration + expression. `async function`, `function*`, `async function*`. See `021-functions.md` |
| `if` | §14.6 | Unchanged |
| `import` | §16.2.2 | Static import, `import type { }`, dynamic `import()`. See `023-modules.md` |
| `in` | §13.10.1 | Relational operator (key membership). Also `for...in` |
| `instanceof` | §13.10.2 | Unchanged; type-checker narrows to the constructor type |
| `let` | §14.3.1 | Block-scoped mutable binding |
| `new` | §13.3.5 | Constructor call. `new.target` meta-property. See §5 for `new.target` |
| `null` | §6.1.2 | Null literal; part of `T?` = `T \| null \| undefined` |
| `return` | §14.10 | Unchanged |
| `static` | §15.7.1 | Class static fields, methods, static blocks |
| `super` | §13.3.7 | Class `super()` call and `super.member` access |
| `switch` | §14.12 | `switch (expr) { case ...: }`. See `040-control-flow.md`. SJS recommends `match` over `switch` for sum types |
| `this` | §13.3.1 | Receiver reference; `this: T` parameter annotation supported |
| `throw` | §14.14 | Unchanged |
| `true` | §12.9.2 | Boolean literal |
| `try` | §14.15 | `try / catch / finally`. See `041-try-catch.md` |
| `typeof` | §13.5.3 | Unary type-inspection operator. **Banned in type positions** (`typeof x` as a type is rejected). |
| `undefined` | — | Treated as a reserved literal in SJS. `undefined` is a valid type. Cannot be used as an identifier. |
| `var` | §14.3.2 | Function-scoped; valid for ES5-compatible SJS. SJS linter `SJS-L002` warns: prefer `let`/`const` |
| `void` | §13.5.2 | Unary operator. Also the `void` return type. |
| `while` | §14.7.2 | `while (cond) body` |
| `with` | §14.11 | Forbidden in strict mode. SJS always compiles in strict mode; `with` always emits SJS-E013. |
| `yield` | §15.5.3 | Inside `function*`. `yield expr`, `yield* iterable`. Type: `Generator<YieldType, ReturnType, NextType>`. See `038-generators.md` |

---

## 3. JS Inherited — Contextual

Valid as identifiers in most syntactic positions; treated as keywords only in
specific grammatical contexts. Exact contexts listed.

| Keyword | Keyword context | Identifier context | SJS notes |
|---------|-----------------|--------------------|-----------|
| `async` | Before `function` or arrow `=>` | Valid identifier | `async function`, `async () =>`. See `037-async-await.md` |
| `await` | Inside `async function` body; top-level module | Valid identifier outside async context | SJS treats top-level `await` as valid in modules (ES2022) |
| `get` | Object/class getter: `get prop()` | Valid identifier | Unchanged |
| `set` | Object/class setter: `set prop(v)` | Valid identifier | Unchanged |
| `from` | `import ... from "..."` | Valid identifier | Contextual in import/export only |
| `of` | `for (x of iterable)` | Valid identifier | Contextual in `for...of` only |
| `as` | `import X as Y`, `export X as Y`, `expr as Type` | Valid identifier | Also used in `as` type cast expression |
| `target` | `new.target` (meta-property) | Valid identifier elsewhere | `new.target` is valid only inside functions/constructors |
| `meta` | `import.meta` (meta-property) | Valid identifier elsewhere | `import.meta` is valid only in ES module context |

---

## 4. TypeScript-Borrowed — Active

TypeScript keywords SJS adopts. Semantics match TypeScript unless an SJS rule
restricts them further.

| Keyword | Category | SJS behaviour | Feature spec |
|---------|----------|---------------|--------------|
| `abstract` | class modifier | Abstract classes and methods. Concrete subclass must implement abstract members. | `022-classes.md` |
| `as` | expression | Type assertion: `expr as T`. Only safe cast form in SJS (no `<T>expr` prefix cast). | `016-type-narrowing.md` |
| `declare` | declaration modifier | Ambient declarations: `declare const x: T`. Emitted as nothing. Used in `.d.sjs` files. | `023-modules.md` |
| `interface` | declaration | Structural interface definition. Conformance is structural (no explicit `implements`). See §4 note. | `006-interfaces.md` |
| `readonly` | property modifier | Immutable property; cannot be written after construction. Enforced at type level only. | `014-object-types.md` |
| `type` | declaration / import/export modifier | Type alias (`type Alias = T`) and type-only import/export (`import type`, `export type`). | `010-primitives.md` |

> **Note on `implements`:** Grammar comment explicitly excludes `implements` — conformance is structural. `implements` is not a keyword in SJS. A class satisfies an interface if it structurally provides all required members. No keyword required.

---

## 5. Type-Position Keywords

Valid only in type annotation positions (after `:` or in `<TypeArguments>`).
Using these as value-position expressions emits a parse error or is interpreted
differently (see notes).

| Keyword | Type meaning | Value-position behaviour |
|---------|-------------|--------------------------|
| `number` | Number type | Not a value (no `Number` auto-import). Use `Number` constructor explicitly |
| `string` | String type | Not a value |
| `boolean` | Boolean type | Not a value |
| `bigint` | BigInt type | Not a value |
| `symbol` | Symbol type | Not a value; `Symbol()` constructor is separate |
| `void` | No return value | `void expr` (operator) evaluates `expr` and returns `undefined` |
| `null` | Null type | `null` literal is both a type and a value |
| `undefined` | Undefined type | `undefined` is both a type and a value in SJS (reserved identifier) |
| `never` | Uninhabited type — no value can have this type | Not a value |
| `unknown` | Top type — any value; must narrow before use | Not a value |
| `object` | Non-primitive object type | Not a value; use `{}` or a specific interface |
| `dynamic` | Runtime-checked escape hatch | Also a value qualifier: `dynamic` propagates through operations |

---

## 6. Banned Keywords

Compiler emits a hard error when any of these appear. No valid SJS program uses them.

| Keyword | Error code | Reason | SJS alternative |
|---------|-----------|--------|-----------------|
| `any` | SJS-E004 | Silent unsafety; allows unchecked assignment to/from all types | `dynamic` — explicit runtime-checked escape hatch |
| `enum` | SJS-E010 | Dual-valued (type + value), non-tree-shakeable, poor performance | Sum types: `type Direction = North \| South \| East \| West` |
| `namespace` | SJS-E012 | Module bundling antipattern; collides with ES module system | ES module `import`/`export` |
| `infer` | SJS-E009 | Conditional type inference; makes type checking undecidable in practice | Explicit type parameters and aliases |

**Additionally banned in type positions:**

| Construct | Error code | Reason | SJS alternative |
|-----------|-----------|--------|-----------------|
| `A & B` (intersection) | SJS-E005 | Produces structurally unverifiable merged types | Separate named interfaces + structural conformance |
| `T extends U ? A : B` (conditional) | SJS-E008 | Turing-complete types; compile-time non-termination risk | Explicit overloads or union narrowing |
| `{ [K in keyof T]: ... }` (mapped) | SJS-E006 | Unpredictable shape; blocks monomorphic optimization | Named type aliases with explicit members |
| `T['key']` (indexed access) | SJS-E006 | Dependent types; blocks inference | Named type aliases |
| `x!` (non-null assertion postfix) | SJS-E011 | Silently discards null/undefined; spreads unsafety | `?.` optional chaining, explicit null check, or `match` |
| `typeof x` in type position | SJS-E006 | Structural inference bypass | Explicit type alias |

---

## 7. SJS-Reserved (Future)

These identifiers are reserved for planned SJS language extensions. Using them
as identifiers today emits `SJS-W004` (reserved-identifier warning, not an error).
They will become hard keywords in a future stage.

| Keyword | Planned use | Stage |
|---------|------------|-------|
| `where` | Constraint clause in generic declarations (alternative to banned `extends`) | Stage 2+ |
| `effect` | Algebraic effect syntax (long-term research) | Post-1.0 |
| `region` | Memory region annotations for LLVM backend | LLVM stage |
| `struct` | Value-type struct declarations (stack-allocated) | Post-1.0 |

---

## 8. Banned Syntactic Forms (Operator-level)

These are not keywords but operator uses that SJS rejects.

| Form | Error code | Reason |
|------|-----------|--------|
| `==` (abstract equality) | SJS-L003 | Coercion-based; use `===` |
| `!=` (abstract inequality) | SJS-L003 | Coercion-based; use `!==` |
| `with` statement | SJS-E013 | Dynamic scope; banned in strict mode. SJS always strict. |
| `x!` postfix | SJS-E011 | Non-null assertion; see §6 |
| `<T>expr` type cast prefix | parse error | Use `expr as T` |

---

## 9. Keyword → Feature Spec Cross-Reference

| Keyword(s) | Feature spec |
|------------|-------------|
| `dynamic` | `001-null-safety.md`, `004-dynamic.md` |
| `match` | `003-match.md` |
| `type` (sum type form) | `002-sum-types.md` |
| `null`, `undefined`, `T?` | `001-null-safety.md` |
| `interface`, structural conformance | `006-interfaces.md` |
| `abstract`, access modifiers | `022-classes.md` |
| `import`, `export`, `from`, `as`, `declare` | `023-modules.md` |
| `async`, `await` | `037-async-await.md` |
| `yield`, `function*` | `038-generators.md` |
| `never`, `unknown`, `void` | `010-primitives.md` |
| `as` (cast) | `016-type-narrowing.md` |
| `readonly` | `014-object-types.md` |
| banned: `any`, `enum`, `namespace`, `infer`, `&`, `?:` | `007-banned-features.md` |
| `typeof`, `instanceof`, `in` (narrowing) | `016-type-narrowing.md` |

---

## Appendix A — Complete Reserved Word List

Full list as declared in `grammar.ebnf` §Identifiers and Keywords:

```
abstract  as        async     await     break     case      catch
class     const     continue  debugger  declare   default   delete
do        dynamic   else      export    extends   false     finally
for       from      function  get       if        import    in
instanceof  interface  let    match     meta      new       null
object    of        readonly  return    set       static    super
switch    target    this      throw     true      try       type
typeof    undefined  var      void      while     with      yield
```

Banned (parsed but immediately rejected):

```
any   enum   infer   namespace
```

SJS-Reserved (warning if used as identifier):

```
where   effect   region   struct
```
