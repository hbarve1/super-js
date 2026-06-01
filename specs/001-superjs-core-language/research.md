# Phase 0 Research: Super.js Core Language

**Branch**: `001-superjs-core-language` | **Date**: 2026-05-26

---

## 1. Incremental Compilation & Watch Mode

### Decision: Content-hash dependency graph + chokidar + topological sort recompilation
**Rationale**: Matches the approach used by TypeScript, esbuild, and Rollup. Satisfies FR-012 and SC-004 (sub-1s recompile) for the stated scope (< 100 files). Content hashes avoid false recompilation on no-op saves; reverse-dependency graph gives the exact affected-file set; topological sort gives a safe, correct recompile order that handles cascading changes without redundant work.

**Alternatives considered**:
- Full rebuild on any change — simplest but violates FR-012
- Raw `fs.watch` — unreliable across macOS/Linux/Windows, misses events under load
- Merkle tree (Bazel/Buck) — overengineered for < 100 files

### Dependency Tracking
After each compilation, persist a `superjs.buildinfo` JSON file with:
```
{ files: { [absPath]: { contentHash, imports: string[], outputHash } } }
```
On watch events, hash the changed file, compare to stored hash, and if different, mark it dirty. Walk the reverse import map to find all transitively affected files. The import set is collected during the Babel traverse step (existing `ImportDeclaration` + `require()` call nodes).

### File Watching
**chokidar** is the de-facto standard (webpack, Rollup, Jest, Vite all use it). Watch `**/*.sjs` with a 50–100ms debounce to coalesce editor writes. `persistent: true` keeps the watcher alive across recompilations. `fs.watch` natively is acceptable for the zero-dependency compiler backend prototype only.

### Cascading Recompilation Algorithm
1. Build a `reverseImports` map at startup: `reverseImports[B] = [A, C, ...]`
2. On change to B: start worklist `{B}`, walk reverse-imports transitively → dirty set
3. Topological sort dirty set (Kahn's algorithm / BFS from nodes with no dirty deps)
4. Compile in topological order; if B fails, mark its dependents as "blocked" (not compiled with stale types)
5. Circular imports: any node remaining with non-zero in-degree after Kahn's = cycle → report diagnostic, refuse to compile cycle members

---

## 2. Type Inference Algorithm

### Decision: Bidirectional type checking with gradual typing (consistency-based `any`)
**Rationale**: For a JavaScript superset requiring fast compilation, `any` as an escape hatch, and progressive adoption, bidirectional type checking offers the best balance of predictability, implementation simplicity, and adoption ergonomics. It avoids Hindley-Milner's global constraint solving (incompatible with subtyping and `any`) while being more precise than TypeScript's purely local inference.

**Alternatives considered**:
- **Hindley-Milner** — cannot handle subtyping or `any` without major extensions; errors surface far from their cause; not suitable for JS superset
- **TypeScript's full model** — viable but carries legacy complexity; we can adopt the same user-facing ergonomics with a cleaner implementation
- **Flow's inter-procedural inference** — stricter soundness but slower compilation and harder-to-understand errors

### Algorithm Details
**Bidirectional type checking** works in two passes:
- **Synthesis (bottom-up)**: infer a type from an expression
- **Checking (top-down)**: verify an expression against an expected type (e.g., from an annotation)

This is modular (each function body checked independently), produces local errors, and scales well. More annotations required at function boundaries than pure HM — but for a JS superset this is a feature, since annotations are already part of the user model.

### Gradual Typing Integration
Treat `any` as a *dynamic type* that is *consistent* with every other type (Siek & Taha gradual typing theory):
- `T ~ any` and `any ~ T` for all `T` (consistency)
- `number ~ string` is false (consistency ≠ equality)
- Untyped variables → `any`; operations on `any` produce `any` without errors
- Typed/untyped boundaries may emit optional runtime coercion checks (configurable strictness)
- **Require annotations at function parameter and return type positions** to keep inference local and fast; infer everything within function bodies

---

## 3. Compiler Error Messages

### Decision: Rust-inspired diagnostic model with Elm's conversational tone
**Rationale**: Rust's diagnostic system is the current industry benchmark — layered severity, source spans, error codes, machine-readable output. Elm proved that compiler voice and tone lower the barrier for newcomers. Combined, they yield messages that are structurally rich and emotionally safe. TypeScript's known anti-pattern (most generic info first, specific detail buried in nested type traces) is explicitly avoided.

**Alternatives considered**:
- Clang/LLVM — precise and structured but terse and tuned for C/C++ toolchain consumers, not JS developers
- TypeScript — good bones (error codes, locations) but widely criticized for unhelpful ordering of information
- GCC fix-it hints — useful inspiration for the `suggestion` field only

### Key Principles (7)
1. **Most specific information first** — lead with the exact token/span, not the error category
2. **Separate severity levels** — `error`, `warning`, `note`, `help` (Clang hierarchy)
3. **Stable, typed error codes** — `SJS-E001` format; permanent, never reused, link to docs
4. **Conversational, non-blaming tone** — first person ("I found…", "I expected…"); Elm model
5. **Always include a suggested fix** — `help` annotation is non-optional; if no auto-fix, explain the required action
6. **Caret / span highlighting** — column-precise visual underlines pointing at offending range
7. **Machine-readable alongside human-readable** — SARIF-compatible JSON emission for editor/CI integration

### Diagnostic Structure
```
Diagnostic {
  code:        "SJS-E001"                     // stable namespaced id
  severity:    error | warning | note | help
  message:     "I expected a number here but found a string"
  location:    { file, line, column, endLine, endColumn }
  span:        source text excerpt + caret underline
  suggestion:  { description, replacement }   // optional, auto-fixable
  notes:       Diagnostic[]                   // chained child diagnostics
  docs_url:    "https://superjs.dev/errors/SJS-E001"
}
```
