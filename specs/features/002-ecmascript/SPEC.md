# Feature 002 — ECMAScript Type Coverage

**Status:** Stage 1 — in progress  
**Goal:** Full ES5–ES2025 type-checking coverage in the SJS compiler.

## Scope

Every ECMAScript language feature must be understood by the SJS type checker:
- Syntactically parsed without error
- Type-checked with correct inference and narrowing
- Lowered correctly to output JS

Coverage is tracked per ES year in `specs/ecmascript/` (ES5 through ES2025), each with a feature table showing prototype status and compiler target.

## Current Status

**Prototype (backends/prototype/):** Core ES5–ES2019 features covered. See archived `gap-analysis.md` for baseline.

**Compiler (compiler/):** Lexer and parser partially complete. Type-checker in early stage.

## Implementation Plan

Work proceeds sprint-by-sprint in Stage 1 (see `specs/roadmap/stage-1-compiler-core.md`):

| Sprint | Coverage |
|--------|---------|
| 1.1 | Lexer — all tokens including template literals, regex, BigInt |
| 1.2 | Parser — full ES2022 grammar per `specs/grammar.ebnf` |
| 1.3 | Type-checker — primitives, variables, functions, classes |
| 1.4 | Type-checker — modules, imports, generics |
| 1.5 | Type-checker — async/await, generators, iterators |
| 1.6 | Codegen — ES2022 output + source maps |

## ES Feature Coverage Target

All features documented in `specs/ecmascript/` must reach:
- ✅ Parsed correctly
- ✅ Type-checked (infers type or emits correct diagnostic)
- ✅ Lowered to valid ES2022 output
- ✅ Golden test fixture in `compiler/tests/`

## Banned ECMAScript Patterns

The following ES constructs are banned in SJS (emit hard errors):

| Construct | Error code |
|-----------|-----------|
| `==` / `!=` abstract equality | SJS-L003 |
| `with` statement | SJS-E013 |
| `x!` non-null assertion | SJS-E011 |
| `<T>expr` prefix cast | SJS-P005 |

## Reference

- `specs/ecmascript/` — per-year feature tables
- `specs/grammar.ebnf` — formal grammar (ground truth for parser)
- `specs/language/` — per-feature type rules and lowering
- `specs/roadmap/stage-1-compiler-core.md` — sprint plan
- `archive/` — superseded gap analysis and implementation plan drafts
