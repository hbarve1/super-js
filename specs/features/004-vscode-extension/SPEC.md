# Feature 004: VS Code Extension — Canonical Spec

**Status:** Round 2 plan complete. Ready for implementation.
**Phase:** 1 — Syntax highlighting only (no LSP, no diagnostics, no formatter binding).
**Deliverable:** Publishable `superjs-syntax` extension on VS Code Marketplace + Open VSX.

---

## Goal

`.sjs` files open in VS Code with correct, idiomatic syntax coloring. All SuperJS-specific syntax (sum types, `match`, nullable `T?`, `dynamic`, variant constructors) is tokenized into stable, theme-friendly TextMate scopes. Everything that is standard JS/TS reuses the TypeScript grammar. Small snippet set for high-leverage constructs.

---

## Scope Guard (Phase 1)

Out of scope until LSP phase: type checking, diagnostics, hover, go-to-definition, autocomplete, rename, formatter, debug adapter, telemetry, semantic highlighting, color theme.

---

## Extension Directory Layout

```
vscode-extension/
  package.json                          complete manifest
  language-configuration.json          brackets, comments, auto-close
  syntaxes/
    superjs.tmLanguage.json            TextMate grammar
  snippets/
    superjs.code-snippets              13 snippets
  test/
    fixtures/                          25+ .sjs fixture files
    suite/
      grammar.test.ts                  vscode-textmate direct test runner
  icons/
    sjs-file.svg                       128x128 SVG (light theme)
    sjs-file-dark.svg                  128x128 SVG (dark theme)
    sjs-marketplace.png                128x128 PNG for marketplace tile
  media/
    screenshot-dark.png                README screenshot (Dark+)
    screenshot-light.png               README screenshot (GitHub Light)
    screenshot-one-dark-pro.png        README screenshot (One Dark Pro)
  .github/workflows/
    test.yml                           on push/PR (OS matrix)
    publish.yml                        on vscode-v* tag
  .vscodeignore
  CHANGELOG.md
  LICENSE
  NOTICE                               TS grammar MIT attribution
  README.md
  tsconfig.json                        test suite only (no runtime TS)
```

---

## Grammar Architecture

### Core principle

`source.sjs` is defined as a grammar whose top-level `patterns` array applies SJS-specific rules first, then falls through to `{ "include": "source.tsx" }`. We do not fork the TypeScript grammar; we extend it.

### Grammar skeleton

```jsonc
{
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
    "sjs-banned-keywords": { ... },
    "sjs-sum-type-decl": { ... },
    "sjs-match-expression": { ... },
    "sjs-dynamic-type": { ... },
    "sjs-nullable-suffix": { ... },
    "sjs-variant-constructor": { ... },
    "sjs-generic-constraint": { ... }
  }
}
```

All `.sjs` files are parsed as TSX-flavored (embeds `source.tsx` not `source.ts`) — JSX is a supported SJS feature.

---

## Token Rules (All Corrected — Round 2)

### 1. `sjs-nullable-suffix` — `T?`

**Scope:** `keyword.operator.optional.sjs`

**Regex:** `(?<=[A-Za-z0-9_$\]>)])\?(?=\s*[,;)\]}>|&{])`

Key: lookbehind is a character class (fixed-length, valid in Oniguruma). Lookahead requires a type-position terminator including `{` (for `f(): User? {`). Does NOT include bare `$` or `=` to avoid ternary false-positives.

**Acceptance cases:**
| Input | Expected |
|---|---|
| `const x: number? = null` | `?` matched |
| `function f(): User? {` | `?` matched (terminator `{`) |
| `const y = x ? a : b` | `?` NOT matched (next is `a`) |
| `fn()?.bar` | `?` NOT matched (next is `.`) |
| `cond ?\n  doThing()` | `?` NOT matched |

**JSON:**
```json
"sjs-nullable-suffix": {
  "match": "(?<=[A-Za-z0-9_$\\]>)])\\?(?=\\s*[,;)\\]}>|&{])",
  "name": "keyword.operator.optional.sjs"
}
```

---

### 2. `sjs-variant-constructor` — `Ok(42)`, `None`

**Scopes:** `entity.name.function.constructor.variant.sjs` (with payload), `entity.name.function.constructor.variant.unit.sjs` (standalone)

**Tuple variant constructor** (requires `(`):
```json
{
  "match": "(?<![A-Za-z0-9_$@.])([A-Z][A-Za-z0-9_$]*)\\s*(?=\\()",
  "captures": { "1": { "name": "entity.name.function.constructor.variant.sjs" } }
}
```

**Unit variant** (NOT followed by `(`, `<`, or `.`):
```json
{
  "match": "(?<![A-Za-z0-9_$@:.])([A-Z][A-Za-z0-9_$]*)\\b(?!\\s*[(<.])",
  "captures": { "1": { "name": "entity.name.function.constructor.variant.unit.sjs" } }
}
```

Key changes from Round 1: `@` added to negative lookbehind (excludes decorators); `:` added to unit-variant lookbehind (excludes type annotation position); `.` added to unit-variant lookahead (excludes `Math.PI`).

**Known limitations (accepted for v0.1):** `new MyClass()` — `MyClass` over-colors as variant constructor. `class Foo extends Bar` — `Bar` gets unit-variant scope. `import { Foo }` — `Foo` may get unit-variant scope. These will be corrected by semantic tokens in the LSP phase.

---

### 3. `sjs-match-expression` — `match expr { ... }`

**Scope:** `keyword.control.match.sjs`, `meta.match.sjs`, `meta.match.body.sjs`

**Begin pattern:** `(?<![.\\w])(match)(?=\\s+[^({=\\s])`

This excludes:
- `obj.match(...)` — negative lookbehind for `.` and word chars
- `function match()` — lookahead excludes `(`
- `match = ...` — lookahead excludes `=`
- `match { ... }` (bare object, no scrutinee) — lookahead excludes `{`

**Match body** contains `sjs-match-arm` rules:
- `default` arm: `\b(default)\b\s*(=>)` with `keyword.control.default.sjs` and `keyword.operator.match.arrow.sjs`
- Pattern arms: begin `(?=[A-Z_a-z0-9$"'\`\-\[])`, end `(?=,|\})`, with pattern + `=>` + body sub-rules

**JSON skeleton:**
```json
"sjs-match-expression": {
  "begin": "(?<![.\\w])(match)(?=\\s+[^({=\\s])",
  "beginCaptures": { "1": { "name": "keyword.control.match.sjs" } },
  "end": "(?<=\\})",
  "name": "meta.match.sjs",
  "patterns": [
    { "comment": "scrutinee", "begin": "(?<=match\\s)", "end": "(?=\\{)", "patterns": [{ "include": "source.tsx#expression" }] },
    { "comment": "match body", "begin": "\\{", "end": "\\}", "name": "meta.match.body.sjs",
      "patterns": [{ "include": "#sjs-match-arm" }] }
  ]
}
```

---

### 4. `sjs-sum-type-decl` — `type Result<T,E> = Ok(T) | Err(E)`

**Scopes:** `storage.type.sjs` (`type`), `entity.name.type.sjs` (type name), `meta.type.parameters.sjs` (`<T,E>`), `entity.name.type.variant.sjs` (variants with payload), `entity.name.type.variant.unit.sjs` (unit variants)

**End pattern** expanded to cover all statement-starting keywords (prevents grammar consuming subsequent code):
```
(?=;|^\s*\n|^\s*(?:type|function|const|let|var|class|interface|export|import|return|throw|if|else|switch|for|while|do|try|catch|finally|async|await|yield|new|void|break|continue|@)\b)
```

---

### 5. `sjs-dynamic-type` — `dynamic`

**Scope:** `support.type.dynamic.sjs` (themes like built-in types, not keywords)

```json
"sjs-dynamic-type": {
  "match": "\\b(dynamic)\\b(?=\\s*[,;=)\\]\\}>|&]|$)",
  "captures": { "1": { "name": "support.type.dynamic.sjs" } }
}
```

---

### 6. `sjs-banned-keywords` — `any`, `namespace`, `enum`

**Scopes:** `invalid.deprecated.any.sjs`, `invalid.deprecated.namespace.sjs`, `invalid.deprecated.enum.sjs`

`any` uses three bounded lookbehind alternatives (Oniguruma supports `{0,10}` in lookbehind):
```json
[
  { "match": "(?<=:\\s{0,10})\\b(any)\\b(?=\\s*[,;)\\]}>|&\\n])", "captures": { "1": { "name": "invalid.deprecated.any.sjs" } } },
  { "match": "(?<=<\\s{0,10})\\b(any)\\b(?=\\s*[,;)\\]}>|&\\n])", "captures": { "1": { "name": "invalid.deprecated.any.sjs" } } },
  { "match": "(?<=[|,]\\s{0,10})\\b(any)\\b(?=\\s*[,;)\\]}>|&\\n])", "captures": { "1": { "name": "invalid.deprecated.any.sjs" } } }
]
```

Key: `const any = something()` does NOT fire — no preceding `:`, `<`, `|`, or `,`.

---

### 7. `sjs-generic-constraint` — `<T: Comparable<T>>`

**Scopes:** `entity.name.type.parameter.sjs` (T), `keyword.operator.type.constraint.sjs` (`:`)

Lookbehind `(?<=[<,]\\s{0,5})` covers both first (`<T: A`) and subsequent params (`<T: A, U: B>`).

```json
"sjs-generic-constraint": {
  "begin": "(?<=[<,]\\s{0,5})([A-Za-z][A-Za-z0-9_$]*)\\s*(:)(?!:)",
  "beginCaptures": {
    "1": { "name": "entity.name.type.parameter.sjs" },
    "2": { "name": "keyword.operator.type.constraint.sjs" }
  },
  "end": "(?=[,>])",
  "patterns": [{ "include": "source.tsx#type" }]
}
```

---

## Scope Names (Canonical — Round 2 Corrections)

| Scope | Use |
|---|---|
| `storage.type.sjs` | `type` keyword in sum-type decl |
| `entity.name.type.sjs` | type name (e.g., `Result`) |
| `keyword.control.match.sjs` | `match` keyword |
| `keyword.control.default.sjs` | `default` arm in match body |
| `keyword.operator.match.arrow.sjs` | `=>` in match arms |
| `keyword.operator.optional.sjs` | `?` nullable suffix (NOT `.nullable.`) |
| `keyword.operator.type.union.sjs` | `|` in type declarations |
| `keyword.operator.type.constraint.sjs` | `:` in generic constraint |
| `support.type.dynamic.sjs` | `dynamic` keyword (NOT `storage.type`) |
| `invalid.deprecated.any.sjs` | `any` in type position |
| `invalid.deprecated.namespace.sjs` | `namespace` |
| `invalid.deprecated.enum.sjs` | `enum` |
| `entity.name.function.constructor.variant.sjs` | `Ok(...)`, `Err(...)` |
| `entity.name.function.constructor.variant.unit.sjs` | `None`, `Red`, `Empty` standalone |
| `entity.name.type.variant.sjs` | variant name in type declaration |
| `entity.name.type.variant.unit.sjs` | unit variant in type declaration |
| `entity.name.type.parameter.sjs` | `T`, `U` in generic constraint |
| `meta.type.parameters.sjs` | `<T, E>` block |
| `meta.match.sjs` | outer match expression |
| `meta.match.body.sjs` | `{ }` block of match |

---

## `package.json` Key Fields

```json
{
  "name": "superjs-syntax",
  "publisher": "hbarve1",
  "version": "0.1.0",
  "engines": { "vscode": "^1.85.0" },
  "extensionKind": ["ui"],
  "activationEvents": ["onLanguage:superjs"],
  "contributes": {
    "languages": [
      {
        "id": "superjs",
        "aliases": ["SuperJS", "sjs"],
        "extensions": [".sjs"],
        "configuration": "./language-configuration.json",
        "icon": { "light": "./icons/sjs-file.svg", "dark": "./icons/sjs-file-dark.svg" }
      },
      {
        "id": "json",
        "filenames": ["superjs.config.json"]
      }
    ],
    "jsonValidation": [
      { "fileMatch": "superjs.config.json", "url": "./schemas/superjs.config.schema.json" }
    ],
    "grammars": [{ "language": "superjs", "scopeName": "source.sjs", "path": "./syntaxes/superjs.tmLanguage.json" }],
    "snippets": [{ "language": "superjs", "path": "./snippets/superjs.code-snippets" }]
  },
  "devDependencies": {
    "@vscode/vsce": "^2.24.0",
    "vscode-textmate": "^9.0.0",
    "oniguruma": "^7.0.1"
  }
}
```

Key decisions:
- `extensionKind: ["ui"]` — enables vscode.dev (browser VS Code); grammar-only extensions have no Node.js API calls
- Omit `"main"` field entirely — `vsce` warns on `null`; omitting it means declarative-only extension
- No `embeddedLanguages` in grammar contributes — that field requires the scope to actually be emitted; none of our scopes are "embedded language" scopes

---

## Snippets (13 total)

| Trigger | Description |
|---|---|
| `match` | Match expression with two arms |
| `matchres` | Match a `Result<T, E>` |
| `matchopt` | Match an `Option<T>` / nullable |
| `type` | Sum type declaration |
| `typeu` | Unit-variant sum type (enum-like) |
| `result` | Define function returning Result |
| `okret` | Return Ok |
| `errret` | Return Err |
| `iface` | Interface declaration |
| `fnopt` | Function returning nullable (renamed from `fn?`) |
| `genc` | Generic with constraint |
| `dyn` | dynamic-typed function |
| `asyncres` | async function returning Result |

Dropped `??=` (trigger identical to expansion; never fires). Renamed `fn?` to `fnopt` (safer across keyboard configs).

---

## `language-configuration.json` Key Fields

- `comments`: `//` line, `/* */` block
- `brackets`: `{}`, `[]`, `()`, `<>`
- `autoClosingPairs`: includes `/* */`, `'`, `"`, backtick
- `autoCloseBefore`: `;:.,=}])>\`` — prevents double-closing
- `onEnterRules`: indent after `match expr {`

---

## Testing Strategy

### Tooling

Use `vscode-textmate` (the engine, maintained by Microsoft) + `vscode-oniguruma` directly. Do NOT use `vscode-tmgrammar-test` (unmaintained since late 2024).

Test runner (`test/suite/grammar.test.ts`):
1. Load Oniguruma WASM
2. Create `Registry` with `loadGrammar` returning `source.sjs` and a pinned copy of `source.tsx`
3. Tokenize each fixture file
4. Compare token ranges + scopes against snapshots (`*.sjs.snap` JSON files)
5. On first run with `UPDATE_SNAPSHOTS=1`: write snapshots. Subsequent runs: compare.

### Required Fixtures (25 minimum)

| # | File | Construct |
|---|---|---|
| 1 | `01-sum-type-generic.sjs` | `type Result<T, E> = Ok(T) \| Err(E)` |
| 2 | `02-sum-type-payload.sjs` | struct variant `Circle { radius: number }` |
| 3 | `03-sum-type-units.sjs` | `type Color = Red \| Green \| Blue` |
| 4 | `04-match-basic.sjs` | `match r { Ok(v) => v, Err(e) => 0 }` |
| 5 | `05-match-destructure.sjs` | struct destructuring in match arm |
| 6 | `06-match-default.sjs` | `match x { 1 => "one", default => "other" }` |
| 7 | `07-nullable-basic.sjs` | `const x: number? = null` |
| 8 | `08-nullable-return.sjs` | `function f(): User? {` — `?` before `{` |
| 9 | `09-ternary-vs-nullable.sjs` | ternary `?` not matched |
| 10 | `10-ternary-newline.sjs` | multiline ternary `?` not matched |
| 11 | `11-dynamic.sjs` | `function parse(s: string): dynamic` |
| 12 | `12-variant-ctor.sjs` | `Ok(42)`, `Err("x")`, `None` in value position |
| 13 | `13-none-match-arm.sjs` | `None =>` in match arm colored correctly |
| 14 | `14-generic-constraint-single.sjs` | `<T: Comparable<T>>` |
| 15 | `15-generic-constraint-multi.sjs` | `<T: A, U: B>` both colored |
| 16 | `16-banned-keywords.sjs` | `const x: any = 1; namespace Foo {}; enum E {}` |
| 17 | `17-any-variable.sjs` | `const any = something()` — NOT flagged |
| 18 | `18-function-match.sjs` | `function match(x) { ... }` — `match` NOT keyword |
| 19 | `19-decorator.sjs` | `@Injectable()` — NOT colored as variant |
| 20 | `20-class-extends.sjs` | `class Foo extends Bar {}` — known limitation documented |
| 21 | `21-import-binding.sjs` | `import { Ok, Err, None }` — known limitation documented |
| 22 | `22-interface.sjs` | interface declaration |
| 23 | `23-jsx.sjs` | `<Foo bar={42}>{children}</Foo>` — TSX inheritance |
| 24 | `24-sum-type-followed-by-return.sjs` | `type T = A \| B\nreturn Ok(42)` — end-pattern fix |
| 25 | `25-mixed-real-world.sjs` | 50-line integration: classes, async/await, sum types, match, nullable |

### CI

`.github/workflows/test.yml` — OS matrix: `ubuntu-latest`, `macos-latest`, `windows-latest`. Run `npm test` in `vscode-extension/`.

### Manual smoke test

Before each release: open `prototype/examples/**/*.sjs` in Extension Development Host (F5). Check 5 themes: Dark+, Light+, One Dark Pro, GitHub Light, Dracula.

---

## Publishing Plan

### Sprint 0 (2h) — MUST be done before Sprint 1

1. **VS Code Marketplace:** Create Azure DevOps account, generate PAT with `Marketplace > Manage` scope, register publisher ID `hbarve1` at `marketplace.visualstudio.com/manage/createpublisher`, store PAT as GitHub secret `VSCE_PAT`
2. **Open VSX:** Authenticate at `open-vsx.org` with GitHub OAuth, claim namespace `hbarve1`, store token as `OVSX_PAT`

**Done signal:** `npx vsce ls-publishers` shows `hbarve1`.

### Manual first publish

```bash
cd vscode-extension
npm ci && npm test                   # all 25 fixtures must pass
npx vsce package                     # superjs-syntax-0.1.0.vsix
npx vsce publish -p $VSCE_PAT
npx ovsx publish superjs-syntax-0.1.0.vsix -p $OVSX_PAT
```

### Automated publish

`.github/workflows/publish.yml` — triggers on `vscode-v*` tags. Runs `npm test` then `vsce publish` + `ovsx publish`.

---

## Sprint Plan (~35h)

| Sprint | Scope | Hours |
|---|---|---|
| 0 | Publisher registration (VS Code Marketplace + Open VSX) | 2h |
| 1 | Core grammar: `match`, sum-type decl, `dynamic`, banned keywords, test harness, fixtures 1–6 | 10h |
| 2 | Edge cases: `T?`, variant constructors, generic constraints, match-arm sub-grammar, `superjs.config.json`, fixtures 7–25 | 10h |
| 3 | Snippets, language-config, icons (SVG + PNG), theme screenshots, README | 8h |
| 4 | CI finalization, manual publish, tag `vscode-v0.1.0`, verify listings | 5h |

**Sprint 0 blocks Sprint 4 — must be done first.**

**Sprint 1 done signal:** fixtures 1–6 pass; `function match(x)` does not trigger keyword.

**Sprint 2 done signal:** all 25 fixtures green; `None =>` colored; `): User? {` highlighted; `<T: A, U: B>` both constraints colored; `const any = 1` not flagged.

**Sprint 4 done signal:** extension listed on Marketplace and Open VSX; CI green; clean-profile install smoke test passes.

---

## Known Limitations (Accepted for v0.1)

| Limitation | Root cause | Planned fix |
|---|---|---|
| `new MyClass()` — `MyClass` gets variant-constructor scope | Space before PascalCase can't be excluded with fixed-length lookbehind | Semantic tokens (LSP phase) |
| `class Foo extends Bar` — `Bar` gets unit-variant scope | `extends ` is variable-length prefix | Semantic tokens |
| `import { Foo }` — `Foo` may get unit-variant scope | Same | Semantic tokens |
| `<MyType>value` cast treated as JSX | TSX grammar behavior | Language spec prefers `value as MyType` |
| Material Icon Theme overrides file icon | Third-party extension; no SJS entry yet | Open PR to Material Icon Theme in v0.2 |
