<!--
  Sync Impact Report (v0.0.0 → v1.0.0)
  Version change: NEW (initial ratification)
  Added: All 5 principles, Development Workflow, Quality Gates, Governance
  Modified: N/A (initial version)
  Templates requiring updates:
    ✅ plan-template.md — Constitution Check gates filled
    ✅ spec-template.md — no changes required
    ✅ tasks-template.md — no changes required
  Follow-up TODOs: None
-->

# Super.js Constitution

## Core Principles

### I. Language Specification is the Source of Truth

The `.sjs` language specification (found in `docs/`) is authoritative over all compiler implementations. Every feature of the Super.js language MUST be documented in the spec before being implemented. Any discrepancy between implementations (prototype, compiler, llvm) and the spec MUST be resolved in favor of the spec.

**Non-negotiable rules**:
- New language syntax or semantics MUST have a spec entry before any implementation work begins
- All four compiler backends (prototype, compiler, llvm, and any future backends) MUST produce semantically equivalent output for the same Super.js source
- Breaking changes to the language require a spec version bump and migration guide

### II. True JavaScript Superset (ECMA Compatibility)

Every valid JavaScript (and JSX) program MUST be a valid Super.js program with identical runtime semantics. Super.js may enforce stricter rules in strict mode, but permissive mode MUST accept all valid ES5–ES2022 JavaScript.

**Non-negotiable rules**:
- No Super.js feature may remove or redefine the meaning of any valid JavaScript syntax
- JSX from the React ecosystem MUST be accepted without modification
- The compiler output targeting ES5/ES2022 MUST preserve JavaScript runtime semantics exactly

### III. Type Safety Without Complexity

Super.js provides a strong, sound type system that helps developers catch errors at compile time without requiring the full verbosity of TypeScript. Type inference should eliminate boilerplate. Type errors MUST produce clear, actionable messages.

**Non-negotiable rules**:
- Type annotations are optional; untyped code is valid Super.js (gradual typing)
- Type inference MUST resolve types for variables, return values, and common patterns without annotation
- Every type error message MUST include: the error location, the inferred vs expected types, and a suggested fix
- The type system MUST NOT require annotations that TypeScript also does not require in similar scenarios

### IV. Developer Experience is Non-Negotiable

The Super.js toolchain (compiler, formatter, linter, test runner) MUST optimize for fast, clear, friction-free developer workflows. Compilation of files under 1,000 lines MUST complete in under 500ms. Error messages MUST be human-readable.

**Non-negotiable rules**:
- The `superjs` CLI MUST provide a single unified entry point for compile, format, lint, and test
- Watch mode MUST recompile only changed files (incremental compilation)
- Error output MUST include file path, line number, column, error code, and a plain-English explanation
- The compiler MUST NOT produce silent failures — all errors and warnings MUST be surfaced

### V. Compiler Correctness Over Performance

When there is a tradeoff between correctness and speed, correctness wins. The LLVM backend is the long-term performance path; the prototype and compiler backends are correctness references. Do not optimize at the cost of semantic equivalence.

**Non-negotiable rules**:
- Every compiler pass MUST have unit tests covering edge cases
- Regression tests MUST be added for every bug fix
- The prototype (TypeScript/Babel) backend is the reference implementation — other backends MUST match its output semantics
- Code generation MUST be deterministic: same input always produces same output

## Development Workflow

All new language features follow this workflow:

1. **Spec first**: Write or update the language spec in `docs/`
2. **Test cases**: Write `.sjs` test files for the new feature
3. **Prototype implementation**: Implement in `prototype/` using Babel
4. **Compiler port**: Port to `compiler/` (plain JS implementation)
5. **LLVM (if applicable)**: Add to `llvm/` C++ implementation when semantic analysis is ready
6. **Documentation**: Update user-facing docs with examples

Feature branches use the pattern `feature/<feature-name>`. PRs require passing tests in the prototype backend before merge.

## Quality Gates

| Gate | Requirement |
|------|-------------|
| Language spec present | New syntax/semantics MUST be in `docs/` spec before PR |
| Prototype tests pass | All `npm test` in `prototype/` MUST pass |
| Error message quality | New errors MUST include location, types, and suggestion |
| Backward compatibility | No valid JavaScript rejected by new compiler version |
| Deterministic output | Same `.sjs` input always produces identical JavaScript output |

## Governance

This constitution supersedes all other development guidelines. Amendments require:
1. A PR to `.specify/memory/constitution.md` with rationale
2. Version bump per semantic versioning rules (MAJOR: principle change, MINOR: new principle, PATCH: clarification)
3. All quality gates reviewed and updated if the amendment affects them

All implementation decisions that conflict with this constitution MUST be escalated and resolved via a constitution amendment, not a workaround.

**Version**: 1.0.0 | **Ratified**: 2026-05-26 | **Last Amended**: 2026-05-26
