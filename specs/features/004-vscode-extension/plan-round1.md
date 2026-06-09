# VS Code Extension for SuperJS — Implementation Plan (Round 1)

**Status:** Draft
**Scope:** Phase 1 — Syntax highlighting only (no LSP, no type checking, no IntelliSense beyond static snippets)
**Target deliverable:** A publishable `superjs-syntax` extension on the VS Code Marketplace that colors `.sjs` files correctly and ships a small set of useful snippets.
**Out of scope (deferred to Stage 3 of production roadmap):** Language Server, hover, go-to-definition, diagnostics, refactoring, formatter integration, debugger.

---

## 0. Goals and Non-Goals

### Goals
1. `.sjs` files open in VS Code with correct, idiomatic coloring.
2. All SuperJS-specific syntax (sum types, `match`, nullable `T?`, `dynamic`, variant constructors) is tokenized into stable, theme-friendly TextMate scopes.
3. Everything that is just JS/TS (classes, async/await, JSX, imports, template literals, regex, numbers, strings) reuses the existing TypeScript grammar so we inherit theme polish for free.
4. A handful of high-leverage snippets accelerate writing the new constructs.
5. Bracket matching, comment toggling, and auto-closing pairs work natively.
6. Extension is small (<100KB packaged), zero runtime dependencies, loads on language activation only.

### Non-goals (Phase 1)
- No semantic highlighting (that requires the type checker / LSP).
- No diagnostics for banned keywords (`any`, `namespace`, `enum`) — best-effort visual de-emphasis only.
- No formatter binding, no test runner integration, no debug adapter.
- No telemetry.

---

## 1. Token Analysis

Every token below needs a custom rule. Tokens not listed inherit from the embedded TypeScript grammar via `include: source.ts`.

| # | Construct | Example | Proposed scope(s) | Notes |
|---|-----------|---------|-------------------|-------|
| 1 | `match` keyword | `match result { ... }` | `keyword.control.match.sjs` | Distinct from `switch`; themes that color `keyword.control` will pick it up automatically. |
| 2 | `type` declaration (sum type LHS) | `type Result<T, E> =` | `storage.type.sjs` for `type`; `entity.name.type.declaration.sjs` for `Result`; `meta.type.parameters.sjs` for `<T, E>` | Reuse TS rules where possible; we only need to *recognize* the sum-type RHS that follows `=`. |
| 3 | Sum-type variant declaration | `Ok(T) \| Err(E)` | `entity.name.type.variant.sjs` for `Ok`, `Err`; `keyword.operator.type.union.sjs` for `\|` | Variants are uppercase identifiers in type position. |
| 4 | Unit variant | `Red \| Green \| Blue` | `entity.name.type.variant.unit.sjs` | Same as #3 but without the `(...)` payload. |
| 5 | Payload on variant decl | `Circle({ radius: number })` | Curly-brace body delegates to embedded TS for type parsing; outer parens scoped `meta.variant.payload.sjs`. | Object-type body inside parens is just an inline anonymous type — reuse TS. |
| 6 | Nullable suffix | `string?`, `User?`, `Array<number>?` | `keyword.operator.type.nullable.sjs` on the `?` | Tricky: must not match ternary. See §2.4. |
| 7 | `dynamic` keyword (escape hatch) | `function parse(s: string): dynamic` | `support.type.dynamic.sjs` or `storage.type.dynamic.sjs` | Match only in type position; in value position it should remain an identifier. |
| 8 | Variant constructor in value position | `Ok(42)`, `Err("x")`, `None` | `entity.name.function.constructor.variant.sjs` for the constructor name | Heuristic: uppercase identifier followed by `(` or appearing as standalone expression in value position. See §2.5. |
| 9 | `match` expression structure | `match expr { Pat => body, ... }` | `meta.match.sjs` for outer, `meta.match.arm.sjs` for each arm | Enables theme overrides and indentation rules. |
| 10 | Match arrow | `Ok(val) => ...` | `keyword.operator.match.arrow.sjs` | Distinct from `=>` of arrow functions so themes can style differently if desired. |
| 11 | Match pattern (constructor) | `Ok(val)`, `Circle({ radius })` | `meta.match.pattern.sjs`; constructor name `entity.name.function.constructor.variant.sjs`; bindings as `variable.parameter.match.sjs` | Destructuring inside `{ ... }` reuses TS object-pattern rules. |
| 12 | `default` arm | `default => ...` | `keyword.control.default.sjs` (only inside `meta.match.sjs`) | Same word as `switch`'s default; we only color it as control inside a match. |
| 13 | Generic constraint | `<T: Comparable<T>>` | `:` scoped `keyword.operator.type.constraint.sjs`; the constraint type reuses TS type rules | Distinguishes constraint colon from type-annotation colon. |
| 14 | `interface` declaration | `interface Comparable<T> { ... }` | Inherit fully from TS grammar. | No `implements` clause in SJS — but we don't need to forbid it; TS grammar will just color it as a TS keyword. We won't add a rule. |
| 15 | Banned `any` | `: any` | `invalid.deprecated.any.sjs` | Theme-dependent: most themes render `invalid.deprecated` with strike-through or muted color. Acceptable signal. |
| 16 | Banned `namespace` | `namespace Foo { ... }` | `invalid.deprecated.namespace.sjs` | Same treatment. |
| 17 | Banned `enum` | `enum Color { ... }` | `invalid.deprecated.enum.sjs` | Same treatment. Note: `type Color = Red \| Green` is the SJS replacement. |
| 18 | JSX | `<Component />` | Inherit from `source.tsx` if file uses JSX. We *do not* fork two file extensions — every `.sjs` is parsed as the TSX-superset variant. | See §2.2. |
| 19 | Comments, strings, numbers, regex, template literals | Standard JS/TS | Inherit. | No rules. |
| 20 | Keywords `function`, `const`, `let`, `class`, `async`, `await`, `import`, `export`, etc. | Standard | Inherit. | No rules. |

**Decision on banned keywords:** scope them as `invalid.deprecated.*.sjs`. This is the strongest *visual* signal a TextMate grammar can give without diagnostics. Real errors come from the type checker in the LSP phase.

---

## 2. Grammar Architecture

### 2.1 Build on top of TypeScript grammar, do not fork

The official TypeScript grammar (`source.ts` / `source.tsx`, shipped by Microsoft, MIT-licensed, ~6000 lines) is maintained, battle-tested, and handles thousands of edge cases (template literals with embedded expressions, regex disambiguation, JSX, decorators, etc.). Reimplementing is a non-starter.

**Strategy:** define `source.sjs` as a new grammar whose top-level `patterns` array starts with SJS-specific rules and *then* falls through to `{ "include": "source.tsx" }`. Order matters in TextMate — the first match wins, so our rules pre-empt TS where needed.

Pros:
- Minimal maintenance: TS grammar updates flow through.
- Themes that style TS code style SJS code identically.
- File is tiny (~300 lines vs 6000).

Cons:
- We are coupled to scope name `source.tsx`. If the user's installation lacks TS grammar (impossible — it's built in), we break. Acceptable.
- We cannot easily *override* a TS scope after the fact (e.g., recolor TS's `keyword.other.type` for `enum`). Workaround: pre-empt with a higher-priority rule that matches `enum` first and assigns `invalid.deprecated.enum.sjs`.

### 2.2 JSX handling

Embed `source.tsx` (not `source.ts`). All `.sjs` files are parsed as TSX-flavored. This matches the language design (JSX is supported). The cost: a bare `<T>` immediately followed by an expression could be ambiguous (cast vs JSX), but TSX grammar already handles this; we inherit the behavior.

### 2.3 Grammar file structure

`syntaxes/superjs.tmLanguage.json` skeleton:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "SuperJS",
  "scopeName": "source.sjs",
  "fileTypes": ["sjs"],
  "patterns": [
    { "include": "#sjs-banned-keywords" },
    { "include": "#sjs-sum-type-decl" },
    { "include": "#sjs-match-expression" },
    { "include": "#sjs-dynamic-type" },
    { "include": "#sjs-nullable-suffix" },
    { "include": "#sjs-variant-constructor" },
    { "include": "#sjs-generic-constraint" },
    { "include": "source.tsx" }
  ],
  "repository": {
    "sjs-banned-keywords":     { /* §2.6 */ },
    "sjs-sum-type-decl":       { /* §2.7 */ },
    "sjs-match-expression":    { /* §2.8 */ },
    "sjs-dynamic-type":        { /* §2.9 */ },
    "sjs-nullable-suffix":     { /* §2.4 */ },
    "sjs-variant-constructor": { /* §2.5 */ },
    "sjs-generic-constraint":  { /* §2.10 */ }
  }
}
```

### 2.4 Nullable suffix `T?` vs ternary `?:`

This is the single trickiest case. A TextMate grammar has no semantic context — it cannot know whether we are in a type position or an expression. We use two heuristics together:

**Heuristic A (positional):** match `?` only when it directly follows a type-name pattern *and* the next non-whitespace character is one of `,` `)` `]` `}` `=` `;` `>` `\n` `|` or `&` (i.e., a type-terminator). This excludes ternary because ternary requires the `?` to be followed by an expression (which starts with identifiers, literals, `(`, etc., not the closing tokens above).

**Heuristic B (preceding context):** require the `?` to be preceded *immediately* by either:
- an identifier ending a type (`[A-Za-z_$][A-Za-z0-9_$]*`),
- a closing generic bracket `>`,
- a closing array bracket `]`,
- a closing paren `)` of a parenthesized type,

with no intervening whitespace (or at most spaces, not newlines).

Combined regex sketch (the `(?=...)` lookahead is the type-terminator set):

```
(?<![A-Za-z0-9_$])                 # not part of an identifier on the left
(?<=[A-Za-z0-9_$\]>)])             # preceded by an identifier, ], >, or )
\?                                 # the literal ?
(?=\s*([,;=)\]\}>|&]|$|\n|//|/\*)) # followed by type-terminator
```

Implementation in TextMate JSON (no lookbehind support in Oniguruma for variable length — but fixed-length lookbehinds work in TextMate's Oniguruma; the above are all fixed-length single chars):

```json
"sjs-nullable-suffix": {
  "match": "(?<=[A-Za-z0-9_$\\]>)])\\?(?=\\s*([,;=)\\]\\}>|&]|$))",
  "name": "keyword.operator.type.nullable.sjs"
}
```

**Known limitations (acceptable for v1):**
- A type annotation followed immediately by a ternary on the next line could false-positive in rare cases. We accept this — TS grammar handles ternary itself, so the `?` of ternary should already be claimed by TS *before* our rule fires if ordering is right. Actually, order: we put `#sjs-nullable-suffix` *before* `source.tsx` in the top-level patterns, so we win. To avoid eating ternaries, the lookahead at the *end* must exclude what comes after a ternary `?` (an expression). The character class `[,;=)\]\}>|&]` does exclude identifiers and literals, which is exactly what follows a ternary `?`. Looks safe in practice.

**Acceptance test cases (will be golden fixtures):**
- `const x: number? = null` → `?` is `keyword.operator.type.nullable.sjs`
- `function f(): User? { ... }` → highlight
- `const y = x ? a : b` → `?` stays TS ternary scope
- `type T = Array<number>?` → highlight
- `const z: (number | string)? = null` → highlight

### 2.5 Variant constructors in value position

Distinguishing `Ok(42)` (variant constructor) from `MyClass(42)` (class constructor without `new`, or a function call) is fundamentally semantic. We use a syntactic proxy:

**Rule:** Any identifier matching `[A-Z][A-Za-z0-9_$]*` (PascalCase, starting with capital) that appears in a value position followed by `(` is scoped as `entity.name.function.constructor.variant.sjs`. Standalone PascalCase identifiers (unit variants like `None`) are scoped the same way *only* when not followed by `.`, `=`, `<`, or `{` (which would indicate property access, type-param introduction, or block).

This will over-color real classes used without `new`, but in modern code that's rare; and the scope `entity.name.function.constructor.*` is what TS themes already use for `new Foo()` anyway, so the visual diff is minimal.

Regex sketches:

```json
"sjs-variant-constructor": {
  "patterns": [
    {
      "comment": "Constructor with payload: Ok(42), Circle({ radius })",
      "match": "(?<![A-Za-z0-9_$.])([A-Z][A-Za-z0-9_$]*)\\s*(?=\\()",
      "name": "entity.name.function.constructor.variant.sjs"
    },
    {
      "comment": "Unit variant: None, Red, Empty — standalone PascalCase id",
      "match": "(?<![A-Za-z0-9_$.])([A-Z][A-Za-z0-9_$]*)(?![A-Za-z0-9_$<({.=])",
      "name": "entity.name.function.constructor.variant.unit.sjs"
    }
  ]
}
```

**Acceptance:**
- `Ok(42)` → `Ok` is variant
- `Err("x")` → `Err` is variant
- `const x = None` → `None` is unit variant
- `Math.PI` → `Math` stays normal (preceded by nothing problematic, but `.PI` excludes it... actually the second rule's negative lookahead `(?![A-Za-z0-9_$<({.=])` excludes `.`, so `Math` before `.PI` is NOT matched as unit variant). Good.
- `import { Foo } from "x"` → `Foo` follows `{ ` — second rule: not followed by excluded chars except `}` later; actually `Foo` is followed by space then `}`. Hmm: `}` is not in the exclusion list. So `Foo` would match as unit variant. **Fix:** add `}` and `,` to exclusion-list contexts? No — those are common in destructuring of values too. Acceptable: in an `import { Foo }` line, coloring `Foo` as a constructor-like entity is *fine* — many themes color imports the same way. We accept this minor over-coloring.

### 2.6 Banned keywords

Pre-empt TS grammar with `invalid.deprecated` scopes:

```json
"sjs-banned-keywords": {
  "patterns": [
    {
      "match": "\\b(any)\\b(?=\\s*[,;=)\\]\\}>|&]|$)",
      "name": "invalid.deprecated.any.sjs",
      "comment": "Only flag 'any' in a type-terminator context to avoid coloring identifiers named 'any'"
    },
    {
      "match": "\\bnamespace\\b",
      "name": "invalid.deprecated.namespace.sjs"
    },
    {
      "match": "\\benum\\b",
      "name": "invalid.deprecated.enum.sjs"
    }
  ]
}
```

The `any` rule needs the type-terminator lookahead because users do legitimately name variables `any` in JS (think `Array.from(arr).filter(...)` — no, that's just a method; but `const any = ...` is legal). We only paint it deprecated when it appears as a type.

### 2.7 Sum-type declaration

```json
"sjs-sum-type-decl": {
  "begin": "\\b(type)\\s+([A-Z][A-Za-z0-9_$]*)\\s*(<[^>]*>)?\\s*(=)",
  "beginCaptures": {
    "1": { "name": "storage.type.sjs" },
    "2": { "name": "entity.name.type.declaration.sjs" },
    "3": { "name": "meta.type.parameters.sjs", "patterns": [{ "include": "source.tsx#type-parameters" }] },
    "4": { "name": "keyword.operator.assignment.sjs" }
  },
  "end": "(?=;|\\n\\n|^\\s*(type|function|const|let|class|interface|export|import|//))",
  "patterns": [
    {
      "match": "\\|",
      "name": "keyword.operator.type.union.sjs"
    },
    {
      "comment": "Variant with payload",
      "begin": "([A-Z][A-Za-z0-9_$]*)\\s*\\(",
      "beginCaptures": {
        "1": { "name": "entity.name.type.variant.sjs" }
      },
      "end": "\\)",
      "patterns": [{ "include": "source.tsx#type" }]
    },
    {
      "comment": "Unit variant",
      "match": "([A-Z][A-Za-z0-9_$]*)",
      "captures": {
        "1": { "name": "entity.name.type.variant.unit.sjs" }
      }
    },
    { "include": "source.tsx#type" }
  ]
}
```

The `end` pattern is heuristic — a sum-type RHS can span many lines but terminates when we hit a new top-level declaration. Acceptable for grammar purposes; if it over-extends a few characters it's a minor coloring glitch, never a correctness issue.

### 2.8 Match expression

```json
"sjs-match-expression": {
  "begin": "\\b(match)\\b",
  "beginCaptures": {
    "1": { "name": "keyword.control.match.sjs" }
  },
  "end": "(?<=\\})",
  "patterns": [
    {
      "comment": "Match scrutinee — any expression up to the opening brace",
      "begin": "(?<=match)",
      "end": "(?=\\{)",
      "patterns": [{ "include": "source.tsx#expression" }]
    },
    {
      "comment": "Match body",
      "begin": "\\{",
      "beginCaptures": { "0": { "name": "punctuation.section.match.begin.sjs" } },
      "end": "\\}",
      "endCaptures":   { "0": { "name": "punctuation.section.match.end.sjs" } },
      "name": "meta.match.body.sjs",
      "patterns": [
        { "include": "#sjs-match-arm" }
      ]
    }
  ]
},
"sjs-match-arm": {
  "patterns": [
    {
      "comment": "default arm",
      "begin": "\\b(default)\\b\\s*(=>)",
      "beginCaptures": {
        "1": { "name": "keyword.control.default.sjs" },
        "2": { "name": "keyword.operator.match.arrow.sjs" }
      },
      "end": "(?=,|\\})",
      "patterns": [{ "include": "source.tsx#expression" }]
    },
    {
      "comment": "Pattern => body arm",
      "begin": "(?=[A-Z_a-z0-9$])",
      "end": "(?=,|\\})",
      "patterns": [
        {
          "comment": "Pattern up to =>",
          "begin": "(?=\\S)",
          "end": "(=>)",
          "endCaptures": { "1": { "name": "keyword.operator.match.arrow.sjs" } },
          "patterns": [
            { "include": "#sjs-variant-constructor" },
            { "include": "source.tsx#destructuring-variable" },
            { "include": "source.tsx#variable-initializer" }
          ]
        },
        {
          "comment": "Body after =>",
          "begin": "(?<=>)",
          "end": "(?=,|\\})",
          "patterns": [{ "include": "source.tsx#expression" }]
        }
      ]
    }
  ]
}
```

### 2.9 `dynamic` type

```json
"sjs-dynamic-type": {
  "match": "\\b(dynamic)\\b(?=\\s*[,;=)\\]\\}>|&]|$)",
  "captures": {
    "1": { "name": "support.type.dynamic.sjs" }
  }
}
```

Same type-terminator lookahead as `any` to avoid eating identifiers named `dynamic`.

### 2.10 Generic constraint

```json
"sjs-generic-constraint": {
  "begin": "(?<=<)\\s*([A-Z][A-Za-z0-9_$]*)\\s*(:)",
  "beginCaptures": {
    "1": { "name": "entity.name.type.parameter.sjs" },
    "2": { "name": "keyword.operator.type.constraint.sjs" }
  },
  "end": "(?=[,>])",
  "patterns": [{ "include": "source.tsx#type" }]
}
```

---

## 3. Extension Structure

```
vscode-extension/
├── .vscode/
│   └── launch.json                       # F5 to launch Extension Development Host
├── .github/
│   └── workflows/
│       └── publish.yml                   # GH Actions auto-publish on tag
├── icons/
│   ├── sjs-file-icon.svg                 # 32x32 SVG, light and dark variants
│   ├── sjs-file-icon-light.svg
│   └── sjs-file-icon-dark.svg
├── snippets/
│   └── superjs.code-snippets             # JSON snippet file (§5)
├── syntaxes/
│   └── superjs.tmLanguage.json           # Grammar (§2)
├── test/
│   ├── fixtures/
│   │   ├── 01-sum-type.sjs
│   │   ├── 01-sum-type.sjs.snap
│   │   ├── 02-match.sjs
│   │   ├── 02-match.sjs.snap
│   │   └── ... (10+ fixtures)
│   └── grammar.test.ts                   # vscode-tmgrammar-test runner
├── .vscodeignore
├── .gitignore
├── CHANGELOG.md
├── LICENSE                               # MIT
├── README.md
├── language-configuration.json           # (§6)
├── package.json                          # (§4)
├── package-lock.json
└── tsconfig.json                         # Only for tests, no runtime TS
```

### 3.1 `.vscodeignore`
Exclude everything not needed at runtime:

```
.github/
.vscode/
test/
tsconfig.json
*.map
*.ts
node_modules/
.gitignore
```

Keep: `syntaxes/`, `snippets/`, `icons/`, `language-configuration.json`, `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`.

### 3.2 `.vscode/launch.json`
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
    }
  ]
}
```

### 3.3 `LICENSE` — MIT, matching the parent repo.

### 3.4 `CHANGELOG.md` — Keep-a-Changelog format, starts at `## [0.1.0] - 2026-XX-XX — Initial release`.

### 3.5 `README.md` — see §8.4 for content sketch.

---

## 4. `package.json` Specification

```json
{
  "name": "superjs-syntax",
  "displayName": "SuperJS",
  "description": "Syntax highlighting and snippets for SuperJS (.sjs) files.",
  "version": "0.1.0",
  "publisher": "hbarve1",
  "license": "MIT",
  "homepage": "https://github.com/hbarve1/super-js",
  "repository": {
    "type": "git",
    "url": "https://github.com/hbarve1/super-js.git",
    "directory": "vscode-extension"
  },
  "bugs": {
    "url": "https://github.com/hbarve1/super-js/issues"
  },
  "icon": "icons/sjs-file-icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  "categories": ["Programming Languages", "Snippets"],
  "keywords": ["superjs", "sjs", "syntax", "highlighting", "sum types", "match", "algebraic data types"],
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": [
    "onLanguage:superjs"
  ],
  "main": null,
  "contributes": {
    "languages": [
      {
        "id": "superjs",
        "aliases": ["SuperJS", "superjs", "sjs"],
        "extensions": [".sjs"],
        "configuration": "./language-configuration.json",
        "icon": {
          "light": "./icons/sjs-file-icon-light.svg",
          "dark":  "./icons/sjs-file-icon-dark.svg"
        }
      }
    ],
    "grammars": [
      {
        "language": "superjs",
        "scopeName": "source.sjs",
        "path": "./syntaxes/superjs.tmLanguage.json",
        "embeddedLanguages": {
          "meta.embedded.expression.sjs": "typescriptreact"
        }
      }
    ],
    "snippets": [
      {
        "language": "superjs",
        "path": "./snippets/superjs.code-snippets"
      }
    ]
  },
  "devDependencies": {
    "@vscode/vsce": "^2.24.0",
    "vscode-tmgrammar-test": "^0.1.3"
  },
  "scripts": {
    "test": "vscode-tmgrammar-test -s source.sjs -g syntaxes/superjs.tmLanguage.json -t \"test/fixtures/*.sjs\"",
    "package": "vsce package",
    "publish": "vsce publish"
  }
}
```

Notes:
- `main: null` — pure declarative extension, no JS code at runtime. This means no `activate()` function, near-zero startup cost.
- `activationEvents: ["onLanguage:superjs"]` — extension only loads when a `.sjs` file is opened.
- `engines.vscode: ^1.80.0` — June 2023, gives us ~99% of installed bases.
- `embeddedLanguages` mapping enables Emmet, comment-toggling, and other language-aware features inside our `meta.embedded.*` scopes if we choose to use them later.

---

## 5. Snippet Plan

File: `snippets/superjs.code-snippets`. All snippets are valid JSON with TextMate snippet syntax (`${1:placeholder}`).

| Trigger | Description | Body sketch |
|---------|-------------|-------------|
| `match` | Match expression with two arms | `match ${1:scrutinee} {\n  ${2:Pattern1} => ${3:body1},\n  ${4:Pattern2} => ${5:body2},\n}` |
| `matchres` | Match a `Result<T, E>` | `match ${1:result} {\n  Ok(${2:value}) => ${3},\n  Err(${4:error}) => ${5},\n}` |
| `matchopt` | Match an `Option<T>` / nullable | `match ${1:opt} {\n  Some(${2:value}) => ${3},\n  None => ${4},\n}` |
| `type` | Sum type declaration | `type ${1:Name}${2:<${3:T}>} = ${4:Variant1}(${5:T}) \| ${6:Variant2}` |
| `typeu` | Unit-variant sum type (enum-like) | `type ${1:Name} = ${2:First} \| ${3:Second} \| ${4:Third}` |
| `result` | Define & return a Result | `function ${1:name}(${2:args}): Result<${3:T}, ${4:E}> {\n  ${5:// ...}\n  return Ok(${6:value});\n}` |
| `okret` | Return Ok | `return Ok(${1:value});` |
| `errret` | Return Err | `return Err(${1:"error message"});` |
| `iface` | Interface declaration | `interface ${1:Name}${2:<${3:T}>} {\n  ${4:method}(${5:arg}: ${6:Type}): ${7:Return};\n}` |
| `fn?` | Function returning nullable | `function ${1:name}(${2:args}): ${3:Type}? {\n  ${4}\n  return null;\n}` |
| `??=` | Null-coalescing assign | `${1:value} ??= ${2:default};` |
| `genc` | Generic with constraint | `function ${1:name}<${2:T}: ${3:Constraint}>(${4:a}: ${2:T}, ${5:b}: ${2:T}): ${2:T} {\n  ${6}\n}` |
| `dyn` | dynamic-typed parse fn | `function ${1:parse}(${2:s}: string): dynamic {\n  ${3:return JSON.parse(s);}\n}` |

Each snippet has `scope: "superjs"` and a one-line `description`.

---

## 6. Language Configuration

File: `language-configuration.json`.

```json
{
  "comments": {
    "lineComment": "//",
    "blockComment": ["/*", "*/"]
  },
  "brackets": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["<", ">"]
  ],
  "autoClosingPairs": [
    { "open": "{", "close": "}" },
    { "open": "[", "close": "]" },
    { "open": "(", "close": ")" },
    { "open": "'", "close": "'", "notIn": ["string", "comment"] },
    { "open": "\"", "close": "\"", "notIn": ["string"] },
    { "open": "`", "close": "`", "notIn": ["string", "comment"] },
    { "open": "/*", "close": " */", "notIn": ["string"] }
  ],
  "surroundingPairs": [
    ["{", "}"], ["[", "]"], ["(", ")"],
    ["'", "'"], ["\"", "\""], ["`", "`"], ["<", ">"]
  ],
  "wordPattern": "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\s]+)",
  "indentationRules": {
    "increaseIndentPattern": "^.*(\\{[^}\"'`]*|\\([^)\"'`]*|\\[[^\\]\"'`]*|=>\\s*)$",
    "decreaseIndentPattern": "^\\s*[\\}\\]\\)].*$"
  },
  "onEnterRules": [
    {
      "beforeText": "^\\s*\\*\\s.*$",
      "action": { "indent": "none", "appendText": "* " }
    },
    {
      "beforeText": "^\\s*/\\*\\*(?!/)([^\\*]|\\*(?!/))*$",
      "action": { "indent": "none", "appendText": " * " }
    },
    {
      "comment": "After 'match expr {' indent the next line",
      "beforeText": "^\\s*match\\b.*\\{\\s*$",
      "action": { "indent": "indent" }
    }
  ]
}
```

**Note on `wordPattern`:** we *do not* include `?` as a word character. `T?` should be tokenized as two words (`T` and `?`) so double-click on `T` selects only the type name, not the nullable marker. This matches user intuition from Kotlin/Swift.

**Note on `<` `>` as brackets:** included so generic brackets get jump-to-match. Inherits the standard JS/TS pain (`a < b` triggers bracket pair); VS Code handles this gracefully and we accept the noise.

---

## 7. Testing Plan

### 7.1 Tooling

Use [`vscode-tmgrammar-test`](https://github.com/PanAeon/vscode-tmgrammar-test) — npm package that runs TextMate grammars against fixture files and asserts token scopes via inline annotations.

Install: `npm install --save-dev vscode-tmgrammar-test`.

Command (also wired into `package.json` scripts):
```
vscode-tmgrammar-test -s source.sjs -g syntaxes/superjs.tmLanguage.json -t "test/fixtures/*.sjs"
```

### 7.2 Fixture format

Each `.sjs` test fixture uses inline comments to assert scopes. Example `test/fixtures/01-sum-type.sjs`:

```sjs
type Result<T, E> = Ok(T) | Err(E)
//^ storage.type.sjs
//   ^ entity.name.type.declaration.sjs
//                  ^ keyword.operator.assignment.sjs
//                    ^ entity.name.type.variant.sjs
//                         ^ keyword.operator.type.union.sjs
//                           ^ entity.name.type.variant.sjs
```

The `//^` arrows point at column positions on the line above; the scope name is asserted to be present at that column.

### 7.3 Required test fixtures (minimum 10)

| # | File | Construct under test |
|---|------|----------------------|
| 1 | `01-sum-type-generic.sjs` | `type Result<T, E> = Ok(T) \| Err(E)` |
| 2 | `02-sum-type-payload.sjs` | `type Shape = Circle({ radius: number }) \| Rect({ w: number, h: number })` |
| 3 | `03-sum-type-units.sjs` | `type Color = Red \| Green \| Blue` |
| 4 | `04-match-basic.sjs` | `match r { Ok(v) => v, Err(e) => 0 }` |
| 5 | `05-match-destructure.sjs` | `match s { Circle({ radius }) => ..., Rect({ w, h }) => ... }` |
| 6 | `06-match-default.sjs` | `match x { 1 => "one", default => "other" }` |
| 7 | `07-nullable.sjs` | `const x: number? = null; function f(): User? { ... }` |
| 8 | `08-ternary-vs-nullable.sjs` | `const a = x ? 1 : 2; const b: number? = null;` (must NOT confuse the two) |
| 9 | `09-dynamic.sjs` | `function parse(s: string): dynamic { ... }` |
| 10 | `10-variant-ctor.sjs` | `const r = Ok(42); const e = Err("x"); const n = None;` |
| 11 | `11-generic-constraint.sjs` | `function max<T: Comparable<T>>(a: T, b: T): T { ... }` |
| 12 | `12-banned-keywords.sjs` | `const x: any = 1; namespace Foo {} enum E {}` |
| 13 | `13-interface.sjs` | `interface Comparable<T> { compareTo(other: T): number }` |
| 14 | `14-jsx.sjs` | `const el = <Foo bar={42}>{children}</Foo>` (should inherit TSX coloring) |
| 15 | `15-mixed.sjs` | Real-world ~50-line file combining classes, async/await, sum types, match |

### 7.4 CI

`.github/workflows/test.yml`:
```yaml
name: Test
on: [push, pull_request]
jobs:
  grammar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: vscode-extension
      - run: npm test
        working-directory: vscode-extension
```

### 7.5 Manual smoke test

Before each release, open `prototype/examples/**/*.sjs` in the Extension Development Host (F5) and visually verify:
- No regions of unstyled text where there should be color.
- Keywords like `match`, `type`, `dynamic` look like keywords (typically blue/purple).
- Sum-type variants (`Ok`, `Err`, etc.) look distinct from regular function calls.
- Banned `any`/`namespace`/`enum` appear muted/strike-through in popular themes (Dark+, One Dark Pro, Dracula).

---

## 8. Publishing Plan

### 8.1 Marketplace publisher setup

1. Create an Azure DevOps organization (free): https://dev.azure.com/
2. Create a Personal Access Token (PAT) with `Marketplace > Manage` scope.
3. Create publisher `hbarve1` at https://marketplace.visualstudio.com/manage
4. Store PAT in GitHub repo secret: `VSCE_PAT`.

### 8.2 Manual publish (first release)

```bash
cd vscode-extension
npm install
npm test
npx vsce login hbarve1            # enter PAT once
npx vsce package                  # produces superjs-syntax-0.1.0.vsix
npx vsce publish                  # uploads to marketplace
```

Also publish to Open VSX Registry (for VSCodium, Cursor, etc.):
```bash
npx ovsx publish superjs-syntax-0.1.0.vsix -p $OVSX_PAT
```

### 8.3 Automated publish on tag

`.github/workflows/publish.yml`:
```yaml
name: Publish
on:
  push:
    tags: ['vscode-v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: vscode-extension
      - run: npm test
        working-directory: vscode-extension
      - run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
        working-directory: vscode-extension
      - run: npx ovsx publish -p ${{ secrets.OVSX_PAT }}
        working-directory: vscode-extension
```

Tag convention: `vscode-v0.1.0`, `vscode-v0.2.0`, etc. (prefixed to distinguish from compiler tags).

### 8.4 README content (sketch)

Sections:
1. **Hero screenshot** — split-pane: SJS code on left, same code in Dark+ theme on right.
2. **Features bullet list** — Syntax highlighting for sum types, match, nullable, dynamic, snippets.
3. **Screenshots gallery** — 3 themes (Dark+, Light+, One Dark Pro) showing the same `15-mixed.sjs` fixture.
4. **Snippet table** — prefix → description.
5. **Roadmap** — link to Stage 3 LSP plans.
6. **Contributing** — link to monorepo CONTRIBUTING.md.
7. **License** — MIT.

Screenshots: place in `media/` (excluded from VSIX via `.vscodeignore` but referenced from README via relative paths — VS Code Marketplace fetches via the repo URL).

### 8.5 Version policy

- `0.x.y` while grammar is being iterated. Breaking scope renames bump minor.
- `1.0.0` when grammar is stable and matches the LSP phase's expected scope names.
- Patch releases for fixture-driven bug fixes.

---

## 9. Implementation Sprints

### Sprint 1 — Core Grammar (est. 8 hours)

| Task | Estimate |
|------|----------|
| Set up extension scaffold (`yo code` or manual) — package.json, language-configuration.json, README stub | 1h |
| Write grammar shell, `include: source.tsx` only, verify `.sjs` files inherit full TS coloring | 0.5h |
| Add `match` keyword rule + first match-expression begin/end block | 1.5h |
| Add `type X = A \| B(...)` sum-type declaration rule | 2h |
| Add `dynamic` keyword rule | 0.5h |
| Add banned-keyword rules (`any`, `namespace`, `enum`) with `invalid.deprecated.*` | 0.5h |
| Manual smoke test against `prototype/examples/types/*.sjs` and `prototype/examples/patterns/*.sjs` | 1h |
| Set up `vscode-tmgrammar-test`, write fixtures 1-6, all green | 1h |

**Done signal:** open `prototype/examples/` files in the Extension Development Host; sum types, match expressions, and banned keywords are visibly colored differently from plain TS.

### Sprint 2 — Edge Cases and Snippets (est. 6 hours)

| Task | Estimate |
|------|----------|
| Implement `T?` nullable suffix rule with the lookahead heuristic | 1.5h |
| Implement variant-constructor-in-value-position rules | 1h |
| Implement generic-constraint rule (`<T: Constraint>`) | 0.5h |
| Tune match-arm sub-grammar (destructuring patterns, default arm) | 1h |
| Write snippet file (§5) | 1h |
| Write fixtures 7-12, fix grammar bugs surfaced | 1h |

**Done signal:** all 12 fixtures green; ternary `a ? b : c` and nullable `x: T?` correctly disambiguated; PascalCase calls colored as variant constructors.

### Sprint 3 — Testing, Polish, Publish (est. 6 hours)

| Task | Estimate |
|------|----------|
| Design SVG file icons (light + dark) — simple `.sjs` mark | 1h |
| Add fixtures 13-15 (interface, JSX, mixed real-world) | 1h |
| Write README with screenshots from 3 themes | 1.5h |
| Set up CI workflow for tests | 0.5h |
| Set up publish workflow + GitHub secrets | 0.5h |
| Marketplace publisher registration, first manual publish v0.1.0 | 1h |
| Smoke-test installed extension on a clean VS Code profile | 0.5h |

**Done signal:** extension installable from Marketplace; opening any `prototype/examples/**/*.sjs` shows coloring matching the screenshots; CI badge green on README.

**Total: ~20 hours of focused work, achievable in 3-4 calendar days.**

---

## 10. Out of Scope (Phase 1 Scope Guard)

The following are **explicitly deferred** to Stage 3 (Language Server) and must NOT creep into this extension:

| Feature | Why deferred |
|---------|--------------|
| Type checking / diagnostics | Requires running the SJS type checker; that lives in the LSP. |
| Hover info (types, doc comments) | Needs type information; LSP only. |
| Go-to-definition, find-references | Needs a symbol index; LSP only. |
| Rename refactoring | Needs scope-aware analysis; LSP only. |
| Autocomplete / IntelliSense beyond snippets | Needs symbol table; LSP only. |
| Inlay hints | Needs type inference; LSP only. |
| Code actions / quick fixes | Needs diagnostics; LSP only. |
| Format-on-save | Needs the SJS formatter as a binary or service. Separate extension or LSP feature. |
| Debug adapter | Compile-to-JS sourcemaps + DAP protocol — large effort, separate roadmap item. |
| Workspace symbol search | LSP only. |
| Semantic highlighting | The LSP can publish semantic tokens that *override* our TextMate scopes (e.g., distinguishing a variant constructor `Foo` from a class `Foo` via real type info). Until then, our TextMate heuristics are the best we can do. |
| Telemetry | No. |
| Test runner integration | Separate extension. |

If any of the above sneaks into review, send it back. Phase 1 is grammar + snippets + config. That's it.

---

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `T?` rule false-positives on ternary | Medium | Cosmetic | Heavy fixture coverage in §7; live with rare glitches until LSP |
| PascalCase rule over-colors React components & classes | High | Minor (theme-dependent) | Document in README; LSP will correct via semantic tokens |
| TS grammar version drift in VS Code releases | Low | Could regress nested patterns | Pin a smoke-test against the latest VS Code stable in CI |
| Marketplace publisher name conflict | Low | Re-register | Reserve `hbarve1` publisher early in Sprint 3 |
| Snippet collisions with user prefixes | Low | Annoyance | Prefix-namespace if needed (`sjs-match`, `sjs-type`); start without prefix and iterate based on feedback |
| Performance: large `.sjs` files tokenize slowly | Low | UX | TextMate engine is fast; our additions are ~7 rules. Benchmark a 5000-line file before publish. |

---

## 12. Open Questions for Round 2

1. **File icon design** — keep generic `.sjs` letter mark, or commission a real logo?
2. **Snippet prefixes** — `match` vs `sjs-match`? Short wins on speed, namespaced wins on conflicts.
3. **`dynamic` color** — `support.type` (themed as built-in type) or `storage.type` (themed as keyword)? Visually try both.
4. **Should we ship a default color theme** that takes maximum advantage of our scopes? Probably no for v0.1 (forces theme choice on user); revisit at v1.0.
5. **Marketplace category** — only `Programming Languages` + `Snippets`, or also `Themes` if we add #4?
6. **License attribution** — TS grammar embedding requires MIT attribution; add to LICENSE or NOTICE file.

---

## 13. Acceptance Criteria for "Plan Approved → Build"

- [ ] All token scopes in §1 reviewed and agreed.
- [ ] Tricky-case regexes in §2.4 and §2.5 reviewed for correctness against ≥3 hand-traced examples each.
- [ ] Snippet list in §5 approved (additions/removals).
- [ ] Sprint estimates sanity-checked.
- [ ] Open questions in §12 resolved or explicitly deferred.

Once the boxes above are checked, Sprint 1 can begin.
