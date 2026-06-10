# ADR-009: `superjs doc` — Documentation Generation as First-Class CLI Command

**Status:** Accepted  
**Date:** 2026-06-10  
**Author:** Himank Barve

---

## Context

The JavaScript ecosystem has many documentation tools, all scattered:

| Tool | What it does | Problem |
|------|-------------|---------|
| JSDoc | Extracts `/** */` comments | No type awareness — types are strings in comments |
| TypeDoc | TypeScript-aware JSDoc | `any` leaks through; unsound types produce bad docs |
| documentation.js | Modern JSDoc | JS only, no TS |
| TSDoc | Comment standard | Standard only — no generator |
| Storybook | Component docs | UI only |
| Docusaurus | Static site | Manual — no code extraction |
| Compodoc | Angular-specific | Framework-specific |

None of these solve the real problem: **the documentation is as sound as the type system**. TypeScript's `any` means a function typed `(x: any) => any` generates useless docs. Intersection types generate unreadable output. `T | undefined | null | ""` on every return type is noise.

SJS's sound type system changes this completely:
- Every type is exact — no `any`, no soundness holes
- `T?` is the only nullable form — docs say "may be null" with certainty
- `Result<T, E>` return types are self-documenting — docs show both the success and failure types
- Sum type variants are first-class — docs enumerate every variant
- Structural interfaces are explicit — docs show "these 5 types satisfy `Serializable`"
- Exhaustiveness is compiler-proven — a `match` in a code example is guaranteed to cover all cases

`superjs doc` treats documentation generation as a **compiler output** — not a post-processing step.

---

## Decision

Add `superjs doc` as a first-class CLI command, backed by `@superjs/doc-gen` lib (Tier 4).

`superjs doc` is to SJS what `go doc` is to Go and `cargo doc` is to Rust — built in, zero config, type-system-aware.

---

## What `superjs doc` Does

### Basic usage

```bash
# Generate HTML docs for current project
superjs doc

# Generate and serve locally
superjs doc --serve

# Generate for a specific package
superjs doc --source packages/stdlib/

# Output formats
superjs doc --format html     # default — full site
superjs doc --format md       # Markdown (for GitHub wikis, Docusaurus import)
superjs doc --format json     # machine-readable (for custom tooling)

# Watch mode
superjs doc --watch --serve

# Private members included
superjs doc --include-private

# Generate for a specific symbol
superjs doc --symbol Result
superjs doc --symbol "List.map"
```

### Terminal docs (like `go doc`)

```bash
# Print docs for a symbol inline in terminal
superjs doc Result
superjs doc List.map
superjs doc @superjs/std-core
```

---

## What Gets Extracted

### From types alone (zero comments needed)

```sjs
function divide(a: number, b: number): Result<number, string>
```

Generated doc (even with no comment):
```
divide(a: number, b: number): Result<number, string>

Returns Ok(number) on success.
Returns Err(string) on failure.
```

The type signature IS the documentation for most functions. `superjs doc` extracts:

1. **Function signature** — parameter names, types, return type, exact nullability
2. **Result unwrap paths** — for `Result<T,E>` return types, shows both Ok and Err cases
3. **Sum type variants** — every variant with its payload types
4. **Interface implementations** — which types in scope satisfy this interface
5. **Null safety** — marks return types as "never null" or "may be null" (from `T?`)
6. **Generic constraints** — type parameter bounds
7. **Throws** — `panic` call sites are noted (unlike `throws` in Java, this is compiler-detected)

### From doc comments (`/** */`)

SJS doc comments follow a minimal subset of JSDoc — no `@param {type}` needed (types come from the checker):

```sjs
/**
 * Divides two numbers.
 *
 * @example
 * const result = divide(10, 2)
 * match result {
 *   Ok(n)  => console.log(n),   // 5
 *   Err(e) => console.error(e),
 * }
 *
 * @since 1.0.0
 * @see multiply
 */
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}
```

Tags supported:

| Tag | Notes |
|-----|-------|
| `@example` | Code block — validated by compiler; shown runnable in playground |
| `@param name` | Description only — type comes from checker |
| `@returns` | Description only — type comes from checker |
| `@since` | Version string |
| `@deprecated` | Marks symbol deprecated; emits SJS-W in consumers |
| `@see` | Cross-reference to another symbol |
| `@internal` | Marks symbol as internal; excluded from public docs by default |
| `@experimental` | Marks symbol as experimental |

No `@param {type}` — type annotation in comment is **banned**. Types live in code, not comments.

---

## Architecture

`libs/doc-gen/` is a Tier 4 lib that depends on `@superjs/compiler` (the full Tier 3 API):

```
@superjs/doc-gen
  src/
    extractor/
      symbol-extractor.ts    walks TypedAST, extracts all exportable symbols
      comment-parser.ts      parses /** */ doc comments
      example-validator.ts   compiles @example blocks, flags errors
      impl-finder.ts         finds all types satisfying a given interface
    renderer/
      html.ts                generates HTML site (Tailwind, search, dark mode)
      markdown.ts            generates .md files
      json.ts                machine-readable output schema
      terminal.ts            inline terminal output (for superjs doc <symbol>)
    schema/
      doc-node.ts            DocNode, DocParam, DocVariant, DocExample types
    index.ts                 public API: extract(compiledProject) → DocTree
```

### Why Tier 4 (not Tier 0/1)

`doc-gen` needs `typeAt()` from `@superjs/compiler` to resolve types for every symbol. It runs the full type checker. This is correct — documentation accuracy requires the same level of analysis as the type checker.

The formatter (also Tier 4) only needs `parser` — it does not type-check. Doc-gen is different: it needs full type information to produce accurate docs.

### `@example` block validation

Every `@example` block is compiled by the checker. If the example has a type error, `superjs doc` emits a warning:

```
SJS-W015: @example block in divide() has type error on line 3:
  match result {
    Ok(n)  => console.log(n),
    // Err arm missing — SJS-E009: non-exhaustive match
```

This makes documentation examples **correct by construction** — the compiler validates them, not a human reviewer.

---

## Output: HTML Site

`superjs doc --format html` produces a self-contained static site:

```
docs-output/
  index.html           package overview
  symbols/
    divide.html        one page per exported symbol
    Result.html
    List.html
    List.map.html      nested symbol pages
  interfaces/
    Serializable.html  + "implemented by" section listing all satisfying types
  variants/
    Shape.html         sum type with all variants documented
  search.json          pre-built search index (Pagefind-compatible)
  assets/
    style.css
    search.js
```

Features:
- Full-text search (client-side, Pagefind)
- Dark mode
- Mobile-responsive
- `@example` blocks shown with syntax highlighting + "Run in playground" link
- "Implemented by" section on interface pages
- "Used by" section (which exported functions take this type as parameter)
- Breadcrumb navigation
- Source link (links to line in GitHub)

---

## Output: JSON Schema

`superjs doc --format json` outputs a machine-readable `doc-tree.json`:

```json
{
  "package": "@superjs/std-core",
  "version": "1.0.0",
  "symbols": [
    {
      "name": "divide",
      "kind": "function",
      "signature": "(a: number, b: number) => Result<number, string>",
      "params": [
        { "name": "a", "type": "number", "nullable": false, "description": null },
        { "name": "b", "type": "number", "nullable": false, "description": null }
      ],
      "returns": {
        "type": "Result<number, string>",
        "ok": "number",
        "err": "string"
      },
      "nullable": false,
      "description": "Divides two numbers.",
      "examples": [{ "code": "...", "valid": true }],
      "since": "1.0.0",
      "deprecated": false,
      "internal": false,
      "sourceFile": "src/math.sjs",
      "sourceLine": 12
    }
  ]
}
```

This enables third-party tooling to build on SJS docs without parsing source files.

---

## Integration Points

### Website (`apps/website/`)

The website's API reference page is generated by `tools/doc-gen/` (the website content generator) which calls `@superjs/doc-gen` internally and imports the JSON output into Next.js pages.

### VS Code extension

The hover tooltip in the VS Code extension uses the same extractor as `superjs doc` — hover shows the doc comment + type signature from `@superjs/doc-gen`'s extractor, not just raw type info.

### `superjs explain`

`superjs explain SJS-E001` is backed by `@superjs/diagnostics` (separate from `@superjs/doc-gen`). Doc-gen handles user code docs; diagnostics handles compiler error docs.

### Playground

`@example` blocks in docs link to the playground with the code pre-filled.

---

## Comparison: `superjs doc` vs Existing Tools

| Feature | JSDoc | TypeDoc | `superjs doc` |
|---------|-------|---------|--------------|
| Type-aware | No | Partial (any leaks) | Yes — sound types |
| Null safety in docs | No | No | Yes — T? explicit |
| Result<T,E> rendered | No | No | Yes — Ok/Err shown |
| Sum type variants | No | No | Yes — all variants |
| Interface implementations | No | Partial | Yes — structurally found |
| @example validation | No | No | Yes — compiled by checker |
| @param type annotation | Required | Required | Banned — from code |
| Terminal output | No | No | Yes (`superjs doc Symbol`) |
| Zero config | No | No | Yes |
| Built into toolchain | No | No | Yes |

---

## Monorepo Placement

In ADR-008's tier model:

```
libs/doc-gen/     @superjs/doc-gen    Tier 4    [stub — Stage 3]
```

Added alongside `lsp/`, `formatter/`, `linter/` — all Tier 4 tools that use `@superjs/compiler`.

`tools/doc-gen/` (website content generator) is a separate internal tool — it calls `@superjs/doc-gen` but is not published.

---

## CLI integration

`superjs doc` is a new top-level subcommand in `apps/cli`:

```
superjs doc  [--source <dir>]  [--outDir <dir>]  [--format html|md|json]
             [--serve]  [--watch]  [--include-private]  [--symbol <name>]
             [--port <n>]
```

Added to Stage 3 scope — ships alongside the formatter and linter as part of the DX tools stage.

---

## Success Criteria

- `superjs doc` generates HTML docs for `@superjs/std-core` with zero config
- Every `@example` block in stdlib is validated by the checker (zero invalid examples at ship)
- Terminal `superjs doc Result` prints clean output in < 200 ms
- JSON output validates against published schema
- VS Code hover uses same extractor (consistent with CLI output)
- `doc-tree.json` format is stable and versioned (semver bump on breaking schema changes)
