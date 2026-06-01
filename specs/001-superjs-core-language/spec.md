# Feature Specification: Super.js Core Language

**Feature Branch**: `001-superjs-core-language`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "Super.js programming language: a strict, clean, and efficient superset of JavaScript that enforces ECMA standards with built-in type safety, native JSX support, and a unified compiler toolchain (formatter, linter, tester, compiler) targeting ES5-ES2022 output"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compile `.sjs` to JavaScript (Priority: P1)

A developer has a `.sjs` source file and wants to compile it to JavaScript that runs in any ES5+ environment. They run `superjs build --source app.sjs --outDir dist` and get a valid `.js` file that preserves all runtime semantics.

**Why this priority**: This is the fundamental value proposition. Without a working compiler, nothing else in the toolchain is useful. It is the minimum deliverable that unlocks all other stories.

**Independent Test**: Compile an existing `.sjs` example file (e.g., `examples/advanced/todo-list.sjs`) and verify the output `.js` runs correctly in Node.js with no errors.

**Acceptance Scenarios**:

1. **Given** a valid `.sjs` file that uses only standard JavaScript syntax, **When** `superjs build` is run, **Then** the output `.js` file is syntactically valid JavaScript and produces identical runtime results
2. **Given** a `.sjs` file with Super.js type annotations, **When** `superjs build` is run, **Then** the output `.js` file contains no type annotations (they are erased) and executes correctly
3. **Given** a `.sjs` file with a type error (e.g., assigning a string to a number variable), **When** `superjs build` is run, **Then** the compiler reports an error with file path, line number, column, and a plain-English description — and does NOT produce an output file

---

### User Story 2 - Gradual Type Safety (Priority: P1)

A JavaScript developer migrates their existing `.js` codebase to `.sjs` incrementally. They rename files and add type annotations one function at a time. Files without annotations still compile correctly; files with annotations get type checking.

**Why this priority**: Gradual typing is the key adoption mechanism — developers must not be forced to annotate everything upfront. This story must work correctly for Super.js to be practical.

**Independent Test**: Take a plain JavaScript file renamed to `.sjs` with zero annotations; verify it compiles without errors. Then add one type-annotated function; verify only that function gets type-checked.

**Acceptance Scenarios**:

1. **Given** a `.sjs` file with no type annotations (pure JavaScript), **When** compiled, **Then** it succeeds with zero type errors
2. **Given** a `.sjs` file with partial type annotations, **When** a type error occurs in an annotated section, **Then** only the annotated section reports errors; unannotated sections compile silently
3. **Given** a variable declared as `let x: number = 5` followed by `x = "hello"`, **When** compiled, **Then** the compiler reports a type error at the assignment with the conflicting types identified

---

### User Story 3 - JSX Support (Priority: P2)

A developer writes a React component using JSX syntax in a `.sjs` file. The compiler transforms JSX expressions into standard `React.createElement` calls (or the configured JSX factory) in the output.

**Why this priority**: JSX is fundamental to the React ecosystem. Supporting it is required for Super.js to be usable in modern frontend development, but the core compile pipeline works without it.

**Independent Test**: Compile a `.sjs` file containing a functional React component with JSX. Verify the output `.js` contains valid React calls and that a React app using the component renders correctly.

**Acceptance Scenarios**:

1. **Given** a `.sjs` file with JSX element syntax (`<div>`, `<MyComponent />`), **When** compiled, **Then** the output contains transformed `createElement` calls with no JSX syntax remaining
2. **Given** JSX with typed props (`function Btn({ label }: { label: string })`), **When** a caller passes a non-string label, **Then** the compiler reports a type error at the call site
3. **Given** JSX fragments (`<>...</>`), **When** compiled, **Then** they are correctly transformed to the configured fragment factory

---

### User Story 4 - Unified CLI Toolchain (Priority: P2)

A developer uses a single `superjs` command for all development tasks: compiling, formatting, linting, and running tests. They do not need to configure separate tools.

**Why this priority**: Unified tooling reduces setup friction and makes Super.js batteries-included. It is secondary to compilation correctness but critical for adoption.

**Independent Test**: Run `superjs format app.sjs`, `superjs lint app.sjs`, and `superjs test` in a project — all must work without additional configuration files.

**Acceptance Scenarios**:

1. **Given** a `.sjs` file with inconsistent formatting, **When** `superjs format` is run, **Then** the file is rewritten to conform to the Super.js style guide
2. **Given** a `.sjs` file violating a lint rule (e.g., unused variable), **When** `superjs lint` is run, **Then** a warning is printed with the file, line, rule name, and description
3. **Given** a `.sjs` project with test files following the naming convention (`*.test.sjs`), **When** `superjs test` is run, **Then** all tests are discovered, compiled, and executed with pass/fail results reported

---

### User Story 5 - Watch Mode (Priority: P3)

A developer running a development server wants the compiler to automatically recompile changed `.sjs` files without manual intervention. They run `superjs build --watch` and saves trigger incremental recompilation.

**Why this priority**: Improves development velocity but is not required for the core language to be functional. It is a convenience feature after baseline compilation works.

**Independent Test**: Start watch mode, modify a `.sjs` file, and verify the output is recompiled within 1 second without recompiling unchanged files.

**Acceptance Scenarios**:

1. **Given** watch mode is running, **When** a `.sjs` file is saved, **Then** only that file (and files that import it) are recompiled within 1 second
2. **Given** watch mode is running, **When** a save introduces a type error, **Then** the error is printed to the terminal and the previous valid output is preserved
3. **Given** watch mode is running, **When** a save fixes a previous type error, **Then** the new output is compiled successfully and the error is cleared from the terminal

---

### Edge Cases

- What happens when a `.sjs` file imports a plain `.js` file? Super.js MUST accept the import and treat the `.js` module as untyped (all types inferred as `any`).
- What happens when circular imports are detected? The compiler MUST report an error identifying all files in the cycle.
- What happens when a type annotation references an undefined type name? The compiler MUST report a "unknown type" error at that annotation, not a cryptic internal error.
- What happens when the output directory does not exist? The compiler MUST create it automatically.
- How does the compiler handle `.sjs` files with syntax errors? It MUST report all syntax errors found before halting, not just the first one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The compiler MUST accept `.sjs` files and produce `.js` output with semantically equivalent runtime behavior
- **FR-002**: The compiler MUST accept all valid ECMAScript 5 through ES2022 syntax as valid Super.js syntax
- **FR-003**: The compiler MUST support type annotations for variables, function parameters, return types, and object properties
- **FR-004**: The compiler MUST erase all type annotations from the output — type information is compile-time only
- **FR-005**: The compiler MUST report type errors with: source file path, line number, column number, error code, and a plain-English description
- **FR-006**: The compiler MUST support JSX syntax and transform it to standard JavaScript function calls
- **FR-007**: The compiler MUST support configurable JSX factory and fragment factory via a project config file (`superjs.config.json` or similar)
- **FR-008**: The compiler MUST support ES module (`import`/`export`) and CommonJS (`require`/`module.exports`) syntax
- **FR-009**: The formatter MUST produce deterministic output: formatting the same file twice produces the same result
- **FR-010**: The linter MUST report violations with file, line, rule name, severity (error/warning), and description
- **FR-011**: The test runner MUST discover test files automatically by convention (`*.test.sjs`, `*.spec.sjs`)
- **FR-012**: Watch mode MUST recompile only the changed file and its dependents (incremental compilation)
- **FR-013**: The CLI MUST provide `build`, `format`, `lint`, `test`, and `watch` subcommands under a single `superjs` binary
- **FR-014**: The compiler MUST support target output specification: `--target es5`, `--target es2015`, `--target es2022`

### Key Entities

- **Source File (`.sjs`)**: A text file containing Super.js source code. Has path, content, associated AST, type information, and dependencies.
- **Token**: The smallest lexical unit produced by the lexer. Has type, value, line, and column.
- **AST Node**: A node in the Abstract Syntax Tree. Has node type, children, source location, and optionally inferred type.
- **Type**: A compile-time descriptor for a value. Can be primitive (number, string, boolean), object, array, union, function, or generic.
- **Symbol Table**: A mapping from identifier names to their types within a scope. Scopes are lexically nested.
- **Diagnostic**: A compile-time error or warning. Has severity, message, source file, line, column, and error code.
- **Output File (`.js`)**: The compiled JavaScript output. Contains no type annotations and is valid JavaScript for the target ES version.
- **Project Config**: A `superjs.config.json` file at the project root specifying target, outDir, JSX factory, and lint rules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Compilation of any file under 1,000 lines completes in under 500 milliseconds on modern hardware
- **SC-002**: 100% of valid ECMAScript test suite programs compile without errors in Super.js permissive mode
- **SC-003**: All type errors include source location (file, line, column) and a plain-English message — zero cryptic internal errors reach the user
- **SC-004**: Watch mode recompilation latency is under 1 second for files under 5,000 lines
- **SC-005**: The `superjs` CLI can be installed via `npm install -g superjs` and immediately used without additional configuration for basic compile workflows
- **SC-006**: A developer familiar with TypeScript can learn all Super.js type annotation syntax in under 30 minutes (measured by documentation coverage of all syntax)
- **SC-007**: The formatter produces zero diff when run on already-formatted code (idempotent)
- **SC-008**: All 4 compiler backends (prototype, compiler, llvm, and future backends) produce byte-for-byte identical `.js` output for the same `.sjs` input on the shared test suite

## Assumptions

- Target users are JavaScript developers familiar with ES6+ syntax and optional typing concepts
- The primary use case is single-file and small project compilation; monorepo-scale tooling is out of scope for v1
- React/JSX is the primary JSX use case; Vue, Solid, and other JSX consumers are secondary
- Node.js 14+ is the minimum runtime for the `superjs` CLI itself
- The prototype (TypeScript/Babel) backend is the reference implementation — LLVM backend correctness will be validated against it
- Sourcemap generation is desirable but not required for v1 MVP
- Language Server Protocol (LSP) / IDE plugin support is out of scope for v1; it follows after the core compiler is stable
