# Critique — VS Code Extension Plan Round 1

**Reviewer role:** CRITIC. Adversarial read of `plan-round1.md`.
**Verdict:** Plan is structurally sound and unusually thorough for a Round 1, but several regex/grammar claims will not survive contact with real `.sjs` files, and the 20-hour estimate is optimistic by ~40-60% for a publishable v0.1. Specific defects below, sectioned by the topics requested.

---

## 1. Grammar correctness (regex-level defects)

### 1.1 Nullable `T?` rule (§2.4) — multiple real bugs

The proposed regex:

```
(?<=[A-Za-z0-9_$\]>)])\?(?=\s*([,;=)\]\}>|&]|$))
```

Problems:

**(a) The author's own walk-through is wrong about ternary.** §2.4 claims "ordering is right, we win" — but the *opposite* is the danger. Because the SJS rule fires *before* `source.tsx`, this rule will eat ternaries whose `?` is followed by a parenthesized expression terminated soon by `)`. Example:
```ts
const v = cond ? (x) : y;        // ? followed by ws then ( — safe
const v = cond ? a : b;          // ? followed by 'a' — safe (not in [,;=)...])
const v = cond ?              // newline after ?
  doThing();
```
The third form: `?` followed by `\s*$`. The lookahead allows `$` (end of line). The lookbehind `[A-Za-z0-9_$\]>)]` matches the `d` of `cond`. **This false-positives.** Ternaries with a newline immediately after `?` are common in formatted code.

**(b) `>` in the lookbehind collides with JSX and comparison.** `x > y ? 1 : 2` — the lookbehind sees `>`, the lookahead sees `1` (not in terminator set, OK). But `<Foo />?` (JSX self-closing element followed by ternary) — the `>` of `/>` matches the lookbehind, then `?` then space. This particular case is unlikely, but the more general claim "`>` only closes generics" is false in TSX-embedded grammars.

**(c) The `(?=...|$)` end-of-line in the lookahead.** Plain `$` in Oniguruma matches end of string or end of line depending on flags. TextMate JSON grammars compile each pattern line-by-line (the rust_regex / Oniguruma engine treats `$` as end-of-line by default for multi-line patterns, but TextMate runs per-line). So `$` here means "end of this line." Any type annotation that wraps to next line gets matched. Example:
```sjs
const x: number
  ? = null;
```
Edge case but legal. More commonly: trailing comments. `const x: T? // comment` — the lookahead includes `//`, good; but `const x: T?<space>` at end-of-line followed by anything: the rule fires.

**(d) Missing case: `?` after a generic-bracket closer that is itself followed by another generic close.** `Array<Map<string, User?>?>` — nested nullable plus nullable container. The lookbehind allows `>`, the lookahead requires terminator including `>`. Inner `User?` — lookbehind sees `r`, lookahead sees `>` — fine. Outer `?` — lookbehind sees `>`, lookahead sees `>` — fine. Actually this works. Withdraw.

**(e) Real miss: union-type with nullable in the middle.** `type X = (User | Admin)? | null` — `)?` — lookbehind sees `)`, lookahead sees ` ` then `|` — `|` is in the terminator set. Fine.

**(f) Real bug: optional chaining `x?.foo`.** The lookbehind `[A-Za-z0-9_$\]>)]` matches `x`. The lookahead requires `[,;=)\]\}>|&]|$`. `.` is not in the set, so this does NOT fire. Good — but only by accident. **However:** `foo()?.bar` — lookbehind `)`, lookahead `.` — not in set. Safe.

**(g) Real bug: `x?` standalone as an expression** (which is not legal SJS but might appear during typing). Lookbehind `x`, lookahead `\s*$` or `\s*;` — fires. Acceptable since the user is mid-edit.

**Bottom line on §2.4:** the rule is *mostly* correct but the author's own justification ("ternary expressions are followed by identifiers and literals which are not in the exclusion list") is wrong about newline-after-`?` ternaries. Add `$` exclusion or require the lookahead to actually see a type-terminator on the same line without trailing whitespace.

### 1.2 Variant constructor rule (§2.5) — over-broad as written

```
(?<![A-Za-z0-9_$.])([A-Z][A-Za-z0-9_$]*)\s*(?=\()
```

**Defects:**

- **`new MyClass(...)` matches `MyClass`.** Lookbehind excludes only `[A-Za-z0-9_$.]`. After `new ` there is a space — space is not in the exclusion set, so `MyClass` matches and gets colored as a variant constructor. The plan claims (§2.5) "the scope `entity.name.function.constructor.*` is what TS themes already use for `new Foo()` anyway, so the visual diff is minimal." This is **partially true** — TS uses `entity.name.type.class` for the class name in `new Foo()`, not the constructor scope. Themes will color these differently. The plan understates the regression.

- **JSX components match.** `<MyComponent prop={42} />` — the TSX grammar will normally claim `MyComponent` as `support.class.component` or similar. But the SJS rule runs *first* (§2.3 ordering). Lookbehind: `<` is not in `[A-Za-z0-9_$.]`. Match `MyComponent`. Lookahead: requires `(` — JSX has space, so no. Safe for opening tag.
  - **However:** `<MyComponent(...)>` — illegal JSX, no risk.
  - **Real problem:** `MyComponent({...})` (calling a React function component manually) — matches as variant. Acceptable.

- **TypeScript type assertions / casts:** `<MyType>value` — lookbehind `<`, lookahead `>` — wait, the rule requires `(`. So `MyType` here doesn't match. Safe.

- **Decorators:** `@Injectable()` — lookbehind sees `@`, which is not in the exclusion set. `Injectable` matches. Lookahead `(` matches. **`@Injectable` decorator gets colored as variant constructor.** Decorators are rare in SJS so far but TS grammar supports them; the user might paste decorator-heavy code.

- **`throw new Error(...)`** — same as `new MyClass`, `Error` gets variant scope. Minor.

- **Type position: `function foo(): Result<Ok, Err> {}`** — `Ok` and `Err` here are type arguments. Lookbehind: `,` and `<` are not in exclusion. Lookahead requires `(`. Doesn't fire. Safe.

**The unit-variant rule is worse:**

```
(?<![A-Za-z0-9_$.])([A-Z][A-Za-z0-9_$]*)(?![A-Za-z0-9_$<({.=])
```

- **Type position references.** `const x: MyType = ...` — `MyType` lookbehind: space (OK). Lookahead: space then `=` — `=` is excluded, so doesn't match. **But** `function f(x: MyType): void` — `MyType` lookahead: `)` — `)` not in exclusion set. Matches as unit variant. So every uppercase type annotation in a parameter list gets the variant scope. This is a real over-color.

- **`import { Foo, Bar } from "x"`** — the plan calls this out as "acceptable." It is not, because TS themes color imported bindings distinctively and the SJS rule overrides that. The visual regression is real.

- **`export class Foo`** — `Foo` lookahead: ` ` then `{` or `extends` etc. `{` is in exclusion (good, won't match `{`). `extends` — `e` not in exclusion list. **Matches.** Every class name in `class Foo extends Bar` gets variant-unit scope.

- **`extends`/`implements` clauses:** `class Foo extends BaseClass {` — `BaseClass` lookahead is ` ` then `{` — wait, `{` IS in exclusion. So `BaseClass` lookahead sees `\s*{` — but the negative lookahead is single-char `(?![A-Za-z0-9_$<({.=])`. The very next char after `BaseClass` is ` `. Space is not in the exclusion list. **Matches.** `BaseClass` gets variant scope.

This rule needs a redesign. Suggestions for Round 2:
- Require the unit variant to follow a value-position context (after `=`, `=>`, `return`, `,` inside argument list, `(`, `[`). A look*behind* multi-char alternation can express this but Oniguruma fixed-length restriction makes it ugly — feasible with `(?<=[=(,[]\s*)` plus `(?<=return\s)` as a separate alt.
- Exclude type position by requiring NOT preceded by `:`, `,` (inside `<>`), `extends`, `implements`, `<`.

### 1.3 Sum type declaration (§2.7) — multi-line handling is fragile

The proposed `end`:
```
(?=;|\n\n|^\s*(type|function|const|let|class|interface|export|import|//))
```

Problems:

- **Single-line `type X = A | B` followed immediately by another statement on the next line.** The end pattern requires `\n\n` (blank line) OR a new declaration starting the next line. A `\n` followed by code that is *indented* (continuation, or inside a block) won't terminate. Example:
  ```sjs
  function f() {
    type Local = A | B
    const x = ...
  }
  ```
  The `^\s*(const|...)` matches because `^` is line-start and `\s*` consumes indentation. OK, this fires. Good.

- **But:** what about a sum type declared just before a JSX expression, an `if`, a `switch`, a `return`, a `throw`, `try`, `async`, `await`, `new`, `void`, `yield`, `do`, `while`, `for`, `break`, `continue`? None of these are in the list. So:
  ```sjs
  type T = A | B
  return Ok(42)
  ```
  The grammar keeps consuming. `return` is followed by `Ok(42)` — `Ok` will be claimed by the inner variant pattern, and `42` will fall through to `source.tsx#type`. This is *visibly wrong*: the return statement gets colored as if it were still inside the type.

  **Fix:** add `return|throw|if|else|switch|for|while|do|try|catch|finally|async|await|yield|new|void|break|continue|@` to the keyword list, OR (better) anchor the end on `\n` after detecting the union RHS has stabilized — but that needs more state than TextMate gives.

- **Trailing comma/semicolon:** SJS examples in the prompt show no terminator (`type Result<T,E> = Ok(T) | Err(E)` no semicolon). If the user happens to type a `;`, the `;` is in the end set. Fine. If not, no `;` ever terminates — must rely on next-line heuristic.

- **`export type X = ...`** — the `begin` pattern is `\b(type)\b`. `export` is then handled by... nothing — the rule starts at `type` and the preceding `export` falls through to TS. **But:** what claims `export` as a keyword? TS grammar normally handles `export type X` as a single construct with its own scoping. We're cutting it in half, scoping `type` as `storage.type.sjs` and leaving `export` to TS. Visually OK; semantically the begin is at `type` and TS may have already started capturing `export type ...` as a unit. Order of operations could double-claim. Worth testing explicitly (fixture missing).

### 1.4 Match expression (§2.8) — several issues

- **`end: "(?<=\\})"`** uses fixed-length lookbehind on `}`. This is fine, but the match-body sub-rule has its own `end: "\\}"`. When the inner sub-rule consumes the closing brace, the outer rule's `(?<=\\})` fires retroactively on the next character. That's the intended behavior but it means the outer `match` scope extends one character past the brace. Test fixture for this.

- **`match` as identifier in JS.** `function match(x) { ... }` is legal JS. The rule `\b(match)\b` will fire and start the match-expression sub-grammar at the `function match(`. The body `(x)` is then matched as "scrutinee," then the function body `{ ... }` as match body. **Total catastrophe** for any user file containing a function named `match` (common in parser combinator code, RxJS, etc.).

  **Fix:** require `match` to be followed by an expression and then `{` on the same statement, with disambiguation against `function match`. One approach: negative lookbehind `(?<!function\s+)(?<!\.)\bmatch\b`. Add a fixture.

- **Scrutinee sub-rule:** `begin: "(?<=match)"` with `end: "(?=\\{)"`. This consumes everything between `match` and the next `{`. But what if the scrutinee itself contains an object literal? `match { foo: 1 }.bar { ... }` (legal: match an object property). The first `{` terminates the scrutinee prematurely. The plan does not address this. SJS may not allow it but TextMate cannot enforce.

- **Pattern sub-rule:** `begin: "(?=[A-Z_a-z0-9$])"` — `_` is in the standard regex meta but here it's literal underscore. Patterns starting with `_` are bindings (`_ => default`). Fine. But what about *literal* patterns? `match x { 1 => "one", 2 => "two" }` — the `[A-Z_a-z0-9$]` begin matches `1`. OK. What about `"hello" => ...`? Starts with `"`, not in the begin set. **Literal-string patterns are not matched at all** — they fall through to the outer `meta.match.body.sjs` with no further structure. The `=>` is unmatched (no `keyword.operator.match.arrow.sjs` applied).

  **Fix:** broaden the pattern begin to include `"`, `'`, ``, `(`, `[`, and `-` (negative numbers).

### 1.5 Generic constraint (§2.10) — partial

```
(?<=<)\s*([A-Z][A-Za-z0-9_$]*)\s*(:)
```

- Lookbehind `(?<=<)` is fixed-length, fine.
- Matches first param only. `function f<T: Foo, U: Bar>` — `T` matches because of the `<`, but `U` is preceded by `,` not `<`. **`U: Bar` constraint is never colored.** This is a clear bug.
- **Fix:** alternation `(?<=[<,])\s*...` (fixed-length).

### 1.6 Banned `any` rule (§2.6) — under-restrictive

```
\b(any)\b(?=\s*[,;=)\]\}>|&]|$)
```

The author already calls out the case `const any = ...` but the rule's lookahead allows `\s*=`, which is EXACTLY `const any =`. **The rule fires on the variable name `any` if it appears at the right edge of a line followed by `=`.** Example:
```js
const any = something();
```
The `any` after `const ` is followed by space then `=`. Lookahead matches. **Variable `any` gets `invalid.deprecated`.** This is a regression for any user who has identifiers named `any`.

The author's intent was to flag `any` only as a *type*. Type position requires preceding `:` (annotation) or `<` (generic arg) or after `as`. The actual rule does not enforce this. **Fix:** require preceding `:` or `as` or `<` or `,` (inside generic): `(?<=[:<,]\s*|as\s+)\b(any)\b...`. Variable-length lookbehind not supported in Oniguruma fixed-length lookbehind, but you can split into multiple patterns.

---

## 2. Scope name correctness

The plan does mostly use kosher TextMate conventions. Specific gripes:

- **`storage.type.sjs`** for `type` — correct (matches TS).
- **`entity.name.type.declaration.sjs`** — should be `entity.name.type.sjs` (the `.declaration` suffix is non-standard; TS uses `entity.name.type`). Most themes will still pick up `entity.name.type` as the prefix-match, so visually OK, but it's a divergence with no upside.
- **`entity.name.type.variant.sjs`** and **`entity.name.type.variant.unit.sjs`** — non-standard. No theme will style these specifically. They will only match by prefix `entity.name.type`. The `.variant` part is dead namespace. Either accept it (no harm) or use `entity.name.function.tag.sjs` (closer to OCaml/Reason conventions) or `support.type.variant.sjs`.
- **`keyword.operator.match.arrow.sjs`** — fine, but most themes won't style differently from `keyword.operator.arrow`. The reverse-prefix matching does not work for `keyword.operator` (themes match the *full* dotted prefix, not arbitrary inner segments). Style fallback may be weaker than expected.
- **`keyword.operator.assignment.sjs`** for the `=` in `type X = ...` — correct.
- **`keyword.operator.type.union.sjs`** — standard, matches TS.
- **`keyword.operator.type.nullable.sjs`** — non-standard. TS uses `keyword.operator.optional` for `?` in optional properties. Use that for theme parity.
- **`keyword.operator.type.constraint.sjs`** — non-standard but harmless.
- **`support.type.dynamic.sjs`** — good choice (will theme like `any`/`unknown` in most themes). Author already raises this as open question §12.3.
- **`punctuation.section.match.begin.sjs` / `.end.sjs`** — convention is `punctuation.section.block.begin` plus a context marker. Acceptable.
- **`entity.name.function.constructor.variant.sjs`** — overlong. Themes match on `entity.name.function`. The `.constructor.variant` suffix is dead. Fine but verbose.
- **`invalid.deprecated.any.sjs`** — correct. Themes render this with strike-through or muted color.
- **`meta.embedded.expression.sjs`** in `package.json` `embeddedLanguages` map — but the grammar never emits a `meta.embedded.expression.sjs` scope anywhere. The mapping is dead config.

---

## 3. Embed strategy (`source.tsx`) — load-bearing assumptions that are wrong

The plan asserts (§2.1, §2.2):

> "We are coupled to scope name `source.tsx`. If the user's installation lacks TS grammar (impossible — it's built in), we break. Acceptable."

This is **not quite right**:

- VS Code does ship `source.tsx` built-in. ✓
- But `include: source.tsx#type`, `include: source.tsx#expression`, `include: source.tsx#type-parameters`, `include: source.tsx#destructuring-variable`, `include: source.tsx#variable-initializer` — **these named repository entries are internal to Microsoft's `TypeScriptReact.tmLanguage.json` and are NOT a public API.** They can rename between VS Code releases. The plan uses *five* such internal include names. Each is a maintenance liability.

  - `source.tsx#type` — exists in current grammar.
  - `source.tsx#expression` — exists.
  - `source.tsx#type-parameters` — exists *currently*; has been renamed historically.
  - `source.tsx#destructuring-variable` — **may not exist by that exact name** in current TS grammar (the actual repo entry is something like `destructuring-variable` or `destructuring-parameter` — needs verification).
  - `source.tsx#variable-initializer` — exists.

  The plan should pin to a specific TS grammar release for testing, document the dependency, and add a CI smoke test that asserts each include resolves. The Risks section (§11) mentions "TS grammar version drift" with a hand-wave; this is the actual concrete failure mode.

- **Embedding `source.tsx` directly means the SJS file is *parsed* as TSX in addition to SJS rules.** Inherited TSX behaviors that will be wrong for SJS:
  - TSX uses `<T>` casts only in `.ts` files, not `.tsx` — in `.tsx`, `<T>expr` is always JSX. **SJS users coming from TS will type `<MyType>value` and get JSX errors.** Plan does not address.
  - TSX grammar specially handles `as`, `satisfies`, `is` keywords. SJS may forbid some (`is` predicates aren't in the spec's syntax facts). They'll still be colored as TS keywords.
  - TSX colors `enum E` with TS's enum scope *before* our `invalid.deprecated.enum.sjs` rule unless we are sure our rule runs first. The plan does say "Order matters" but adds no fixture proving the override works for `enum`.

---

## 4. Missing tokens

These are not in the plan's token table (§1):

1. **Trailing-comma handling in match arms.** Not a token but a grammar concern: the arm sub-rule `end: "(?=,|\\})"` peeks at `,` but never consumes it. The `,` falls through to `meta.match.body.sjs` with no scope. Minor.

2. **Match arm with guard.** SJS grammar facts in the prompt do not show guards (`Ok(v) if v > 0 => ...`) — confirm if guards exist. If yes, missing entirely.

3. **`as` cast operator.** Inherited from TS. SJS may or may not allow `as` — if not, it's a banned construct missing from §2.6.

4. **`satisfies`.** Same — inherited from TS, may not be in SJS spec.

5. **`as const`.** Same.

6. **`readonly`, `keyof`, `typeof` (type-position), `infer`.** All TS-inherited. Spec doesn't say.

7. **Variant payload as positional tuple vs object.** Plan shows `Circle({ radius: 5 })` (object) and `Ok(T)` (single type). What about `Ok(T, U)` multi-arg? Plan's sum-type-decl regex `([A-Z][A-Za-z0-9_$]*)\s*\(` handles the begin; inner `source.tsx#type` should handle commas. Probably OK but no fixture.

8. **Unit variant in *type* position vs *value* position.** Same identifier, two scopes (`entity.name.type.variant.unit.sjs` vs `entity.name.function.constructor.variant.sjs`). The decl sub-grammar uses the former; the top-level variant-constructor rule uses the latter. **They will fight** in lines like:
   ```sjs
   const x: Color = Red
   ```
   `Red` is in value position (right of `=`). The top-level rule fires first. But the type annotation `: Color` is handled by `source.tsx#type` (inherited). `Color` here is type-position and uppercase — does the variant-constructor rule fire on it? Lookbehind: ` ` (space, not in exclusion). Lookahead: ` ` then `=` — `=` is in the unit-variant exclusion. So `Color` is NOT matched. Safe by accident.

9. **`default` keyword:** The plan does handle this (§2.8 first arm), but only when followed *directly* by `=>` on the same expression. `default` on its own (e.g., `export default Foo`) is NOT inside a match context, so the SJS rule (which only fires inside `sjs-match-arm`) doesn't apply, and TS handles `export default`. Good — this is actually correct. ✓

10. **`=>` of arrow functions vs `=>` of match arms.** The match arm rule scopes `=>` as `keyword.operator.match.arrow.sjs` only inside `sjs-match-arm`. Outside, `=>` falls through to TS's `keyword.operator.arrow`. **Good** — properly contextual. ✓

11. **`T?` in function return position after `):`** — covered by §2.4's general rule, since the lookbehind matches the closing identifier of the type and the lookahead matches `{` or `;`... wait, `{` is NOT in the lookahead set `[,;=)\]\}>|&]`. So `function f(): User? {` — the `?` is followed by ` {` — `{` not in set. **Rule does not fire.** This is a critical bug. The function return type with `?` followed by an opening function-body brace is a common case, and the rule misses it. **Fix:** add `{` to the lookahead set.

12. **`<T: Interface>` generic constraint colon vs object literal `{key: value}`.** Plan handles only the generic-constraint variant via `(?<=<)\s*...`. Object literal colons are unchanged (TS handles). Good.

13. **Pipe `|` outside type position.** The sum-type decl rule scopes `|` as union operator — but only *inside* the decl. A bare `|` in expression position (bitwise OR) is handled by TS. Good.

14. **Nested sum types: `type Outer = Inner(type Inner = A | B)`** — not legal SJS, ignore.

15. **`None`, `Red`, etc. on left-hand side of `match` arm.** A `default => ...` is handled. But a pattern `None => ...` (unit variant) is supposed to match. The sub-rule begin `(?=[A-Z_a-z0-9$])` fires; the inner rule includes `#sjs-variant-constructor`. The unit-variant rule has its lookahead exclusion `(?![A-Za-z0-9_$<({.=])`. After `None` comes ` => ...` — space, then `=`. `=` is in exclusion. **The rule does NOT match `None` in a match arm.** So `None => ...` will have `None` uncolored (or colored by some fallback) and only `=>` scoped as match-arrow. Bug.

---

## 5. Snippet gaps

- **`for/while`** loops — not SJS-specific but missing from common patterns. Optional.
- **`class` snippet** — missing. Users will write classes often.
- **`async function` returning `Result`** — common SJS pattern, missing.
- **`type` with nested generic constraint** — missing.
- **`import { Ok, Err } from "..."`** — variants must be imported (presumably). If the model is "variants are values constructed by the type system," no import is needed. If they ARE module-level exports, a snippet for importing common variants would help.
- **Match with guard** — if SJS supports `Ok(v) if v > 0 => ...`. Spec is silent.
- **Try-catch with Result conversion** — `try { ... } catch (e) { return Err(...) }` — common conversion idiom.
- **Snippet collisions:** `match` snippet has prefix `match`. VS Code's built-in TS extension does not provide a `match` snippet (good). But user-installed extensions (Reason, Rescript, F#) might. Plan acknowledges in §11 ("Snippet collisions") but provides no plan to namespace if needed; just "iterate based on feedback." OK for v0.1.
- **`fn?` prefix has `?` in it.** Many users have completion-on-typing configured; `?` is a question-mark character VS Code may not let through cleanly as a prefix terminator. **Test typing `fn?` in a fresh editor** — likely the snippet completion fires on `fn` and the `?` is consumed as a literal next character. Recommend `nullfn` or `fnopt` instead.
- **`??=` snippet:** The body is `${1:value} ??= ${2:default};` — this is a one-character expansion. The trigger `??=` is the *same* as the expansion. Snippet completion likely won't fire because the trigger is already typed. Useless snippet, drop it.
- **`type` snippet body uses `${2:<${3:T}>}`** — nested placeholders. Some versions of VS Code's snippet engine handle this poorly. Verify with a fixture or simplify.

---

## 6. Language configuration gaps

- **`<` `>` as brackets:** plan calls this out (§6 note) and accepts the noise. Reasonable for v0.1 but expect user complaints. Most modern TS extensions handle this with custom logic that TextMate cannot replicate.
- **`indentationRules.increaseIndentPattern`:** `^.*(\\{[^}"'`]*|\\([^)"'`]*|\\[[^\\]"'`]*|=>\\s*)$` — the `=>\\s*$` increases indent after a line ending in `=>`. Reasonable for match arms but will also fire on every arrow function ending a line. Acceptable.
- **Missing: `onEnterRules` for sum-type continuation.** When the user presses Enter after `type X = A |`, indentation should align under `=`. Not specified.
- **Missing: `onEnterRules` for match arm comma.** After `Ok(v) => v,` newline should align under the previous arm. Standard JS object-literal indentation handles this; acceptable.
- **`wordPattern`:** copy-pasted from JS defaults. Does not explicitly handle `$` in identifiers — actually the negative class allows `$`. Fine. Author claims `?` is excluded from word chars so `T?` selects only `T` — verify the regex: the `?` is in the excluded set `\?`. ✓
- **No `folding` config.** Custom folding ranges for `match { ... }` would be a nice touch. Not blocking for v0.1.
- **No `autoCloseBefore` config.** When user types `(` before an existing `)`, VS Code may double-close. Standard TS config sets `autoCloseBefore: ";:.,=}])>` ` \n\t"` — plan omits this. Add for parity.

---

## 7. Testing plan

- **`vscode-tmgrammar-test`** is the right tool but **unmaintained as of late 2024** (last release on npm is older). Confirm it still works against current VS Code Oniguruma version. Alternative: `vscode-textmate` directly with custom Jest harness. Risk to estimate.
- **15 fixtures is the minimum.** Should be 25-30 for the regex defects called out above:
  - Multi-line ternary (§1.1 case a)
  - `function match(x)` identifier shadowing (§1.4)
  - `new MyClass()` decorator over-coloring (§1.2)
  - `export type X = ...` cooperation with TS (§1.3)
  - Type return `): User? {` (§4 item 11)
  - `None => ...` in match arm (§4 item 15)
  - `const any = 1` user identifier (§1.6)
  - `class Foo extends Bar` (§1.2 unit variant rule)
  - Multi-constraint generics `<T: A, U: B>` (§1.5)
  - Sum type followed by `return` (§1.3)
- **The plan claims tests will cover "embedded TypeScript/JSX inside SJS files" — fixture 14 (JSX) and 15 (mixed)** — but does NOT test that the embedded TS grammar's internal repo entries (`source.tsx#type`, etc.) still resolve correctly. If VS Code renames `source.tsx#destructuring-variable`, fixtures pass on dev machine but fail in CI on a different VS Code version. **Add a fixture that uses each embedded include and asserts a specific inner scope.**
- **CI runs on Ubuntu only.** TextMate / Oniguruma behavior is platform-agnostic but it's cheap to matrix-test on macOS and Windows runners too. Add ~2 minutes total.
- **No visual regression testing.** §7.5 manual smoke test is the only check that the *colors* look right. For Round 2, consider snapshot testing rendered output via VS Code's `tokenizeLine` API in a programmatic test.

---

## 8. Publishing realism

- **Azure DevOps PAT setup (§8.1)** — accurate. Scope `Marketplace > Manage` is correct. The "free Azure DevOps org" step often confuses first-time publishers (you must verify an email + accept ToS). Plan glosses with one bullet; budget 30-60 minutes in Sprint 3, not the implied 5.
- **Publisher name `hbarve1`** — must be globally unique on VS Code Marketplace. Mitigation in §11 (Risks) says "Reserve early in Sprint 3." Should be done in Sprint 1 to avoid blocking release. **Flag for immediate action.**
- **Open VSX (§8.2)** — needs separate registration at https://open-vsx.org/. Requires GitHub OAuth + namespace claim. Not free of friction. Plan does not mention namespace claim step. Add ~30 min.
- **`vsce publish` from CI:** the v0.1 plan uses `npx vsce publish -p ${{ secrets.VSCE_PAT }}`. Newer `vsce` versions deprecate passing PAT inline in favor of `--pat` or env var `VSCE_PAT`. Confirm with current vsce docs.
- **`engines.vscode: ^1.80.0`** — choosing the floor matters. June 2023 is fine. But `embeddedLanguages` mapping requires `1.85+` for full TypeScript-React embed; verify against current docs.
- **`main: null`** — declarative-only extension. Correct, but the value should be omitted entirely, not set to `null`. vsce may warn.
- **README screenshots (§8.4)** — relative paths to `media/` excluded from the VSIX. The plan says "VS Code Marketplace fetches via the repo URL" — TRUE only when `repository.url` is set in `package.json` AND the marketplace's image proxy can fetch the file. Plan does set `repository.url`. ✓. But the *Open VSX* registry does NOT proxy images the same way; broken images on Open VSX listing is likely. Workaround: include images IN the VSIX (small PNGs).

---

## 9. Icon plan

- §3 mentions `icons/sjs-file-icon.svg`, light, and dark variants.
- §4 references `icons/sjs-file-icon.png` for the extension marketplace icon — **a PNG that is not generated by any step in the plan.** Sprint 3 has "Design SVG file icons" at 1h. PNG conversion is not budgeted.
- **VS Code file icons require participation in an Icon Theme.** Just specifying `contributes.languages[].icon` only paints the icon when the user's icon theme **does not** override it. With popular icon themes (Material Icon Theme, vscode-icons), the SJS icon will **never appear** unless those themes add SJS support, OR the user installs an icon-only extension that registers the file pattern.
  - Plan does not acknowledge this. Reality is: ~80% of users will not see the custom icon because they use a third-party icon theme.
  - Mitigation: open a PR to Material Icon Theme requesting SJS support. Out of scope but worth listing.
- **Marketplace icon dimensions:** require 128x128 PNG minimum. Plan says "32x32 SVG." Insufficient for marketplace tile.
- **Galleries:** the dark-banner choice (§4 `galleryBanner.color: "#1e1e1e"`) is fine but make sure the icon has transparent background or matches.

---

## 10. Dark/light theme compatibility

- **`storage.type.sjs`** — themed by all major themes (One Dark Pro, GitHub Light, Dracula, Dark+, Monokai). ✓
- **`entity.name.type.sjs` prefix family** — themed by all. ✓
- **`keyword.operator.match.arrow.sjs`** — themes match on `keyword.operator` prefix. ✓
- **`keyword.operator.type.nullable.sjs`** — themes match on `keyword.operator`. ✓ but rendered as a generic operator, not specifically styled. Acceptable.
- **`support.type.dynamic.sjs`** — themes color `support.type` like primitives (`number`, `string`). ✓ good choice.
- **`invalid.deprecated.*`** — most themes render with strike-through (Dark+, One Dark Pro). Dracula has muted gray. GitHub Light shows wavy underline. ✓ visible signal in all four.
- **`entity.name.function.constructor.variant.sjs`** — themes prefix-match `entity.name.function`. Most color functions yellow/green. Visually distinct from regular identifiers. ✓
- **Risk:** themes like "Solarized Light" and "Quiet Light" have low contrast for many scopes. Plan's manual smoke test only lists Dark+, One Dark Pro, Dracula. **Add Light+ and GitHub Light** for accessibility-conscious users.

---

## 11. Sprint sizing — optimistic by ~40%

Plan totals 20 hours. Realistic re-estimate:

| Sprint 1 (Core Grammar) — plan says 8h | Realistic |
|---|---|
| Scaffold | 1h ✓ |
| Grammar shell + TS include | 0.5h ✓ |
| `match` keyword + match expression | 1.5h → **3h** (the `function match()` shadowing fix + scrutinee end disambiguation will take real iteration) |
| `type X = A | B(...)` sum-type | 2h → **3h** (end-pattern keyword list + `export type` cooperation) |
| `dynamic` keyword | 0.5h ✓ |
| Banned keywords | 0.5h → **1h** (`any` needs preceding-context fix) |
| Smoke test | 1h ✓ |
| Set up tests + 6 fixtures | 1h → **2h** |
| **Sprint 1 realistic** | **13h** |

| Sprint 2 (Edge Cases) — plan says 6h | Realistic |
|---|---|
| `T?` rule | 1.5h → **3h** (multiple lookahead fixes + return-position `{`) |
| Variant constructor rules | 1h → **3h** (new/decorator/extends/import exclusions) |
| Generic constraint | 0.5h → **1h** (multi-param fix) |
| Match arm tuning | 1h → **2h** (literal patterns, None case, default vs identifier) |
| Snippets | 1h ✓ |
| Fixtures 7-12 + bug fixing | 1h → **3h** |
| **Sprint 2 realistic** | **13h** |

| Sprint 3 (Polish + Publish) — plan says 6h | Realistic |
|---|---|
| Icons SVG + PNG | 1h → **2h** (need 128x128 marketplace + light/dark file icons, design iteration) |
| Fixtures 13-15 | 1h ✓ |
| README + screenshots | 1.5h → **3h** (capture, edit, multi-theme) |
| CI workflow | 0.5h ✓ |
| Publish workflow | 0.5h → **1h** (PAT setup, secret management, dry-run) |
| Marketplace registration + manual publish | 1h → **2h** (Azure DevOps onboarding friction + Open VSX namespace claim) |
| Smoke test on clean profile | 0.5h ✓ |
| **Sprint 3 realistic** | **10h** |

**Realistic total: ~36 hours, achievable in 6-8 calendar days for one engineer working part-time.** The plan's 20h estimate is achievable only if (a) the regex defects in §1 above are accepted as v0.1 limitations and patched in v0.1.1, and (b) icon and screenshots are minimal.

---

## 12. What's missing entirely

1. **`superjs.config.json` association.** Plan only registers `.sjs`. The project has a config file (per CLAUDE.md context: `tessl.json`, `specs/.../config-schema.json`). If SuperJS has its own config file, registering it as JSON-with-schema gives free validation. Missing.

2. **`.sjs` test file convention.** If SuperJS tests use a `.test.sjs` or `.spec.sjs` pattern, no special handling is needed (the `.sjs` extension still matches), but consider adding to README.

3. **Comment-toggle for JSX:** TS extension has special comment-toggle behavior inside JSX (`{/* ... */}`). The `language-configuration.json` lineComment is `//` always. Inside JSX, pressing Ctrl+/ in standard TS uses the JSX comment style. SJS plan does not configure this. Acceptable inheritance from TS will NOT work because `language-configuration.json` is OUR language, not TS's.

4. **Editor settings recommendations.** Many language extensions ship a `configurationDefaults` in `contributes` to set `editor.tabSize`, `editor.insertSpaces`, `editor.suggest.snippetsPreventQuickSuggestions: false`, etc., for the language. Not done.

5. **Color customizations.** Plan does not contribute `colors` (theme tokens) — fine, but it does not contribute `semanticTokenColors` either (still fine for Phase 1, but flag for LSP phase).

6. **`emmet.includeLanguages` mention.** Users wanting Emmet inside JSX in `.sjs` files must add `"emmet.includeLanguages": {"superjs": "javascriptreact"}` to their settings. Mention in README.

7. **Source map for the grammar.** Not a thing in TextMate, ignore.

8. **`browser` entry in `package.json`.** For web-based VS Code (vscode.dev). A pure declarative grammar extension works in vscode.dev automatically *if* `extensionKind: ["ui", "workspace"]` is correctly configured. Plan does not set `extensionKind`. Some web-VS-Code instances will refuse to load the extension. Add `"extensionKind": ["ui", "workspace"]` and test on vscode.dev.

9. **Marketplace tags / Q&A toggling.** `package.json` can disable Q&A (`"qna": false`) and enable issue routing. Not configured.

10. **License attribution for the embedded TS grammar.** Open question §12.6 — yes, this is required. Microsoft's TypeScript grammar is MIT and requires the copyright notice in distributed binaries. The VSIX bundles only the SJS grammar (not TS itself, which is included by reference), so attribution may not be strictly required, but a NOTICE file is good hygiene. Plan defers to Round 2 — fine.

11. **What happens if the user has the TypeScript extension disabled?** `source.tsx` is shipped by VS Code itself (built-in extension `vscode.typescript-language-features`). If the user disables it, `source.tsx` may still exist as a grammar (grammars are shipped separately) — verify.

12. **Activation cost measurement.** Plan claims "<100KB packaged, zero runtime deps." Verify the actual VSIX size in Sprint 3 against the claim. The grammar JSON alone could exceed 30KB with all the patterns inlined.

---

## Summary of blocking issues (must fix before approval)

1. **§1.4 `match` rule collides with `function match()` identifier** — guaranteed bug for any file with that pattern. (Critical.)
2. **§4 item 11 — `T?` in function return position before `{` is missed** — `function f(): User? { ... }` won't highlight `?`. (Critical, common case.)
3. **§1.5 generic constraint only catches the first type parameter** — `<T: A, U: B>` only colors `T:`. (High.)
4. **§1.6 `any` rule fires on variable named `any`** — over-broad regression. (High.)
5. **§4 item 15 — `None` in match arm is not colored** — common case unhandled. (High.)
6. **§1.2 variant-constructor unit-variant rule over-colors class names, import bindings, type-position references** — should require value-position lookbehind. (Medium-High.)
7. **§1.3 sum-type-decl end pattern missing `return`, `throw`, etc. — type continues consuming over real code.** (Medium.)
8. **Icon plan does not budget PNG conversion or marketplace 128x128.** (Medium.)
9. **§7.1 `vscode-tmgrammar-test` maintenance status — verify before adopting.** (Medium.)
10. **20-hour estimate is ~40% light** — re-baseline to 32-36h. (Medium, planning only.)

## Strengths worth preserving

- The decision to embed `source.tsx` rather than fork is correct.
- The scope namespace `*.sjs` suffix discipline is consistent.
- `invalid.deprecated.*` for banned keywords is a clever zero-LSP signal.
- The `main: null` declarative approach minimizes activation cost.
- Token-by-token mapping table (§1) is exemplary documentation form.
- Risks section names the right risks even when it underestimates them.
- Open Questions (§12) defers genuinely tough decisions explicitly.

## Recommended Round 2 deliverable

A revised plan that:
1. Fixes the regex defects listed under §1 with the specific suggested lookbehind/lookahead changes.
2. Expands fixtures to 25-30 covering each defect case.
3. Pins a specific VS Code / TS grammar version for testing and documents the internal-API dependency.
4. Re-baselines sprints to ~35h total.
5. Adds explicit publisher-name reservation as a Sprint 0 task (1h, this week).
6. Resolves open questions §12.3 (`dynamic` scope), §12.6 (license attribution), and §12.1 (icon design ambition).
