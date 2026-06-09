# 036 — Template Literals

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §TemplateLiteral, §PrimaryExpression

---

## Syntax

```ebnf
<TemplateLiteral>   ::= "`" { <TemplateCharacter> | "${" <Expression> "}" } "`"
<TemplateCharacter> ::= (* any character except ` and ${ sequence *)

<TaggedTemplate>    ::= <MemberExpression> <TemplateLiteral>
                      | <CallExpression>   <TemplateLiteral>
```

Template literals begin and end with a backtick (`` ` ``). Embedded expressions are delimited by `${` and `}`. Tagged templates prefix a template literal with a tag expression.

---

## Semantics

### Untagged template literals

An untagged template literal produces a `string`. Embedded expressions are coerced to string via the abstract `ToString` operation. Any type may appear inside `${}` — the coercion is implicit.

Under `--strict`, embedding a `dynamic` expression emits SJS-W002 (untyped interpolation) to encourage explicit string conversion.

Multi-line template literals preserve whitespace and newline characters as written in source.

Escape sequences: `\n`, `\t`, `\\`, `` \` ``, `\${` (escaped interpolation). Unicode escapes `\uXXXX` and `\u{XXXXX}` are supported.

### Tagged template literals

A tagged template invokes a tag function with the following signature:

```sjs
type Tag<R> = (strings: TemplateStringsArray, ...values: dynamic[]) => R;
```

The tag receives:
- `strings` — a `TemplateStringsArray` (a frozen `string[]` with an additional `.raw` property containing the raw, un-escaped string parts). Length is always one more than the number of interpolations.
- `...values` — the evaluated interpolation expressions, passed as individual arguments.

The result type of a tagged template expression is the return type of the tag function.

### Built-in SJS tags

SJS provides typed built-in tags as part of the standard library:

| Tag | Return type | Purpose |
|-----|-------------|---------|
| `sql` | `SqlQuery` | Type-safe SQL query construction |
| `html` | `HtmlFragment` | Safe HTML fragment construction |
| `css` | `CssRule` | Scoped CSS rule construction |

These tags enforce that interpolated values conform to safe types for their respective domains.

---

## Type rules

```
Γ ⊢ e₁ : T₁  …  Γ ⊢ eₙ : Tₙ
────────────────────────────────────── (template-str)
Γ ⊢ `...${e₁}...${eₙ}...` : string

Γ ⊢ tag : (TemplateStringsArray, T₁, …, Tₙ) => R
Γ ⊢ e₁ : T₁  …  Γ ⊢ eₙ : Tₙ
────────────────────────────────────────────────────── (tagged-template)
Γ ⊢ tag`...${e₁}...${eₙ}...` : R
```

For typed built-in tags, the interpolated value types are checked against the tag's declared value parameter types. An interpolated `string` in an `sql` tag context is accepted; an interpolated user-controlled `dynamic` in `sql` context emits SJS-W002 or requires an explicit cast to a safe wrapper type.

---

## JS Lowering (Prototype)

Untagged and tagged template literals pass through unchanged to the JS output. SJS adds no transformation beyond type erasure.

```sjs
// SJS input
const name: string = "World";
const greeting: string = `Hello, ${name}!`;

const query: SqlQuery = sql`SELECT * FROM users WHERE id = ${userId}`;
```

```javascript
// JS output
const name = "World";
const greeting = `Hello, ${name}!`;

const query = sql`SELECT * FROM users WHERE id = ${userId}`;
```

For ES5 targets, untagged template literals are lowered to string concatenation. Tagged templates are lowered to explicit function calls.

```javascript
// ES5 output for untagged
const greeting = "Hello, " + name + "!";

// ES5 output for tagged
const query = sql(Object.freeze(
  Object.assign(["SELECT * FROM users WHERE id = ", ""], {
    raw: ["SELECT * FROM users WHERE id = ", ""]
  })
), userId);
```

---

## LLVM Lowering (Future)

```llvm
; Untagged: `Hello, ${name}!`
; Compile to runtime string concat via @__sjs_str_concat
%part0 = getelementptr [8 x i8], [8 x i8]* @.str.hello, i32 0, i32 0
%name_str = load %SjsString*, %SjsString** %name
%part1 = getelementptr [2 x i8], [2 x i8]* @.str.bang, i32 0, i32 0
%result = call %SjsString* @__sjs_str_concat3(
            i8* %part0, %SjsString* %name_str, i8* %part1)

; Tagged template: tag`a ${v} b`
; The strings array is interned as a global constant
@.template_strings = global [2 x %SjsString*] [
  %SjsString* @.str.a_space,
  %SjsString* @.str.space_b
]
%result = call %TagResult* @tag(
            [2 x %SjsString*]* @.template_strings, %Value* %v)
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-W002` | `dynamic` expression interpolated inside a template literal under `--strict` |
| `SJS-E002` | Tagged template interpolation type does not match tag's parameter type |

---

## Examples

### Valid

```sjs
// Basic string interpolation
const user: string = "Alice";
const msg: string = `Welcome back, ${user}!`;

// Multi-line
const multiline: string = `
  Line one
  Line two
`;

// Expression in interpolation
const a: number = 3;
const b: number = 4;
const hypotenuse: string = `hypotenuse = ${Math.sqrt(a * a + b * b)}`;

// Tagged template with typed return
const id: number = 42;
const query: SqlQuery = sql`SELECT * FROM orders WHERE user_id = ${id}`;

const fragment: HtmlFragment = html`<p>Hello, ${user}!</p>`;
```

### Invalid

```sjs
// SJS-W002: dynamic in strict mode
function render(value: dynamic): string {
  return `result: ${value}`;
  //               ^^^^^ SJS-W002: dynamic expression in template literal (--strict)
}

// SJS-E002: wrong type for typed tag
function strictTag(strings: TemplateStringsArray, ...nums: number[]): string {
  return strings.join("");
}
const label: string = strictTag`count = ${"not a number"}`;
//                                        ^^^^^^^^^^^^^^^ SJS-E002: string is not assignable to number
```
